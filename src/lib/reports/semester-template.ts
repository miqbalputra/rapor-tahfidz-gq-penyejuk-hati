import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { excelCellText } from "./semester-note-templates";
import type { SemesterReportPayload } from "./semester-report-payload-schema";

const TEMPLATE_FILE = "rapor-semester.xlsx";

export type SemesterReportExportMode = "print" | "full";

type PredicateRule = { min: number; label: string };

export async function generateSemesterReportXlsx(payload: SemesterReportPayload, mode: SemesterReportExportMode = "print") {
  const workbook = new ExcelJS.Workbook();
  const templateBuffer = await loadTemplateBuffer();
  await workbook.xlsx.load(templateBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  const inputSheet = workbook.getWorksheet("Input Data");
  const printSheet = workbook.getWorksheet("Cetak");
  const predicateSheet = workbook.getWorksheet("Aturan Predikat");
  const notesSheet = workbook.getWorksheet("Aturan Catatan");

  if (!inputSheet || !printSheet || !predicateSheet || !notesSheet) {
    throw new Error("Template rapor semester tidak lengkap. Sheet wajib tidak ditemukan.");
  }

  const testedSurahs = [payload.testedSurahs[0] ?? { name: "", score: "-" }, payload.testedSurahs[1] ?? { name: "", score: "-" }];

  const rowValues = [
    1,
    payload.studentName,
    payload.className,
    payload.jilid || "",
    payload.semester,
    payload.readingType || "Baca Tartili",
    normalizeCellValue(payload.readingScore),
    payload.targetJuz || "-",
    payload.targetSurah || "-",
    payload.targetDescription || "-",
    testedSurahs[0].name || "-",
    normalizeCellValue(testedSurahs[0].score),
    testedSurahs[1].name || "-",
    normalizeCellValue(testedSurahs[1].score),
    normalizeCellValue(payload.materialScores.wudhu),
    normalizeCellValue(payload.materialScores.sholat),
    normalizeCellValue(payload.materialScores.tayamum),
    normalizeCellValue(payload.materialScores.shalatJenazah),
    normalizeCellValue(payload.materialScores.doaHarian),
    normalizeCellValue(payload.materialScores.hafalanHadits),
    normalizeCellValue(payload.attendance.sick),
    normalizeCellValue(payload.attendance.permission),
    normalizeCellValue(payload.attendance.absent),
    payload.personality.teacher || "-",
    payload.personality.friend || "-",
    payload.personality.neatness || "-",
    payload.personality.discipline || "-",
    payload.descriptionResult,
    payload.homeroomTeacherName,
    payload.coordinatorName,
  ];

  const inputRow = inputSheet.getRow(4);
  rowValues.forEach((value, index) => {
    inputRow.getCell(index + 1).value = value;
  });
  inputRow.commit();

  if (mode === "print") {
    applyPrintSheetValues(printSheet, payload, {
      readingPredicates: readPredicateRules(predicateSheet, 2, 5, 1, 2),
      testedPredicates: readPredicateRules(predicateSheet, 8, 11, 1, 2),
      materialPredicates: readPredicateRules(predicateSheet, 14, 17, 1, 2),
      descriptionByResult: readDescriptionRules(notesSheet),
    });
    freezeFormulasAsValues(printSheet);
    keepOnlyPrintSheet(workbook, printSheet.name);
  } else {
    printSheet.getCell("L4").value = 1;
    printSheet.getCell("E4").value = `TAHUN AJARAN ${payload.academicYear}`;
    printSheet.getCell("F45").value = `            Purbalingga, ${formatIndonesianDate(payload.reportDate)}`;
    applyTestedSurahRowVisibility(printSheet, testedSurahs);
    if (payload.customDescription?.trim()) {
      printSheet.getCell("A42").value = payload.customDescription.trim();
    }
    workbook.calcProperties.fullCalcOnLoad = true;
  }

  return workbook.xlsx.writeBuffer();
}

function applyPrintSheetValues(
  printSheet: ExcelJS.Worksheet,
  payload: SemesterReportPayload,
  rules: {
    readingPredicates: PredicateRule[];
    testedPredicates: PredicateRule[];
    materialPredicates: PredicateRule[];
    descriptionByResult: Record<string, string>;
  },
) {
  const testedSurahs = [payload.testedSurahs[0] ?? null, payload.testedSurahs[1] ?? null];
  const materialRows = [
    { row: 23, label: "Praktek Wudhu", score: payload.materialScores.wudhu },
    { row: 24, label: "Praktek Sholat", score: payload.materialScores.sholat },
    { row: 25, label: "Tayamum", score: payload.materialScores.tayamum },
    { row: 26, label: "Shalat Jenazah", score: payload.materialScores.shalatJenazah },
    { row: 27, label: "Do'a Harian", score: payload.materialScores.doaHarian },
    { row: 28, label: "Hafalan Hadits", score: payload.materialScores.hafalanHadits },
  ];
  const noteText = payload.customDescription?.trim() || rules.descriptionByResult[payload.descriptionResult] || payload.descriptionResult;

  printSheet.getCell("A4").value = `TAHUN AJARAN ${payload.academicYear}`;
  printSheet.getCell("D5").value = payload.studentName;
  printSheet.getCell("H5").value = payload.jilid || "-";
  printSheet.getCell("D6").value = payload.className;
  printSheet.getCell("H6").value = payload.semester;

  printSheet.getCell("B10").value = payload.readingType || "Baca Tartili";
  printSheet.getCell("E10").value = normalizeCellValue(payload.readingScore);
  printSheet.getCell("F10").value = predicateLabel(payload.readingScore, rules.readingPredicates);

  printSheet.getCell("B14").value = payload.targetJuz || "-";
  printSheet.getCell("E14").value = payload.targetSurah || "-";
  printSheet.getCell("F14").value = payload.targetDescription || "-";

  writeTestedSurahRow(printSheet, 18, 1, testedSurahs[0], rules.testedPredicates);
  writeTestedSurahRow(printSheet, 19, 2, testedSurahs[1], rules.testedPredicates);
  applyTestedSurahRowVisibility(printSheet, testedSurahs);

  for (const item of materialRows) {
    printSheet.getCell(`A${item.row}`).value = item.row - 22;
    printSheet.getCell(`B${item.row}`).value = item.label;
    printSheet.getCell(`E${item.row}`).value = normalizeCellValue(item.score);
    printSheet.getCell(`F${item.row}`).value = predicateLabel(item.score, rules.materialPredicates);
  }

  printSheet.getCell("A32").value = normalizeCellValue(payload.attendance.sick);
  printSheet.getCell("E32").value = normalizeCellValue(payload.attendance.permission);
  printSheet.getCell("F32").value = normalizeCellValue(payload.attendance.absent);

  printSheet.getCell("A36").value = "Akhlak Kepada Guru";
  printSheet.getCell("E36").value = payload.personality.teacher || "-";
  printSheet.getCell("A37").value = "Akhlak Kepada Teman";
  printSheet.getCell("E37").value = payload.personality.friend || "-";
  printSheet.getCell("A38").value = "Kerapian";
  printSheet.getCell("E38").value = payload.personality.neatness || "-";
  printSheet.getCell("A39").value = "Kedisiplinan";
  printSheet.getCell("E39").value = payload.personality.discipline || "-";

  printSheet.getCell("A42").value = noteText;
  printSheet.getCell("F45").value = `            Purbalingga, ${formatIndonesianDate(payload.reportDate)}`;
  printSheet.getCell("E50").value = payload.homeroomTeacherName;
  printSheet.getCell("G50").value = payload.coordinatorName;
}

function writeTestedSurahRow(
  printSheet: ExcelJS.Worksheet,
  rowNumber: number,
  order: number,
  testedSurah: { name?: string; score?: string | number } | null,
  predicateRules: PredicateRule[],
) {
  printSheet.getCell(`A${rowNumber}`).value = order;
  printSheet.getCell(`B${rowNumber}`).value = testedSurah?.name?.trim() || "-";
  printSheet.getCell(`E${rowNumber}`).value = normalizeCellValue(testedSurah?.score);
  printSheet.getCell(`F${rowNumber}`).value = predicateLabel(testedSurah?.score, predicateRules);
}

function applyTestedSurahRowVisibility(printSheet: ExcelJS.Worksheet, testedSurahs: Array<{ name?: string; score?: string | number } | null>) {
  const hasFirst = Boolean(testedSurahs[0]?.name?.toString().trim() || testedSurahs[0]?.score?.toString().trim());
  const hasSecond = Boolean(testedSurahs[1]?.name?.toString().trim() || testedSurahs[1]?.score?.toString().trim());
  printSheet.getRow(18).hidden = !hasFirst;
  printSheet.getRow(19).hidden = !hasSecond;
}

function freezeFormulasAsValues(sheet: ExcelJS.Worksheet) {
  sheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (cell.value && typeof cell.value === "object" && "formula" in cell.value) {
        cell.value = normalizeFormulaResult((cell.value as ExcelJS.CellFormulaValue).result);
      }
    });
  });
}

function normalizeFormulaResult(result: ExcelJS.CellValue | undefined) {
  if (result == null) return null;
  if (typeof result === "object" && "error" in result) return result.error;
  return result;
}

function keepOnlyPrintSheet(workbook: ExcelJS.Workbook, printSheetName: string) {
  for (const worksheet of [...workbook.worksheets]) {
    if (worksheet.name !== printSheetName) {
      workbook.removeWorksheet(worksheet.id);
    }
  }
}

function readPredicateRules(sheet: ExcelJS.Worksheet, startRow: number, endRow: number, scoreCol: number, labelCol: number): PredicateRule[] {
  const rules: PredicateRule[] = [];
  for (let row = startRow; row <= endRow; row += 1) {
    const min = Number(sheet.getRow(row).getCell(scoreCol).value);
    const label = String(sheet.getRow(row).getCell(labelCol).value ?? "").trim();
    if (Number.isFinite(min) && label) {
      rules.push({ min, label });
    }
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

function predicateLabel(score: string | number | undefined, rules: PredicateRule[]) {
  const numericScore = toFiniteNumber(score);
  if (numericScore == null || numericScore <= 0) return "-";

  let selectedLabel = "-";
  for (const rule of rules) {
    if (numericScore >= rule.min) {
      selectedLabel = rule.label;
    }
  }
  return selectedLabel;
}

async function loadTemplateBuffer() {
  const fsBuffer = await tryLoadFromFilesystem();
  if (fsBuffer) return fsBuffer;
  throw new Error("Template rapor semester tidak ditemukan di runtime server.");
}

async function tryLoadFromFilesystem() {
  let moduleDir: string | null = null;
  try {
    moduleDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    moduleDir = null;
  }

  const candidates: string[] = [];
  if (moduleDir) {
    candidates.push(path.join(moduleDir, "..", "..", "..", "public", "templates", TEMPLATE_FILE));
    candidates.push(path.join(moduleDir, "templates", TEMPLATE_FILE));
  }
  candidates.push(path.join(process.cwd(), "public", "templates", TEMPLATE_FILE));

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // lanjut ke kandidat berikutnya
    }
  }

  return null;
}

function normalizeCellValue(value: string | number | undefined) {
  if (value == null || value === "") return "-";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const trimmed = String(value).trim();
  if (!trimmed) return "-";
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && trimmed !== "-" ? parsed : trimmed;
}

function toFiniteNumber(value: string | number | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatIndonesianDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
