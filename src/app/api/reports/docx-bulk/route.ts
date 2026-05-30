import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { generateReportDocx } from "@/lib/reports/docx-template";
import { reportPayloadSchema } from "@/lib/reports/report-payload-schema";

// Pakai Node.js runtime (bukan Edge) karena DOCX engine + JSZip butuh Node API.
export const runtime = "nodejs";
// Set max duration agar bulk dengan banyak santri tidak ke-timeout di Vercel.
// Free tier limit 10s untuk Hobby plan; Pro plan bisa sampai 60s.
export const maxDuration = 60;

const bulkReportPayloadSchema = z.object({
  reports: z.array(reportPayloadSchema).min(1).max(120),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const parsed = bulkReportPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data rapor massal tidak lengkap atau tidak valid.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (const report of payload.reports) {
      const docx = await generateReportDocx(report);
      const baseName = `Rapor Juz ${report.juz} - ${sanitizeFileName(report.studentName)}`;
      const fileName = uniqueFileName(baseName, usedNames);
      zip.file(fileName, docx);
    }

    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const juzLabel = payload.reports[0]?.juz ?? "";

    return new NextResponse(new Uint8Array(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="Rapor Juz ${juzLabel} - Massal.zip"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat ZIP rapor massal.";
    console.error("[docx-bulk-route] generate failed:", error);
    return NextResponse.json({ message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}

function uniqueFileName(baseName: string, usedNames: Map<string, number>) {
  const count = usedNames.get(baseName) ?? 0;
  usedNames.set(baseName, count + 1);
  return count === 0 ? `${baseName}.docx` : `${baseName} (${count + 1}).docx`;
}
