import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const limit30j = new Date(Date.now() - 30 * 86400_000);

  const assurances = await prisma.assurance.findMany({
    include: {
      factures: {
        where: {
          statut_part_assureur: { notIn: ["Soldé", "Payée", "N/A"] },
          date_facture: { lte: limit30j },
          part_assureur: { gt: 0 },
        },
        orderBy: { date_facture: "asc" },
      },
    },
  });

  const cies = assurances.filter((a) => a.factures.length > 0 && a.nom !== "SANS ASSURANCE");

  const fmtMoney = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
  const fmtDate = (d: Date | null) => d ? d.toLocaleDateString("fr-FR") : "-";
  const today = new Date().toLocaleDateString("fr-FR");

  const lettres = cies.map((a) => {
    const total = a.factures.reduce((s, f) => s + ((f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0)), 0);
    return `<section style="page-break-after: always;">
      <div style="display:flex;justify-content:space-between;margin-bottom:30px">
        <div><strong>Clinique</strong><br>Cotonou, Bénin</div>
        <div style="text-align:right">Le ${today}</div>
      </div>
      <div style="margin: 20px 0 40px"><strong>À l'attention de : ${a.nom}</strong>${a.email ? "<br>" + a.email : ""}</div>
      <h1 style="color:#1A5276;border-bottom:2px solid #1A5276;padding-bottom:8px">Objet : Rappel de règlement — ${a.factures.length} facture(s) en attente</h1>
      <p>Madame, Monsieur,</p>
      <p>Nous vous informons que <strong>${a.factures.length} facture(s)</strong> restent en attente de règlement.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:0.9em">
        <thead><tr style="background:#1A5276;color:#fff">
          <th style="padding:8px;text-align:left">Date</th>
          <th style="padding:8px;text-align:left">N° Facture</th>
          <th style="padding:8px;text-align:left">Date dépôt</th>
          <th style="padding:8px;text-align:right">Part assureur</th>
          <th style="padding:8px;text-align:right">Reste dû</th>
        </tr></thead>
        <tbody>
          ${a.factures.map((f) => {
            const reste = (f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0);
            return `<tr><td style="padding:6px;border-bottom:1px solid #ddd">${fmtDate(f.date_facture)}</td>
              <td style="padding:6px;border-bottom:1px solid #ddd">${f.num_facture}</td>
              <td style="padding:6px;border-bottom:1px solid #ddd">${fmtDate(f.date_depot)}</td>
              <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right">${fmtMoney(f.part_assureur ?? 0)}</td>
              <td style="padding:6px;border-bottom:1px solid #ddd;text-align:right">${fmtMoney(reste)}</td></tr>`;
          }).join("")}
        </tbody>
        <tfoot><tr style="background:#f0f0f0;font-weight:bold">
          <td colspan="4" style="padding:8px;text-align:right;border-top:2px solid #1A5276">TOTAL DÛ</td>
          <td style="padding:8px;text-align:right;border-top:2px solid #1A5276">${fmtMoney(total)}</td>
        </tr></tfoot>
      </table>
      <p>Nous vous serions reconnaissants de procéder au règlement dans les meilleurs délais.</p>
      <div style="margin-top:60px">La Direction<br><br>____________________</div>
    </section>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Relances en masse (${cies.length} compagnies)</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Georgia, serif; color: #1a1a1a; line-height: 1.5; }
  .btn-print { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #1A5276; color: white; border: none; border-radius: 6px; cursor: pointer; z-index: 999; }
  @media print { .btn-print { display: none; } }
</style></head><body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer les ${cies.length} lettres</button>
  ${lettres}
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
