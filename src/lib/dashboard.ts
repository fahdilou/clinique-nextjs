import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const getDashboardData = unstable_cache(
  async () => {
    const now = new Date();
    const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const firstDayYear = new Date(now.getFullYear(), 0, 1);
    const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const dateLimit30j = new Date(now.getTime() - 30 * 86400_000);
    const dateLimit60j = new Date(now.getTime() - 60 * 86400_000);
    const start12mo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [factStats, depStats, monthlyRaw, insuranceStats, depByCat, alertesFacts, stockStats, prochainEnc] = await Promise.all([
      // Factures : périodes multiples en une passe
      prisma.$queryRaw<{
        ca_mois: number; caisse_mois: number; assur_mois: number; assur_paye_mois: number;
        ca_last_month: number; caisse_last_month: number;
        ca_annee: number; caisse_annee: number; assur_du_annee: number; assur_paye_annee: number;
        ca_last_year: number;
        assur_du_total: number; assur_paye_total: number;
        nb_total: number;
      }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN montant_total ELSE 0 END), 0)::float AS ca_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assure ELSE 0 END), 0)::float AS caisse_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assureur ELSE 0 END), 0)::float AS assur_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayMonth} THEN part_assureur_payee ELSE 0 END), 0)::float AS assur_paye_mois,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayLastMonth} AND date_facture < ${firstDayMonth} THEN montant_total ELSE 0 END), 0)::float AS ca_last_month,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayLastMonth} AND date_facture < ${firstDayMonth} THEN part_assure ELSE 0 END), 0)::float AS caisse_last_month,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN montant_total ELSE 0 END), 0)::float AS ca_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN part_assure ELSE 0 END), 0)::float AS caisse_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN part_assureur ELSE 0 END), 0)::float AS assur_du_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayYear} THEN part_assureur_payee ELSE 0 END), 0)::float AS assur_paye_annee,
          COALESCE(SUM(CASE WHEN date_facture >= ${firstDayLastYear} AND date_facture < ${firstDayYear} THEN montant_total ELSE 0 END), 0)::float AS ca_last_year,
          COALESCE(SUM(part_assureur), 0)::float AS assur_du_total,
          COALESCE(SUM(part_assureur_payee), 0)::float AS assur_paye_total,
          COUNT(*)::int AS nb_total
        FROM factures
      `,
      prisma.$queryRaw<{ dep_mois: number; dep_last_month: number; dep_annee: number; dep_last_year: number }[]>`
        SELECT
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayMonth} THEN montant ELSE 0 END), 0)::float AS dep_mois,
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayLastMonth} AND date_depense < ${firstDayMonth} THEN montant ELSE 0 END), 0)::float AS dep_last_month,
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayYear} THEN montant ELSE 0 END), 0)::float AS dep_annee,
          COALESCE(SUM(CASE WHEN date_depense >= ${firstDayLastYear} AND date_depense < ${firstDayYear} THEN montant ELSE 0 END), 0)::float AS dep_last_year
        FROM depenses
      `,
      prisma.$queryRaw<{ mois: Date; factures: number; encaisse: number }[]>`
        SELECT
          date_trunc('month', date_facture) AS mois,
          COALESCE(SUM(montant_total), 0)::float AS factures,
          COALESCE(SUM(part_assure + part_assureur_payee), 0)::float AS encaisse
        FROM factures WHERE date_facture >= ${start12mo}
        GROUP BY 1 ORDER BY 1 ASC
      `,
      prisma.$queryRaw<{ id: number; nom: string; nb: number; total: number; paye: number }[]>`
        SELECT a.id, a.nom,
               COUNT(f.id)::int AS nb,
               COALESCE(SUM(f.part_assureur), 0)::float AS total,
               COALESCE(SUM(f.part_assureur_payee), 0)::float AS paye
        FROM assurances a
        LEFT JOIN factures f ON f.assurance_id = a.id
        WHERE a.nom != 'SANS ASSURANCE'
        GROUP BY a.id, a.nom HAVING COUNT(f.id) > 0
      `,
      prisma.$queryRaw<{ categorie: string; montant: number }[]>`
        SELECT categorie, COALESCE(SUM(montant), 0)::float AS montant
        FROM depenses WHERE date_depense >= ${firstDayMonth}
        GROUP BY categorie ORDER BY montant DESC LIMIT 6
      `,
      // Alertes actionnables
      prisma.$queryRaw<{
        retards_30j: number; retards_60j: number; retards_montant: number;
        a_encaisser_nb: number; a_encaisser_montant: number;
        a_deposer_nb: number; a_deposer_montant: number;
      }[]>`
        SELECT
          SUM(CASE WHEN date_facture <= ${dateLimit30j} AND statut_part_assureur NOT IN ('Soldé','N/A','Payée') AND part_assureur > 0 THEN 1 ELSE 0 END)::int AS retards_30j,
          SUM(CASE WHEN date_facture <= ${dateLimit60j} AND statut_part_assureur NOT IN ('Soldé','N/A','Payée') AND part_assureur > 0 THEN 1 ELSE 0 END)::int AS retards_60j,
          COALESCE(SUM(CASE WHEN date_facture <= ${dateLimit30j} AND statut_part_assureur NOT IN ('Soldé','N/A','Payée') AND part_assureur > 0 THEN part_assureur - part_assureur_payee ELSE 0 END), 0)::float AS retards_montant,
          SUM(CASE WHEN date_depot IS NOT NULL AND statut_part_assureur IN ('En attente','Payé Partiel') AND part_assureur > 0 THEN 1 ELSE 0 END)::int AS a_encaisser_nb,
          COALESCE(SUM(CASE WHEN date_depot IS NOT NULL AND statut_part_assureur IN ('En attente','Payé Partiel') AND part_assureur > 0 THEN part_assureur - part_assureur_payee ELSE 0 END), 0)::float AS a_encaisser_montant,
          SUM(CASE WHEN date_depot IS NULL AND part_assureur > 0 AND statut_part_assureur NOT IN ('N/A','Soldé') THEN 1 ELSE 0 END)::int AS a_deposer_nb,
          COALESCE(SUM(CASE WHEN date_depot IS NULL AND part_assureur > 0 AND statut_part_assureur NOT IN ('N/A','Soldé') THEN montant_total ELSE 0 END), 0)::float AS a_deposer_montant
        FROM factures
      `,
      prisma.$queryRaw<{ nb_actifs: number; alertes: number; ruptures: number; valeur: number }[]>`
        SELECT
          COUNT(*)::int AS nb_actifs,
          SUM(CASE WHEN stock_initial > 0 AND stock_initial <= COALESCE(seuil_alerte, 5) THEN 1 ELSE 0 END)::int AS alertes,
          SUM(CASE WHEN stock_initial = 0 THEN 1 ELSE 0 END)::int AS ruptures,
          COALESCE(SUM(stock_initial * COALESCE(prix_unitaire, 0)), 0)::float AS valeur
        FROM produits WHERE actif = 1
      `,
      prisma.$queryRaw<{ moyenne_jours: number }[]>`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - date_facture)) / 86400), 0)::float AS moyenne_jours
        FROM factures WHERE statut_part_assureur IN ('En attente','Payé Partiel') AND part_assureur > 0
      `,
    ]);

    const f = factStats[0];
    const d = depStats[0];
    const a = alertesFacts[0];
    const s = stockStats[0];
    const p = prochainEnc[0];

    const compagnies = insuranceStats.map((c) => {
      const reste = c.total - c.paye;
      const taux = c.total ? Math.round((c.paye / c.total) * 100) : 0;
      return { ...c, reste, taux };
    }).sort((x, y) => y.reste - x.reste);

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

    // Calculs dérivés
    const encaisseAnnee = f.caisse_annee + f.assur_paye_annee;
    const beneficeAnnee = encaisseAnnee - d.dep_annee;
    const beneficeLastYear = f.ca_last_year - d.dep_last_year;
    const tauxRecouvrement = f.assur_du_total > 0 ? Math.round((f.assur_paye_total / f.assur_du_total) * 100) : 100;
    const margeAnnee = f.ca_annee > 0 ? Math.round((beneficeAnnee / f.ca_annee) * 100) : 0;
    const encaisseMois = f.caisse_mois + f.assur_paye_mois;
    const encaisseLastMonth = f.caisse_last_month; // approx (pas historique paiements assurance)
    const evolMois = f.ca_last_month > 0 ? Math.round(((f.ca_mois - f.ca_last_month) / f.ca_last_month) * 100) : null;
    const evolAnnee = f.ca_last_year > 0 ? Math.round(((f.ca_annee - f.ca_last_year) / f.ca_last_year) * 100) : null;

    return {
      // KPIs principaux (année privilégiée)
      caAnnee: f.ca_annee,
      caMois: f.ca_mois,
      encaisseAnnee,
      encaisseMois,
      encaisseLastMonth,
      beneficeAnnee,
      beneficeLastYear,
      resteRecevoir: f.assur_du_total - f.assur_paye_total,
      // Ratios
      tauxRecouvrement,
      margeAnnee,
      evolMois,
      evolAnnee,
      // Actions urgentes
      alertes: {
        retards30j: a.retards_30j,
        retards60j: a.retards_60j,
        retardsMontant: a.retards_montant,
        aEncaisserNb: a.a_encaisser_nb,
        aEncaisserMontant: a.a_encaisser_montant,
        aDeposerNb: a.a_deposer_nb,
        aDeposerMontant: a.a_deposer_montant,
      },
      stock: {
        actifs: s?.nb_actifs ?? 0,
        alertes: s?.alertes ?? 0,
        ruptures: s?.ruptures ?? 0,
        valeur: s?.valeur ?? 0,
      },
      // Info
      nbTotalFactures: f.nb_total,
      moyenneJoursAttente: Math.round(p?.moyenne_jours ?? 0),
      // Charts
      chartData,
      compagnies,
      depByCat,
      // Contexte
      moisCourant: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      anneeCourante: now.getFullYear(),
    };
  },
  ["dashboard-data-v2"],
  { revalidate: 60, tags: ["dashboard"] }
);
