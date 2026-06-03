import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { excelCellText } from "./semester-note-templates";
import type { SemesterReportPayload } from "./semester-report-payload-schema";

const PDF_TEMPLATE_FILE = "rapor-semester.pdf";
const XLSX_TEMPLATE_FILE = "rapor-semester.xlsx";

type PredicateRule = { min: number; label: string };
type TextPlacement = {
  x: number;
  y: number;
  width?: number;
  align?: "left" | "center" | "right";
  size?: number;
  bold?: boolean;
};

export async function generateSemesterReportPdf(payload: SemesterReportPayload) {
  const [templateBuffer, rules] = await Promise.all([loadTemplateBuffer(PDF_TEMPLATE_FILE), loadRules()]);
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPage(0);
  const fonts = { regular: regularFont, bold: boldFont };
  const testedSurahs = [payload.testedSurahs[0] ?? null, payload.testedSurahs[1] ?? null];
  const noteText = payload.customDescription?.trim() || rules.descriptionByResult[payload.descriptionResult] || payload.descriptionResult;

  drawText(page, fonts, `TAHUN AJARAN ${payload.academicYear}`, { x: 53.2, y: 832.2, width: 505.67, align: "center", bold: true });

  drawText(page, fonts, payload.studentName, { x: 131.43, y: 815 });
  drawText(page, fonts, payload.jilid || "-", { x: 433.08, y: 815 });
  drawText(page, fonts, payload.className, { x: 131.43, y: 800 });
  drawText(page, fonts, payload.semester, { x: 433.08, y: 799.5 });

  drawText(page, fonts, payload.readingType || "Baca Tartili", { x: 126.4, y: 739.47 });
  drawText(page, fonts, displayValue(payload.readingScore), { x: 215.43, y: 739.47, width: 152.02, align: "center" });
  drawText(page, fonts, predicateLabel(payload.readingScore, rules.readingPredicates), { x: 367.45, y: 739.47, width: 191.43, align: "center" });

  drawText(page, fonts, payload.targetJuz || "-", { x: 85, y: 678.67, width: 130.43, align: "center" });
  drawText(page, fonts, payload.targetSurah || "-", { x: 215.43, y: 678.67, width: 152.02, align: "center" });
  drawText(page, fonts, payload.targetDescription || "-", { x: 367.45, y: 678.67, width: 191.43, align: "center" });

  drawTestedSurah(page, fonts, testedSurahs[0], 617.58, rules.testedPredicates);
  drawTestedSurah(page, fonts, testedSurahs[1], 603.38, rules.testedPredicates);

  buildMaterialRows(payload).forEach((item, index) => {
    drawMaterialRow(page, fonts, item.label, item.score, 542.28 - index * 14.5, index + 1, rules.materialPredicates);
  });

  drawText(page, fonts, displayValue(payload.attendance.sick), { x: 53.2, y: 409.25, width: 162.23, align: "center" });
  drawText(page, fonts, displayValue(payload.attendance.permission), { x: 215.43, y: 409.25, width: 152.02, align: "center" });
  drawText(page, fonts, displayValue(payload.attendance.absent), { x: 367.45, y: 409.25, width: 191.43, align: "center" });

  drawText(page, fonts, payload.personality.teacher || "-", { x: 215.43, y: 348.15, width: 152.02, align: "center" });
  drawText(page, fonts, payload.personality.friend || "-", { x: 215.43, y: 333.65, width: 152.02, align: "center" });
  drawText(page, fonts, payload.personality.neatness || "-", { x: 215.43, y: 319.15, width: 152.02, align: "center" });
  drawText(page, fonts, payload.personality.discipline || "-", { x: 215.43, y: 304.95, width: 152.02, align: "center" });

  drawWrappedText(page, fonts, noteText || "-", { x: 54.6, y: 258.82, width: 500, size: 11 });

  drawText(page, fonts, `Purbalingga, ${formatIndonesianDate(payload.reportDate)}`, { x: 367.45, y: 179.82, width: 191.43, align: "center" });
  drawText(page, fonts, payload.homeroomTeacherName, { x: 215.43, y: 77.83, width: 152.02, align: "center", bold: true });
  drawText(page, fonts, payload.coordinatorName, { x: 421.58, y: 78.33, width: 136.8, align: "center", bold: true });

  return Buffer.from(await pdfDoc.save());
}

function drawTestedSurah(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, item: { name?: string; score?: string | number } | null, y: number, rules: PredicateRule[]) {
  const hasValue = Boolean(item?.name?.trim() || String(item?.score ?? "").trim());
  if (!hasValue) return;
  drawText(page, fonts, item?.name?.trim() || "-", { x: 85, y, width: 130.43, align: "center" });
  drawText(page, fonts, displayValue(item?.score), { x: 215.43, y, width: 152.02, align: "center" });
  drawText(page, fonts, predicateLabel(item?.score, rules), { x: 367.45, y, width: 191.43, align: "center" });
}

function drawMaterialRow(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, label: string, score: string | number | undefined, y: number, order: number, rules: PredicateRule[]) {
  drawText(page, fonts, String(order), { x: 53.2, y, width: 31.8, align: "center" });
  drawText(page, fonts, label, { x: 86.8, y });
  drawText(page, fonts, displayValue(score), { x: 215.43, y, width: 152.02, align: "center" });
  drawText(page, fonts, predicateLabel(score, rules), { x: 367.45, y, width: 191.43, align: "center" });
}

function buildMaterialRows(payload: SemesterReportPayload) {
  return [
    { label: "Praktek Wudhu", score: payload.materialScores.wudhu },
    { label: "Praktek Sholat", score: payload.materialScores.sholat },
    { label: "Tayamum", score: payload.materialScores.tayamum },
    { label: "Shalat Jenazah", score: payload.materialScores.shalatJenazah },
    { label: "Do'a Harian", score: payload.materialScores.doaHarian },
    { label: "Hafalan Hadits", score: payload.materialScores.hafalanHadits },
    ...(payload.includeTajwid ? [{ label: "Tajwid", score: payload.materialScores.tajwid }] : []),
  ];
}

function drawText(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, text: string, placement: TextPlacement) {
  const size = placement.size ?? 11;
  const font = placement.bold ? fonts.bold : fonts.regular;
  const value = text || "-";
  const textWidth = font.widthOfTextAtSize(value, size);
  const boxWidth = placement.width ?? textWidth;
  const x =
    placement.align === "center"
      ? placement.x + Math.max(0, (boxWidth - textWidth) / 2)
      : placement.align === "right"
        ? placement.x + Math.max(0, boxWidth - textWidth)
        : placement.x;

  page.drawText(value, {
    x,
    y: placement.y,
    size,
    font,
    color: rgb(0, 0, 0),
  });
}

function drawWrappedText(page: PDFPage, fonts: { regular: PDFFont; bold: PDFFont }, text: string, placement: TextPlacement) {
  const size = placement.size ?? 11;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (fonts.regular.widthOfTextAtSize(candidate, size) <= (placement.width ?? 500)) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length === 0) lines.push("-");

  lines.slice(0, 3).forEach((lineText, index) => {
    drawText(page, fonts, lineText, { ...placement, y: placement.y - index * 12, align: "left", width: undefined });
  });
}

async function loadRules() {
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await loadTemplateBuffer(XLSX_TEMPLATE_FILE);
  await workbook.xlsx.load(templateBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const predicateSheet = workbook.getWorksheet("Aturan Predikat");
  const notesSheet = workbook.getWorksheet("Aturan Catatan");

  if (!predicateSheet || !notesSheet) {
    throw new Error("Template Excel rapor semester tidak lengkap untuk membaca aturan predikat.");
  }

  return {
    readingPredicates: readPredicateRules(predicateSheet, 2, 5),
    testedPredicates: readPredicateRules(predicateSheet, 8, 11),
    materialPredicates: readPredicateRules(predicateSheet, 14, 17),
    descriptionByResult: readDescriptionRules(notesSheet),
  };
}

function readPredicateRules(sheet: ExcelJS.Worksheet, startRow: number, endRow: number) {
  const rules: PredicateRule[] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    const min = Number(sheet.getRow(row).getCell(1).value);
    const label = String(sheet.getRow(row).getCell(2).value ?? "").trim();
    if (Number.isFinite(min) && label) rules.push({ min, label });
  }
  return rules.sort((a, b) => a.min - b.min);
}

function readDescriptionRules(sheet: ExcelJS.Worksheet) {
  const rules: Record<string, string> = {};
  sheet.eachRow((row) => {
    const key = excelCellText(row.getCell(1).value).trim();
    const value = excelCellText(row.getCell(2).value).trim();
    if (key && value) rules[key] = value;
  });
  return rules;
}

async function loadTemplateBuffer(fileName: string) {
  let moduleDir: string | null = null;
  try {
    moduleDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    moduleDir = null;
  }

  const candidates: string[] = [];
  if (moduleDir) {
    candidates.push(path.join(moduleDir, "..", "..", "..", "public", "templates", fileName));
    candidates.push(path.join(moduleDir, "templates", fileName));
  }
  candidates.push(path.join(process.cwd(), "public", "templates", fileName));

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // lanjut ke kandidat berikutnya
    }
  }
  throw new Error(`Template ${fileName} tidak ditemukan di runtime server.`);
}

function predicateLabel(score: string | number | undefined, rules: PredicateRule[]) {
  const numericScore = toFiniteNumber(score);
  if (numericScore == null || numericScore <= 0) return "-";

  let selectedLabel = "-";
  for (const rule of rules) {
    if (numericScore >= rule.min) selectedLabel = rule.label;
  }
  return selectedLabel;
}

function displayValue(value: string | number | undefined) {
  if (value == null || value === "") return "-";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const trimmed = String(value).trim();
  return trimmed || "-";
}

function toFiniteNumber(value: string | number | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatIndonesianDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
