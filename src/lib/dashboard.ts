import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

/**
 * Cache 60s pour toutes les données du dashboard.
 * Invalidé automatiquement via revalidatePath quand on modifie une facture/dépense.
 */
export const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    const dateLimit30j = new Date(now.getTime() - 30 * 86400_000);
    const start12mo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    // 1 seule query agrégée pour toutes les métriques (au lieu de 15)
    const [factStats, depStats, monthlyRaw, insuranceStats, depByCat, retards, stockStats] = await Promise.all([
      // Factures : mois + année en une passe via CASE
      prisma.$queryRaw<{
        ca_mois: number; caisse_mois: number; assureur_mois: number; assur_paye_mois: number;
        ca_annee: number; caisse_annee: number; assur_paye_annee: number; nb_total: number;
      }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN montant_total ELSE 0 END), 0)::float AS ca_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assure ELSE 0 END), 0)::float AS caisse_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assureur ELSE 0 END), 0)::float AS assureur_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assureur_payee ELSE 0 END), 0)::float AS assur_paye_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN montant_total ELSE 0 END), 0)::float AS ca_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN part_assure ELSE 0 END), 0)::float AS caisse_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN part_assureur_payee ELSE 0 END), 0)::float AS assur_paye_annee,
          COUNT(*)::int AS nb_total
        FROM factures
      `,
      // Dépenses : mois + année en une passe
      prisma.$queryRaw<{ dep_mois: number; dep_annee: number }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayMonth} THEN montant ELSE 0 END), 0)::float AS dep_mois,
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayYear} THEN montant ELSE 0 END), 0)::float AS dep_annee
        FROM depenses
      `,
      // 12 mois
      prisma.$queryRaw<{ mois: Date; factures: number; encaisse: number }[]>`
        SELECT
          date_trunc('month', date_facture) AS mois,
          COALESCE(SUM(montant_total), 0)::float AS factures,
          COALESCE(SUM(part_assure + part_assureur_payee), 0)::float AS encaisse
        FROM factures
        WHERE date_facture >= ${start12mo}
        GROUP BY 1 ORDER BY 1 ASC
      `,
      // Compagnies avec factures
      prisma.$queryRaw<{ id: number; nom: string; nb: number; total: number; paye: number }[]>`
        SELECT a.id, a.nom,
               COUNT(f.id)::int AS nb,
               COALESCE(SUM(f.part_assureur), 0)::float AS total,
               COALESCE(SUM(f.part_assureur_payee), 0)::float AS paye
        FROM assurances a
        LEFT JOIN factures f ON f.assurance_id = a.id
        GROUP BY a.id, a.nom
        HAVING COUNT(f.id) > 0
      `,
      // Dépenses par cat (mois)
      prisma.$queryRaw<{ categorie: string; montant: number }[]>`
        SELECT categorie, COALESCE(SUM(montant), 0)::float AS montant
        FROM depenses
        WHERE date_depense >= ${firstDayMonth}
        GROUP BY categorie ORDER BY montant DESC
      `,
      // Retards > 30j
      prisma.$queryRaw<{ nb: number }[]>`
        SELECT COUNT(*)::int AS nb FROM factures
        WHERE statut_part_assureur NOT IN ('Soldé', 'Payée', 'N/A')
          AND date_facture <= ${dateLimit30j}
          AND part_assureur > 0
      `,
      // Stock
      prisma.$queryRaw<{ nb_actifs: number; alertes: number }[]>`
        SELECT
          COUNT(*)::int AS nb_actifs,
          SUM(CASE WHEN stock_initial <= 5 THEN 1 ELSE 0 END)::int AS alertes
        FROM produits WHERE actif = 1
      `,
    ]);

    const f = factStats[0];
    const d = depStats[0];
    const s = stockStats[0];

    // Compagnies enrichies (calcul JS léger)
    const compagnies = insuranceStats.map((a) => {
      const reste = a.total - a.paye;
      const taux = a.total ? Math.round((a.paye / a.total) * 100) : 0;
      return { ...a, reste, taux };
    }).sort((x, y) => y.reste - x.reste);

    // Chart 12 mois : remplir mois vides
    const chartData: { mois: string; factures: number; encaisse: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const found = monthlyRaw.find((m) => {
        const md = new Date(m.mois);
        return md.getMonth() === dt.getMonth() && md.getFullYear() === dt.getFullYear();
      });
      chartData.push({
        mois: dt.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        factures: found?.factures ?? 0,
        encaisse: found?.encaisse ?? 0,
      });
    }

    return {
      // KPIs mois
      caMois: f.ca_mois,
      caisseMois: f.caisse_mois,
      assureurMois: f.assureur_mois,
      assurPayeeMois: f.assur_paye_mois,
      encaisseMois: f.caisse_mois + f.assur_paye_mois,
      attenteMois: f.assureur_mois - f.assur_paye_mois,
      depMois: d.dep_mois,
      // KPIs année
      caAnnee: f.ca_annee,
      caisseAnnee: f.caisse_annee,
      assurPayeeAnnee: f.assur_paye_annee,
      encaisseAnnee: f.caisse_annee + f.assur_paye_annee,
      depAnnee: d.dep_annee,
      // Autres
      nbTotalFactures: f.nb_total,
      retards: retards[0]?.nb ?? 0,
      stockActifs: s?.nb_actifs ?? 0,
      alertesStock: s?.alertes ?? 0,
      // Charts
      chartData,
      compagnies,
      depByCat,
    };
  },
  ["dashboard-data"],
  { revalidate: 60, tags: ["dashboard"] }
);
