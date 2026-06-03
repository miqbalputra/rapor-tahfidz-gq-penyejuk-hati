import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateSemesterReportXlsx } from "@/lib/reports/semester-template";
import { semesterReportPayloadSchema } from "@/lib/reports/semester-report-payload-schema";

export const runtime = "nodejs";

const semesterXlsxRequestSchema = semesterReportPayloadSchema.extend({
  mode: z.enum(["print", "full"]).optional().default("print"),
});

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const parsed = semesterXlsxRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data rapor semester tidak lengkap atau tidak valid.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const xlsx = await generateSemesterReportXlsx(parsed.data, parsed.data.mode);
    const fileName = `${parsed.data.mode === "print" ? "Rapor Semester - Cetak" : "Rapor Semester - Template"} - ${sanitizeFileName(parsed.data.studentName)}.xlsx`;

    return new NextResponse(new Uint8Array(xlsx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat file rapor semester.";
    console.error("[semester-xlsx-route] generate failed:", error);
    return NextResponse.json({ message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}
