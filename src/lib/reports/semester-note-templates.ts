import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const XLSX_TEMPLATE_FILE = "rapor-semester.xlsx";
const NOTE_SHEET_NAME = "Aturan Catatan";

export type SemesterNoteTemplate = {
  indicator: string;
  description: string;
};

export async function loadSemesterNoteTemplates(): Promise<SemesterNoteTemplate[]> {
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await loadTemplateBuffer();
  await workbook.xlsx.load(templateBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.getWorksheet(NOTE_SHEET_NAME);
  if (!sheet) return [];

  const templates = new Map<string, SemesterNoteTemplate>();
  sheet.eachRow((row) => {
    const indicator = excelCellText(row.getCell(1).value).trim();
    const description = excelCellText(row.getCell(2).value).trim();
    if (!indicator || !description || indicator.toLowerCase() === "indikator") return;
    templates.set(indicator, { indicator, description });
  });

  return [...templates.values()];
}

async function loadTemplateBuffer() {
  let moduleDir: string | null = null;
  try {
    moduleDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    moduleDir = null;
  }

  const candidates: string[] = [];
  if (moduleDir) {
    candidates.push(path.join(moduleDir, "..", "..", "..", "public", "templates", XLSX_TEMPLATE_FILE));
    candidates.push(path.join(moduleDir, "templates", XLSX_TEMPLATE_FILE));
  }
  candidates.push(path.join(process.cwd(), "public", "templates", XLSX_TEMPLATE_FILE));

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // lanjut ke kandidat berikutnya
    }
  }

  throw new Error("Template Excel rapor semester tidak ditemukan untuk membaca aturan catatan.");
}

export function excelCellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && value.text != null) return String(value.text);
    if ("result" in value) return excelCellText(value.result as ExcelJS.CellValue);
  }
  return "";
}
