import ExcelJS from "exceljs";

export async function toXlsx(sheets: { name: string; headers: string[]; rows: (string | number | Date | null)[][] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestion Clinique";
  wb.created = new Date();

  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 30));
    ws.columns = s.headers.map((h) => ({ header: h, key: h, width: Math.max(12, h.length + 2) }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A5276" } };
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    s.rows.forEach((r) => ws.addRow(r));
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function xlsxResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
