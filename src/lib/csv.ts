import ExcelJS from "exceljs";

export async function parseSpreadsheet(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseXlsx(await file.arrayBuffer());
  throw new Error("Format non supporté. Utilise .csv, .xlsx ou .xls");
}

function parseCsv(text: string): Record<string, string>[] {
  const cleaned = text.replace(/^﻿/, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const headers = splitCsvLine(lines[0], sep).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, sep);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = !inQuotes; }
    else if (c === sep && !inQuotes) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: Record<string, string>[] = [];
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, col) => (headers[col - 1] = String(cell.value ?? "").trim().toLowerCase()));
  ws.eachRow({ includeEmpty: false }, (row, idx) => {
    if (idx === 1) return;
    const obj: Record<string, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const h = headers[col - 1];
      if (!h) return;
      const v = cell.value;
      if (v == null) obj[h] = "";
      else if (v instanceof Date) obj[h] = v.toISOString().slice(0, 10);
      else if (typeof v === "object" && "text" in v) obj[h] = String((v as any).text);
      else obj[h] = String(v).trim();
    });
    rows.push(obj);
  });
  return rows;
}

export function num(s: string | undefined, def = 0): number {
  if (!s) return def;
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : def;
}

export function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t);
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return new Date(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? null : dt;
}
