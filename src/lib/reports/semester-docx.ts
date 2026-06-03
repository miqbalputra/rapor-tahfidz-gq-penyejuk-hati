import fs from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type IBorderOptions,
} from "docx";
import type { SemesterReportPayload } from "./semester-report-payload-schema";

const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 18720;
const PAGE_MARGIN_X = 720;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN_X * 2;
const THIN_BORDER: IBorderOptions = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

export async function generateSemesterReportDocx(payload: SemesterReportPayload) {
  const logoRun = await loadLogoRun();
  const testedSurahs = payload.testedSurahs.filter((item) => item.name?.trim() || String(item.score ?? "").trim());
  const noteText = payload.customDescription?.trim() || descriptionByResult(payload.descriptionResult);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 600,
              right: PAGE_MARGIN_X,
              bottom: 720,
              left: PAGE_MARGIN_X,
            },
          },
        },
        children: [
          createHeaderTable(logoRun, payload),
          spacer(120),
          createIdentityTable(payload),
          spacer(120),
          sectionLabel("A. Bacaan"),
          createScoreTable(
            ["NO", "Materi", "Nilai", "Predikat"],
            [[
              "1",
              payload.readingType || "Baca Tartili",
              displayScore(payload.readingScore),
              predicateLabel(payload.readingScore, "reading"),
            ]],
            [800, 4700, 1800, 2500],
          ),
          spacer(80),
          sectionLabel("B. Hafalan"),
          smallTitle("Target Hafalan"),
          createScoreTable(
            ["NO", "Juz", "Surat", "Keterangan"],
            [[
              "1",
              payload.targetJuz || "-",
              payload.targetSurah || "-",
              payload.targetDescription || "-",
            ]],
            [800, 1800, 2200, 5000],
          ),
          spacer(80),
          smallTitle("Hafalan Yang Sudah Diujikan"),
          createScoreTable(
            ["NO", "Nama Surat", "Nilai", "Predikat"],
            testedSurahs.length > 0
              ? testedSurahs.map((item, index) => [
                  String(index + 1),
                  item.name || "-",
                  displayScore(item.score),
                  predicateLabel(item.score, "tested"),
                ])
              : [],
            [800, 4300, 1700, 3000],
            2,
          ),
          spacer(80),
          sectionLabel("C. Materi Tambahan"),
          createScoreTable(
            ["NO", "Materi", "Nilai", "Predikat"],
            [
              ["1", "Praktek Wudhu", displayScore(payload.materialScores.wudhu), predicateLabel(payload.materialScores.wudhu, "material")],
              ["2", "Praktek Sholat", displayScore(payload.materialScores.sholat), predicateLabel(payload.materialScores.sholat, "material")],
              ["3", "Tayamum", displayScore(payload.materialScores.tayamum), predicateLabel(payload.materialScores.tayamum, "material")],
              ["4", "Shalat Jenazah", displayScore(payload.materialScores.shalatJenazah), predicateLabel(payload.materialScores.shalatJenazah, "material")],
              ["5", "Do'a Harian", displayScore(payload.materialScores.doaHarian), predicateLabel(payload.materialScores.doaHarian, "material")],
              ["6", "Hafalan Hadits", displayScore(payload.materialScores.hafalanHadits), predicateLabel(payload.materialScores.hafalanHadits, "material")],
            ],
            [800, 4700, 1800, 2500],
          ),
          spacer(80),
          sectionLabel("D. Presensi"),
          createScoreTable(
            ["Sakit", "Izin", "Tanpa Keterangan"],
            [[displayScore(payload.attendance.sick), displayScore(payload.attendance.permission), displayScore(payload.attendance.absent)]],
            [3200, 3200, 3200],
            1,
          ),
          spacer(80),
          sectionLabel("E. Kepribadian"),
          createScoreTable(
            ["", "Keterangan"],
            [
              ["Akhlak Kepada Guru", payload.personality.teacher || "-"],
              ["Akhlak Kepada Teman", payload.personality.friend || "-"],
              ["Kerapian", payload.personality.neatness || "-"],
              ["Kedisiplinan", payload.personality.discipline || "-"],
            ],
            [5200, 4200],
            1,
          ),
          spacer(80),
          sectionLabel("F. Catatan"),
          createNoteTable(noteText),
          spacer(220),
          rightAligned(`Purbalingga, ${formatIndonesianDate(payload.reportDate)}`),
          spacer(160),
          createSignatureTable(payload),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

async function loadLogoRun() {
  try {
    const logoBuffer = await fs.readFile(path.join(process.cwd(), "public", "icons", "icon-192.png"));
    return new ImageRun({
      data: logoBuffer,
      type: "png",
      transformation: { width: 54, height: 54 },
    });
  } catch {
    return null;
  }
}

function createHeaderTable(logoRun: ImageRun | null, payload: SemesterReportPayload) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: emptyBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1700, type: WidthType.DXA },
            borders: emptyBorders(),
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: logoRun ? [logoRun] : [] })],
          }),
          new TableCell({
            width: { size: CONTENT_WIDTH - 3400, type: WidthType.DXA },
            borders: emptyBorders(),
            children: [
              centered("LAPORAN HASIL BELAJAR SANTRI", true, 22),
              centered("GRIYA QUR'AN PENYEJUK HATI PURBALINGGA", true, 22),
              centered(`TAHUN AJARAN ${payload.academicYear}`, true, 20),
            ],
          }),
          new TableCell({
            width: { size: 1700, type: WidthType.DXA },
            borders: emptyBorders(),
            children: [new Paragraph("")],
          }),
        ],
      }),
    ],
  });
}

function createIdentityTable(payload: SemesterReportPayload) {
  return createGridTable(
    [
      ["Nama Santri", payload.studentName, "Jilid", payload.jilid || "-"],
      ["Kelas", payload.className, "Semester", payload.semester],
    ],
    [2000, 3600, 1400, 2400],
  );
}

function createNoteTable(text: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          borderedCell(
            [new Paragraph({ spacing: { before: 40, after: 240 }, children: [textRun(text || "-", 20)] })],
            CONTENT_WIDTH,
            { top: THIN_BORDER, right: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER },
          ),
        ],
      }),
    ],
  });
}

function createSignatureTable(payload: SemesterReportPayload) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: emptyBorders(),
    rows: [
      new TableRow({
        children: ["Wali Santri", "Wali Kelas", "Koordinator Griya Qur'an"].map((label) =>
          new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH / 3), type: WidthType.DXA },
            borders: emptyBorders(),
            children: [centered(label, false, 20)],
          }),
        ),
      }),
      new TableRow({
        children: [
          new TableCell({
            borders: emptyBorders(),
            children: [new Paragraph({ spacing: { before: 520, after: 80 }, alignment: AlignmentType.CENTER, children: [textRun("_______________________", 20)] })],
          }),
          new TableCell({
            borders: emptyBorders(),
            children: [new Paragraph({ spacing: { before: 520, after: 80 }, alignment: AlignmentType.CENTER, children: [textRun(payload.homeroomTeacherName, 20, true)] })],
          }),
          new TableCell({
            borders: emptyBorders(),
            children: [new Paragraph({ spacing: { before: 520, after: 80 }, alignment: AlignmentType.CENTER, children: [textRun(payload.coordinatorName, 20, true)] })],
          }),
        ],
      }),
    ],
  });
}

function createScoreTable(headers: string[], rows: string[][], widths: number[], minimumBodyRows = 1) {
  const bodyRows = rows.length > 0 ? rows : Array.from({ length: minimumBodyRows }, (_, index) => Array.from({ length: headers.length }, (_, column) => (column === 0 ? String(index + 1) : "-")));
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header, index) =>
          borderedCell([centered(header, true, 18)], widths[index], fullBorders()),
        ),
      }),
      ...bodyRows.map((row) =>
        new TableRow({
          children: row.map((value, index) =>
            borderedCell(
              [new Paragraph({ alignment: index === 0 ? AlignmentType.CENTER : AlignmentType.LEFT, children: [textRun(value, 18)] })],
              widths[index],
              fullBorders(),
            ),
          ),
        }),
      ),
    ],
  });
}

function createGridTable(rows: string[][], widths: number[]) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: rows.map(
      (row) =>
        new TableRow({
          children: row.map((value, index) =>
            borderedCell(
              [new Paragraph({ children: [textRun(index % 2 === 0 ? `${value}` : `: ${value}`, 18)] })],
              widths[index],
              fullBorders(),
            ),
          ),
        }),
    ),
  });
}

function borderedCell(children: Paragraph[], width: number, borders: Record<string, IBorderOptions>) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children,
  });
}

function sectionLabel(label: string) {
  return new Paragraph({
    spacing: { before: 60, after: 40 },
    children: [textRun(label, 18, true)],
  });
}

function smallTitle(text: string) {
  return new Paragraph({
    spacing: { before: 20, after: 30 },
    children: [textRun(text, 18)],
  });
}

function centered(text: string, bold = false, size = 20) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [textRun(text, size, bold)],
  });
}

function rightAligned(text: string) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 0, after: 0 },
    children: [textRun(text, 18)],
  });
}

function spacer(after: number) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function textRun(text: string, size = 18, bold = false) {
  return new TextRun({
    text,
    bold,
    size: size * 2,
    font: "Arial",
  });
}

function emptyBorders() {
  return { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } };
}

function fullBorders() {
  return { top: THIN_BORDER, right: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER };
}

function predicateLabel(score: string | number | undefined, kind: "reading" | "tested" | "material") {
  const parsed = Number(score);
  if (!Number.isFinite(parsed) || parsed <= 0) return "-";

  const readingRules = [
    { min: 90, label: "A" },
    { min: 80, label: "B" },
    { min: 70, label: "C" },
    { min: 0, label: "D" },
  ];
  const testedRules = readingRules;
  const materialRules = readingRules;
  const rules = kind === "reading" ? readingRules : kind === "tested" ? testedRules : materialRules;
  return rules.find((rule, index) => parsed >= rule.min && (index === 0 || parsed < rules[index - 1].min))?.label ?? rules[0].label;
}

function displayScore(value: string | number | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function descriptionByResult(result: SemesterReportPayload["descriptionResult"]) {
  if (result === "Melampaui") return "Alhamdulillah, ananda menunjukkan capaian yang melampaui target semester ini. Semoga istiqomah menjaga semangat belajar dan murojaah.";
  if (result === "Tidak Tercapai") return "Ananda masih memerlukan pendampingan untuk mengejar target semester ini. Mohon dukungan keluarga agar latihan dan murojaah lebih teratur.";
  return "Alhamdulillah, ananda telah mencapai target semester ini. Semoga terus istiqomah dalam belajar dan menjaga adab sehari-hari.";
}

function formatIndonesianDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
