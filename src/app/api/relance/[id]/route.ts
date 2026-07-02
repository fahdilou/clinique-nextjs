import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const assurance = await prisma.assurance.findUnique({
    where: { id: Number(id) },
    include: {
      factures: {
        where: {
          statut_part_assureur: { notIn: ["Soldé", "Payée", "N/A"] },
          date_facture: { lte: new Date(Date.now() - 30 * 86400_000) },
          part_assureur: { gt: 0 },
        },
        orderBy: { date_facture: "asc" },
      },
    },
  });
  if (!assurance) return new Response("Introuvable", { status: 404 });

  const total = assurance.factures.reduce((s, f) => s + ((f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0)), 0);
  const fmtMoney = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
  const fmtDate = (d: Date) => d.toLocaleDateString("fr-FR");

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Relance ${assurance.nom}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: Georgia, serif; color: #1a1a1a; line-height: 1.5; }
  h1 { color: #1A5276; border-bottom: 2px solid #1A5276; padding-bottom: 8px; }
  .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .destinataire { margin: 20px 0 40px; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9em; }
  th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #ddd; }
  th { background: #1A5276; color: white; }
  tfoot td { font-weight: bold; background: #f0f0f0; border-top: 2px solid #1A5276; }
  .signature { margin-top: 60px; }
  .btn-print { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #1A5276; color: white; border: none; border-radius: 6px; cursor: pointer; }
  @media print { .btn-print { display: none; } }
</style></head>
<body>
  <button class="btn-print" onclick="window.print()">🖨️ Imprimer</button>
  <div class="header">
    <div><strong>Clinique</strong><br>Cotonou, Bénin</div>
    <div style="text-align:right">Date : ${fmtDate(new Date())}</div>
  </div>
  <div class="destinataire">
    <strong>À l'attention de : ${assurance.nom}</strong><br>
    ${assurance.email ? assurance.email + "<br>" : ""}
  </div>
  <h1>Objet : Rappel de règlement de factures en attente</h1>
  <p>Madame, Monsieur,</p>
  <p>Nous vous informons que <strong>${assurance.factures.length} facture(s)</strong> émises à votre attention restent en attente de règlement.</p>
  <p>Nous vous serions reconnaissants de bien vouloir procéder au règlement dans les meilleurs délais.</p>
  <table>
    <thead><tr><th>Date</th><th>N° Facture</th><th style="text-align:right">Part assureur</th><th style="text-align:right">Déjà payé</th><th style="text-align:right">Reste dû</th></tr></thead>
    <tbody>
      ${assurance.factures.map((f) => {
        const reste = (f.part_assureur ?? 0) - (f.part_assureur_payee ?? 0);
        return `<tr><td>${fmtDate(f.date_facture)}</td><td>${f.num_facture}</td><td style="text-align:right">${fmtMoney(f.part_assureur ?? 0)}</td><td style="text-align:right">${fmtMoney(f.part_assureur_payee ?? 0)}</td><td style="text-align:right">${fmtMoney(reste)}</td></tr>`;
      }).join("")}
    </tbody>
    <tfoot><tr><td colspan="4" style="text-align:right">TOTAL DÛ</td><td style="text-align:right">${fmtMoney(total)}</td></tr></tfoot>
  </table>
  <p>Restant à votre disposition pour tout renseignement, nous vous prions d'agréer nos salutations distinguées.</p>
  <div class="signature">La Direction<br><br>____________________</div>
</body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
