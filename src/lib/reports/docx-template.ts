import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { Document as XmlDocument, Element as XmlElement, Node as XmlNode } from "@xmldom/xmldom";
import { RAPOR_JUZ_29_BASE64 } from "./templates/rapor-juz-29.base64";
import { RAPOR_JUZ_30_BASE64 } from "./templates/rapor-juz-30.base64";

export type ReportDocxPayload = {
  juz: 29 | 30;
  studentName: string;
  jilid?: string;
  className: string;
  semester: string;
  academicYear: string;
  reportDate: string;
  coordinatorName: string;
  homeroomName: string;
  note: string;
  institutionName?: string;
  institutionAddress?: string;
  setoran: Array<{
    no: number;
    surat: string;
    kelancaran: string | number;
    fashohah: string | number;
    tajwid: string | number;
    nilai: string | number;
  }>;
  juziyah: {
    juzLabel: string;
    kelancaran: string | number;
    fashohah: string | number;
    tajwid: string | number;
    rata2: string | number;
    predikat: string;
  };
  // Keterangan di bawah tabel rapor (opsional). Jika kosong, default template tetap dipakai.
  targetClass?: string;
  targetSemester?: string;
  targetSurahRange?: string;
  // Keterangan 4 baris predikat (urutan: paling tinggi → paling rendah).
  // Tiap baris berisi range (misal "≥ 95"), label (misal "Mumtaz"),
  // deskripsi (misal "Sempurna"), dan apakah label di-italic-kan.
  predicateDescriptions?: Array<{
    range: string;
    label: string;
    description?: string;
    italic_label?: boolean;
  }>;
};

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const TEMPLATE_FILES: Record<29 | 30, string> = {
  29: "rapor-juz-29.docx",
  30: "rapor-juz-30.docx",
};

/**
 * Load template DOCX dari berbagai sumber, dengan urutan prioritas:
 *   1. Filesystem (paling cepat & efisien memori) — beberapa kandidat path
 *   2. Embed base64 (paling reliable — dijamin selalu tersedia di runtime)
 *
 * Embed base64 adalah jaring pengaman yang dijamin work di Vercel serverless,
 * karena module di-bundle bersama runtime, tidak peduli filesystem layout.
 */
async function loadTemplateBuffer(juz: 29 | 30): Promise<Buffer> {
  const fileName = TEMPLATE_FILES[juz];

  // 1. Coba dari filesystem dulu (lebih ringan dari decode base64).
  const fsBuffer = await tryLoadFromFilesystem(fileName);
  if (fsBuffer) return fsBuffer;

  // 2. Fallback ke embed base64 — selalu work di runtime apa pun.
  const base64 = juz === 29 ? RAPOR_JUZ_29_BASE64 : RAPOR_JUZ_30_BASE64;
  return Buffer.from(base64, "base64");
}

async function tryLoadFromFilesystem(fileName: string): Promise<Buffer | null> {
  // Resolve path berdasarkan __dirname dari module ini (lebih reliable di Vercel
  // daripada process.cwd() yang bisa berbeda antara dev dan production).
  let moduleDir: string | null = null;
  try {
    moduleDir = path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // import.meta.url tidak available (mis. test env). Skip module-relative paths.
  }

  const candidates: string[] = [];

  if (moduleDir) {
    candidates.push(path.join(moduleDir, "templates", fileName));
    candidates.push(path.join(moduleDir, "..", "..", "..", "..", "src", "lib", "reports", "templates", fileName));
    candidates.push(path.join(moduleDir, "..", "..", "..", "src", "lib", "reports", "templates", fileName));
  }

  candidates.push(path.join(process.cwd(), "src", "lib", "reports", "templates", fileName));
  candidates.push(path.join(process.cwd(), "public", "templates", fileName));

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate);
    } catch {
      // Skip kandidat ini, lanjut ke berikutnya.
    }
  }

  return null;
}

export async function generateReportDocx(payload: ReportDocxPayload) {
  const template = await loadTemplateBuffer(payload.juz);
  const zip = await JSZip.loadAsync(template);
  const documentXmlFile = zip.file("word/document.xml");

  if (!documentXmlFile) {
    throw new Error("Template DOCX tidak memiliki word/document.xml");
  }

  const documentXml = await documentXmlFile.async("text");
  const doc = new DOMParser().parseFromString(documentXml, "application/xml");

  // 1. Bangun map mergefield → value dari payload setoran, juziyah, catatan.
  const mergeFieldValues = buildMergeFieldMap(payload);

  // 2. Replace semua mergefield di document.
  replaceMergeFields(doc, mergeFieldValues);

  // 3. Replace catatan dengan strategi khusus: hapus seluruh isi cell catatan,
  //    lalu inject paragraf-paragraf berisi catatan dari user.
  //    Ini perlu karena cell catatan punya teks default tambahan (P tanpa mergefield)
  //    yang tidak akan tergantikan oleh logic replaceMergeFields biasa.
  replaceNoteTable(doc, payload);

  // 4. Replace identitas (Nama Santri, Jilid, Kelas, Semester) di tabel #0.
  replaceIdentityTable(doc, payload);

  // 5. Replace footer (tanggal Purbalingga + nama koordinator + wali kelas) di tabel #4.
  replaceFooterTable(doc, payload);

  // 6. Replace header lembaga (institusi name + address) jika diisi.
  replaceInstitutionHeader(doc, payload);

  // 7. Replace tahun ajaran di paragraph "TAHUN AJARAN ...".
  replaceAcademicYear(doc, payload);

  // 8. Replace keterangan target Tahfizul Quran (kelas + range surat).
  replaceTargetDescription(doc, payload);

  // 9. Replace keterangan 4 baris predikat (range + label + deskripsi).
  replacePredicateDescriptions(doc, payload);

  zip.file("word/document.xml", new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

// =============================================================
// MERGEFIELD replacement
// =============================================================

function buildMergeFieldMap(payload: ReportDocxPayload): Map<string, string> {
  const map = new Map<string, string>();

  // Setoran: M_n (nama surat), KEL_n, FASH_n, TAJ_n, NIL_n
  for (const row of payload.setoran) {
    const i = row.no;
    map.set(`M_${i}`, String(row.surat ?? ""));
    map.set(`KEL_${i}`, String(row.kelancaran ?? "-"));
    map.set(`FASH_${i}`, String(row.fashohah ?? "-"));
    map.set(`TAJ_${i}`, String(row.tajwid ?? "-"));
    map.set(`NIL_${i}`, String(row.nilai ?? "-"));
  }

  // Juziyah: variasi nama mergefield yang ditemukan di kedua template.
  // Juz 29: M_1_JUZ, KEL_, FAS, TAJ, NIL, PREDIKAT
  // Juz 30: FAS, NIL, PREDIKAT (sisanya kadang hardcoded)
  map.set("M_1_JUZ", payload.juziyah.juzLabel ?? `JUZ ${payload.juz}`);
  map.set("KEL_", String(payload.juziyah.kelancaran ?? "-"));
  map.set("FAS", String(payload.juziyah.fashohah ?? "-"));
  map.set("TAJ", String(payload.juziyah.tajwid ?? "-"));
  map.set("NIL", String(payload.juziyah.rata2 ?? "-"));
  map.set("PREDIKAT", payload.juziyah.predikat ?? "-");

  // Catatan ditangani terpisah oleh replaceNoteTable() karena cell catatan punya
  // teks default sambungan (paragraph tanpa mergefield) yang tidak boleh ikut
  // tertinggal di output. Jangan masukkan CAT_KE_* ke map ini.

  return map;
}

/**
 * Replace semua MERGEFIELD dengan value dari map.
 *
 * Struktur mergefield di Word:
 *   <w:r><w:fldChar w:fldCharType="begin"/></w:r>
 *   <w:r><w:instrText> MERGEFIELD NAMA </w:instrText></w:r>
 *   <w:r><w:fldChar w:fldCharType="separate"/></w:r>
 *   <w:r><w:t>VALUE_LAMA</w:t></w:r>     ← yang ini di-replace
 *   <w:r><w:fldChar w:fldCharType="end"/></w:r>
 */
function replaceMergeFields(doc: XmlDocument, valueMap: Map<string, string>) {
  const instrTexts = Array.from(doc.getElementsByTagName("w:instrText"));

  for (const instr of instrTexts) {
    const instrContent = instr.textContent ?? "";
    const match = instrContent.match(/MERGEFIELD\s+(\S+)/);
    if (!match) continue;

    const fieldName = match[1];
    if (!valueMap.has(fieldName)) continue;

    const newValue = valueMap.get(fieldName) ?? "";

    // Cari run yang mengandung instrText ini.
    const instrRun = findAncestor(instr, "w:r");
    if (!instrRun) continue;

    // Iterate sibling runs setelah instrRun sampai ketemu fldChar end.
    // Replace text di run yang terletak setelah fldChar separate.
    let node: XmlNode | null = instrRun.nextSibling;
    let afterSeparate = false;
    let replaced = false;

    while (node) {
      if (node.nodeType === 1) {
        const element = node as XmlElement;
        if (element.tagName === "w:r") {
          const fldChars = Array.from(element.getElementsByTagName("w:fldChar"));
          const separateChar = fldChars.find((c) => c.getAttribute("w:fldCharType") === "separate");
          const endChar = fldChars.find((c) => c.getAttribute("w:fldCharType") === "end");

          if (separateChar) {
            afterSeparate = true;
            node = node.nextSibling;
            continue;
          }

          if (endChar) {
            // Sudah sampai end; jika belum sempat replace, append text di run ini.
            if (!replaced) {
              setRunText(element, newValue);
              replaced = true;
            }
            break;
          }

          if (afterSeparate) {
            // Run setelah separate adalah tempat value lama; replace text-nya.
            if (!replaced) {
              setRunText(element, newValue);
              replaced = true;
            } else {
              // Run setelah replace pertama: kosongkan agar tidak duplicate.
              clearRunText(element);
            }
          }
        }
      }
      node = node.nextSibling;
    }
  }
}

function findAncestor(node: XmlNode, tagName: string): XmlElement | null {
  let current: XmlNode | null = node.parentNode;
  while (current) {
    if (current.nodeType === 1 && (current as XmlElement).tagName === tagName) {
      return current as XmlElement;
    }
    current = current.parentNode;
  }
  return null;
}

function setRunText(run: XmlElement, text: string) {
  const textNodes = Array.from(run.getElementsByTagName("w:t"));
  if (textNodes.length === 0) {
    const ownerDocument = run.ownerDocument;
    if (!ownerDocument) return;
    const textElement = ownerDocument.createElementNS(W_NS, "w:t");
    textElement.setAttribute("xml:space", "preserve");
    textElement.appendChild(ownerDocument.createTextNode(text));
    run.appendChild(textElement);
    return;
  }

  textNodes[0].textContent = text;
  textNodes[0].setAttribute("xml:space", "preserve");
  for (const textNode of textNodes.slice(1)) {
    textNode.textContent = "";
  }
}

function clearRunText(run: XmlElement) {
  const textNodes = Array.from(run.getElementsByTagName("w:t"));
  for (const textNode of textNodes) {
    textNode.textContent = "";
  }
}

// =============================================================
// Identity table (Nama Santri, Jilid, Kelas, Semester)
// =============================================================

/**
 * Tabel identitas adalah tabel #0 dengan 4 cell:
 *   row 0: [Nama Santri :] [Jilid : ]
 *   row 1: [Kelas :]       [Semester :]
 *
 * Kita append value setelah ":" pada tiap cell.
 */
function replaceIdentityTable(doc: XmlDocument, payload: ReportDocxPayload) {
  const tables = Array.from(doc.getElementsByTagName("w:tbl"));
  if (tables.length === 0) return;
  const identityTable = tables[0];

  const rows = Array.from(identityTable.getElementsByTagName("w:tr"));
  if (rows.length < 2) return;

  const row0Cells = Array.from(rows[0].getElementsByTagName("w:tc"));
  const row1Cells = Array.from(rows[1].getElementsByTagName("w:tc"));

  if (row0Cells[0]) appendValueToIdentityCell(row0Cells[0], "Nama Santri", payload.studentName);
  if (row0Cells[1]) appendValueToIdentityCell(row0Cells[1], "Jilid", payload.jilid || "-");
  if (row1Cells[0]) appendValueToIdentityCell(row1Cells[0], "Kelas", payload.className);
  if (row1Cells[1]) appendValueToIdentityCell(row1Cells[1], "Semester", payload.semester);
}

/**
 * Append value ke cell. Strategi:
 *   - Cari paragraph terakhir di cell.
 *   - Append run baru berisi spasi + value.
 *   - Cell biasanya hanya berisi label seperti "Nama Santri :" tanpa nilai.
 *
 * Jika cell sudah pernah diisi (idempotent re-run), sistem akan replace
 * run terakhir yang punya text non-label, atau append baru.
 */
function appendValueToIdentityCell(cell: XmlElement, label: string, value: string) {
  const paragraphs = Array.from(cell.getElementsByTagName("w:p"));
  if (paragraphs.length === 0) return;

  const targetParagraph = paragraphs[paragraphs.length - 1];
  const ownerDocument = targetParagraph.ownerDocument;
  if (!ownerDocument) return;

  // Cek apakah sudah ada run dengan tag khusus marker "rapor-value" → replace text.
  const existingValueRuns = Array.from(targetParagraph.getElementsByTagName("w:r")).filter((run) => {
    const customAttr = run.getAttribute("data-rapor-value");
    return customAttr === label;
  });

  if (existingValueRuns.length > 0) {
    setRunText(existingValueRuns[0], ` ${value}`);
    for (const run of existingValueRuns.slice(1)) {
      clearRunText(run);
    }
    return;
  }

  // Tidak ada marker, append run baru.
  const newRun = ownerDocument.createElementNS(W_NS, "w:r");
  newRun.setAttribute("data-rapor-value", label);

  const rPr = ownerDocument.createElementNS(W_NS, "w:rPr");
  const bold = ownerDocument.createElementNS(W_NS, "w:b");
  rPr.appendChild(bold);
  newRun.appendChild(rPr);

  const textElement = ownerDocument.createElementNS(W_NS, "w:t");
  textElement.setAttribute("xml:space", "preserve");
  textElement.appendChild(ownerDocument.createTextNode(` ${value}`));
  newRun.appendChild(textElement);

  targetParagraph.appendChild(newRun);
}

// =============================================================
// Note table (catatan rapor)
// =============================================================

/**
 * Cell catatan (di tabel #3) berisi struktur:
 *   P[0] = MERGEFIELD CAT_KE_1 + teks default
 *   P[1] = teks default sambungan (TANPA mergefield)
 *   P[2] = MERGEFIELD CAT_KE_2 + teks default
 *   P[3] = teks default sambungan
 *   P[4] = MERGEFIELD CAT_KE_3 + teks default
 *
 * Kalau hanya replace mergefield, P[1] dan P[3] akan tertinggal di output.
 * Solusinya: hapus seluruh isi cell, lalu inject paragraph baru dengan
 * catatan dari user — tanpa bullet, tanpa split kalimat, persis seperti
 * yang diketik admin di textarea Catatan.
 */
function replaceNoteTable(doc: XmlDocument, payload: ReportDocxPayload) {
  const tables = Array.from(doc.getElementsByTagName("w:tbl"));
  // Tabel catatan adalah tabel ke-4 dari 5 tabel di template (index 3).
  // Identifikasi: tabel dengan 1 cell, dan cell-nya mengandung "MERGEFIELD CAT_KE_".
  let noteTable: XmlElement | null = null;
  for (const table of tables) {
    const cells = table.getElementsByTagName("w:tc");
    if (cells.length !== 1) continue;
    const xml = new XMLSerializer().serializeToString(cells[0]);
    if (xml.includes("MERGEFIELD") && xml.includes("CAT_KE")) {
      noteTable = table;
      break;
    }
  }
  if (!noteTable) return;

  const cell = noteTable.getElementsByTagName("w:tc")[0];
  if (!cell) return;

  const ownerDocument = cell.ownerDocument;
  if (!ownerDocument) return;

  // Ambil rPr (run properties) dari paragraph pertama untuk preserve formatting.
  const oldParagraphs = Array.from(cell.getElementsByTagName("w:p"));
  let preservedRPr: XmlElement | null = null;
  if (oldParagraphs.length > 0) {
    const firstRun = oldParagraphs[0].getElementsByTagName("w:r")[0];
    if (firstRun) {
      const rPr = firstRun.getElementsByTagName("w:rPr")[0];
      if (rPr) {
        preservedRPr = rPr.cloneNode(true) as XmlElement;
      }
    }
  }

  // Ambil pPr (paragraph properties) dari paragraph pertama juga.
  let preservedPPr: XmlElement | null = null;
  if (oldParagraphs.length > 0) {
    const pPr = oldParagraphs[0].getElementsByTagName("w:pPr")[0];
    if (pPr) {
      preservedPPr = pPr.cloneNode(true) as XmlElement;
    }
  }

  // Hapus semua paragraph existing di cell.
  for (const p of oldParagraphs) {
    if (p.parentNode) p.parentNode.removeChild(p);
  }

  // Inject 1 paragraph berisi catatan apa adanya dari user.
  // Kalau catatan multi-line (ada \n), pecah jadi multiple paragraph.
  const noteText = (payload.note ?? "").trim();
  const lines = noteText.length > 0 ? noteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) : [""];

  for (const line of lines) {
    const paragraph = ownerDocument.createElementNS(W_NS, "w:p");
    if (preservedPPr) {
      paragraph.appendChild(preservedPPr.cloneNode(true));
    }
    const run = ownerDocument.createElementNS(W_NS, "w:r");
    if (preservedRPr) {
      run.appendChild(preservedRPr.cloneNode(true));
    }
    const textElement = ownerDocument.createElementNS(W_NS, "w:t");
    textElement.setAttribute("xml:space", "preserve");
    textElement.appendChild(ownerDocument.createTextNode(line));
    run.appendChild(textElement);
    paragraph.appendChild(run);
    cell.appendChild(paragraph);
  }
}

// =============================================================
// Footer table (tanggal + tanda tangan)
// =============================================================

/**
 * Tabel footer adalah tabel terakhir (#4) berisi:
 *   Cell A (tanggal):    "Purbalingga, [tanggal] [bulan] [tahun]"
 *   Cell B (koordinator): "Koordinator Griya Qur'an" + 4 baris kosong + nama
 *   Cell C (wali kelas):  "Wali Kelas" + 4 baris kosong + nama
 *   Cell D (wali santri): "Wali Santri" + 4 baris kosong + "................"
 *
 * Penting: nama koordinator/wali kelas harus tetap berada di paragraf TERAKHIR
 * (sejajar dengan titik-titik di cell Wali Santri). Jangan ganggu paragraf kosong
 * di tengah karena itu adalah spacing untuk tanda tangan manual di atas nama.
 */
function replaceFooterTable(doc: XmlDocument, payload: ReportDocxPayload) {
  const tables = Array.from(doc.getElementsByTagName("w:tbl"));
  if (tables.length === 0) return;
  const footerTable = tables[tables.length - 1];

  const formattedDate = formatIndonesianDate(payload.reportDate);

  // 1. Replace tanggal "Purbalingga, ..." di paragraph mana pun yang mengandungnya.
  const paragraphs = Array.from(footerTable.getElementsByTagName("w:p"));
  for (const paragraph of paragraphs) {
    const text = getNodeText(paragraph);
    if (text.toLowerCase().includes("purbalingga")) {
      replaceParagraphText(paragraph, `Purbalingga, ${formattedDate}`);
    }
  }

  // 2. Replace nama koordinator dan wali kelas yang ada di template
  //    (template asli berisi "Maulidin Nafsir" di paragraf terakhir tiap cell label).
  //    Urutan: occurrence pertama = koordinator, occurrence kedua = wali kelas.
  const remainingParagraphs = Array.from(footerTable.getElementsByTagName("w:p"));
  let occurrence = 0;
  for (const paragraph of remainingParagraphs) {
    const text = getNodeText(paragraph);
    if (text.includes("Maulidin Nafsir")) {
      const replacement = occurrence === 0 ? payload.coordinatorName : payload.homeroomName;
      replaceParagraphText(paragraph, text.replace(/Maulidin Nafsir/g, replacement));
      occurrence += 1;
    }
  }

  // 3. Fallback untuk template yang sudah dimodifikasi (nama default bukan "Maulidin Nafsir"):
  //    cari cell yang punya label "Koordinator" / "Wali Kelas",
  //    lalu replace paragraph TERAKHIR cell tersebut dengan nama yang sesuai.
  if (occurrence < 2) {
    const cells = Array.from(footerTable.getElementsByTagName("w:tc"));
    for (const cell of cells) {
      const cellText = getNodeText(cell).toLowerCase();
      const cellParagraphs = Array.from(cell.getElementsByTagName("w:p"));
      if (cellParagraphs.length === 0) continue;
      const lastParagraph = cellParagraphs[cellParagraphs.length - 1];
      const lastText = getNodeText(lastParagraph).trim();

      // Skip kalau paragraf terakhir bukan tempat nama (mis. cell Wali Santri yang isinya titik-titik).
      if (lastText.includes(".....") || lastText === "") {
        // Cell Wali Santri: titik-titik. Skip.
        if (cellText.includes("wali santri")) continue;
      }

      if (cellText.includes("koordinator") && occurrence === 0) {
        replaceParagraphText(lastParagraph, payload.coordinatorName);
        occurrence += 1;
      } else if (cellText.includes("wali kelas") && occurrence <= 1) {
        replaceParagraphText(lastParagraph, payload.homeroomName);
        occurrence += 1;
      }
    }
  }
}

// =============================================================
// Institution header (nama lembaga + alamat)
// =============================================================

function replaceInstitutionHeader(doc: XmlDocument, payload: ReportDocxPayload) {
  if (!payload.institutionName && !payload.institutionAddress) return;

  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  for (const paragraph of paragraphs) {
    const text = getNodeText(paragraph);

    if (
      payload.institutionName &&
      (text.includes("GRIYA QUR'AN") || text.includes("GRIYA QUR\u2019AN") || text.includes("GRIYA QURAN"))
    ) {
      replaceParagraphText(paragraph, payload.institutionName);
      continue;
    }

    if (
      payload.institutionAddress &&
      (text.toLowerCase().includes("alamat") || text.toLowerCase().includes("purbalingga, jawa tengah"))
    ) {
      // Skip kalau ini paragraph "Purbalingga, [tanggal]" — sudah ditangani footer.
      if (text.trim().toLowerCase().startsWith("purbalingga,")) continue;
      replaceParagraphText(paragraph, payload.institutionAddress);
    }
  }
}

// =============================================================
// Academic year
// =============================================================

function replaceAcademicYear(doc: XmlDocument, payload: ReportDocxPayload) {
  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  for (const paragraph of paragraphs) {
    const text = getNodeText(paragraph);
    if (text.includes("TAHUN AJARAN")) {
      replaceParagraphText(paragraph, `TAHUN AJARAN ${payload.academicYear}`);
    }
  }
}

// =============================================================
// Target Tahfizul Quran (keterangan di bawah tabel)
// =============================================================

/**
 * Paragraph asli di template:
 *   "Target Tahfizul Quran Kelas 4 Semester I adalah Surat An-Nas s.d 'Abasa"
 *
 * Field yang bisa diubah dari UI:
 *   - targetClass     → ganti "4"
 *   - targetSemester  → ganti "I"
 *   - targetSurahRange→ ganti "Surat An-Nas s.d 'Abasa"
 *
 * Kalau field kosong, default template tetap dipertahankan.
 */
function replaceTargetDescription(doc: XmlDocument, payload: ReportDocxPayload) {
  const hasOverride = payload.targetClass || payload.targetSemester || payload.targetSurahRange;
  if (!hasOverride) return;

  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  for (const paragraph of paragraphs) {
    const text = getNodeText(paragraph);
    if (!text.includes("Target Tahfizul Quran")) continue;

    // Bangun teks baru dari kombinasi default + override.
    // Default kelas dan semester ditarik dari teks asli kalau tidak di-override.
    const classMatch = text.match(/Kelas\s+([^\s]+)/);
    const semesterMatch = text.match(/Semester\s+([^\s]+(?:\s+[^\s]+)?)\s+adalah/);
    const surahMatch = text.match(/adalah\s+(.+?)\s*$/);

    const finalClass = (payload.targetClass ?? classMatch?.[1] ?? "4").trim();
    const finalSemester = (payload.targetSemester ?? semesterMatch?.[1] ?? "I").trim();
    const finalSurahRange = (payload.targetSurahRange ?? surahMatch?.[1] ?? "Surat An-Nas s.d 'Abasa").trim();

    replaceParagraphText(paragraph, `Target Tahfizul Quran Kelas ${finalClass} Semester ${finalSemester} adalah ${finalSurahRange}`);
    return;
  }
}

// =============================================================
// Predicate descriptions (4 baris keterangan predikat)
// =============================================================

/**
 * Template menampilkan 4 paragraph berurut:
 *   "≥ 95     = Mumtaz (Sempurna)"
 *   "90-94,9  = Jayyid Jiddan (Baik Sekali)"
 *   "86-89,9  = Jayyid (Baik)"
 *   "≤ 85     = Maqbul (Cukup)"
 *
 * Format setiap baris:
 *   [range] [TAB] = [label, italic] (description)
 *
 * Strategi: cari paragraph "Predikat Nilai :", lalu replace 4 paragraph
 * sibling berikutnya dengan data dari payload.predicateDescriptions.
 *
 * Tetap pertahankan styling (italic pada label) kalau italic_label = true.
 */
function replacePredicateDescriptions(doc: XmlDocument, payload: ReportDocxPayload) {
  if (!payload.predicateDescriptions || payload.predicateDescriptions.length === 0) return;

  const paragraphs = Array.from(doc.getElementsByTagName("w:p"));
  // Cari index paragraph "Predikat Nilai :".
  const anchorIndex = paragraphs.findIndex((p) => {
    const text = getNodeText(p).trim();
    return text.toLowerCase().startsWith("predikat nilai");
  });

  if (anchorIndex === -1) return;

  // 4 paragraph setelah anchor adalah daftar predikat.
  for (let i = 0; i < payload.predicateDescriptions.length; i += 1) {
    const targetParagraph = paragraphs[anchorIndex + 1 + i];
    if (!targetParagraph) break;

    // Validasi: pastikan paragraph target memang berisi format predikat (mengandung "=").
    const currentText = getNodeText(targetParagraph);
    if (!currentText.includes("=")) break;

    const desc = payload.predicateDescriptions[i];
    const range = desc.range.trim();
    const label = desc.label.trim();
    const description = (desc.description ?? "").trim();
    const italicLabel = desc.italic_label !== false;

    rebuildPredicateLine(targetParagraph, range, label, description, italicLabel);
  }
}

/**
 * Bangun ulang satu paragraph predikat dengan format:
 *   [range] [TAB] = [label, italic optional] [(description)]
 */
function rebuildPredicateLine(
  paragraph: XmlElement,
  range: string,
  label: string,
  description: string,
  italicLabel: boolean,
) {
  const ownerDocument = paragraph.ownerDocument;
  if (!ownerDocument) return;

  // Ambil rPr dari run pertama (preserve font/size).
  const firstRun = paragraph.getElementsByTagName("w:r")[0];
  let baseRPr: XmlElement | null = null;
  if (firstRun) {
    const rPr = firstRun.getElementsByTagName("w:rPr")[0];
    if (rPr) baseRPr = rPr.cloneNode(true) as XmlElement;
  }

  // Ambil pPr (paragraph properties: indent, spacing, dll).
  const pPrOriginal = paragraph.getElementsByTagName("w:pPr")[0];
  const preservedPPr = pPrOriginal ? (pPrOriginal.cloneNode(true) as XmlElement) : null;

  // Hapus semua child node existing.
  while (paragraph.firstChild) {
    paragraph.removeChild(paragraph.firstChild);
  }
  if (preservedPPr) paragraph.appendChild(preservedPPr);

  // Helper: bangun w:r dengan optional italic.
  function makeRun(text: string, italic = false): XmlElement {
    const run = ownerDocument!.createElementNS(W_NS, "w:r");
    let rPr: XmlElement;
    if (baseRPr) {
      rPr = baseRPr.cloneNode(true) as XmlElement;
    } else {
      rPr = ownerDocument!.createElementNS(W_NS, "w:rPr");
    }
    if (italic) {
      // Tambah <w:i/> dan <w:iCs/>; remove existing italic dulu agar tidak duplicate.
      const existingI = rPr.getElementsByTagName("w:i");
      while (existingI.length > 0) {
        existingI[0].parentNode?.removeChild(existingI[0]);
      }
      const existingICs = rPr.getElementsByTagName("w:iCs");
      while (existingICs.length > 0) {
        existingICs[0].parentNode?.removeChild(existingICs[0]);
      }
      rPr.appendChild(ownerDocument!.createElementNS(W_NS, "w:i"));
      rPr.appendChild(ownerDocument!.createElementNS(W_NS, "w:iCs"));
    } else {
      // Pastikan tidak ada italic.
      const existingI = rPr.getElementsByTagName("w:i");
      while (existingI.length > 0) {
        existingI[0].parentNode?.removeChild(existingI[0]);
      }
      const existingICs = rPr.getElementsByTagName("w:iCs");
      while (existingICs.length > 0) {
        existingICs[0].parentNode?.removeChild(existingICs[0]);
      }
    }
    run.appendChild(rPr);
    const t = ownerDocument!.createElementNS(W_NS, "w:t");
    t.setAttribute("xml:space", "preserve");
    t.appendChild(ownerDocument!.createTextNode(text));
    run.appendChild(t);
    return run;
  }

  // Helper: bangun run dengan tab character (untuk align "=").
  function makeTabRun(): XmlElement {
    const run = ownerDocument!.createElementNS(W_NS, "w:r");
    if (baseRPr) {
      // Clone tanpa italic
      const rPr = baseRPr.cloneNode(true) as XmlElement;
      const existingI = rPr.getElementsByTagName("w:i");
      while (existingI.length > 0) existingI[0].parentNode?.removeChild(existingI[0]);
      const existingICs = rPr.getElementsByTagName("w:iCs");
      while (existingICs.length > 0) existingICs[0].parentNode?.removeChild(existingICs[0]);
      run.appendChild(rPr);
    }
    const tab = ownerDocument!.createElementNS(W_NS, "w:tab");
    run.appendChild(tab);
    return run;
  }

  // Bangun urutan run: "[range] " <TAB> "= " "[label]" " (description)"
  paragraph.appendChild(makeRun(`${range} `, false));
  paragraph.appendChild(makeTabRun());
  paragraph.appendChild(makeRun("= ", false));
  paragraph.appendChild(makeRun(label, italicLabel));
  if (description) {
    paragraph.appendChild(makeRun(` (${description})`, false));
  }
}

// =============================================================
// Helper untuk paragraph
// =============================================================

function getNodeText(node: XmlElement) {
  return Array.from(node.getElementsByTagName("w:t"))
    .map((textNode) => textNode.textContent ?? "")
    .join("");
}

/**
 * Replace seluruh teks di paragraph dengan teks baru.
 * Mempertahankan formatting dari run pertama.
 */
function replaceParagraphText(paragraph: XmlElement, text: string) {
  const textNodes = Array.from(paragraph.getElementsByTagName("w:t"));

  if (textNodes.length === 0) {
    const ownerDocument = paragraph.ownerDocument;
    if (!ownerDocument) return;
    const run = ownerDocument.createElementNS(W_NS, "w:r");
    const textElement = ownerDocument.createElementNS(W_NS, "w:t");
    textElement.setAttribute("xml:space", "preserve");
    textElement.appendChild(ownerDocument.createTextNode(text));
    run.appendChild(textElement);
    paragraph.appendChild(run);
    return;
  }

  textNodes[0].textContent = text;
  textNodes[0].setAttribute("xml:space", "preserve");
  for (const textNode of textNodes.slice(1)) {
    textNode.textContent = "";
  }
}

function formatIndonesianDate(value: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}
