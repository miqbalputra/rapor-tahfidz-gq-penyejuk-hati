import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { z } from "zod";
import { semesterReportPayloadSchema } from "@/lib/reports/semester-report-payload-schema";
import { generateSemesterReportPdf } from "@/lib/reports/semester-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const bulkSemesterReportPayloadSchema = z.object({
  reports: z.array(semesterReportPayloadSchema).min(1).max(120),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const parsed = bulkSemesterReportPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data rapor semester massal tidak lengkap atau tidak valid.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    for (const report of parsed.data.reports) {
      const pdf = await generateSemesterReportPdf(report);
      const baseName = `Rapor Semester - ${sanitizeFileName(report.studentName)}`;
      const fileName = uniqueFileName(baseName, usedNames);
      zip.file(fileName, pdf);
    }

    const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    return new NextResponse(new Uint8Array(archive), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="Rapor Semester PDF - Massal.zip"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat ZIP PDF rapor semester.";
    console.error("[semester-pdf-bulk-route] generate failed:", error);
    return NextResponse.json({ message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}

function uniqueFileName(baseName: string, usedNames: Map<string, number>) {
  const count = usedNames.get(baseName) ?? 0;
  usedNames.set(baseName, count + 1);
  return count === 0 ? `${baseName}.pdf` : `${baseName} (${count + 1}).pdf`;
}
