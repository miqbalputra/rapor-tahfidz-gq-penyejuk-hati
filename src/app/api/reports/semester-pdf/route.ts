import { NextRequest, NextResponse } from "next/server";
import { semesterReportPayloadSchema } from "@/lib/reports/semester-report-payload-schema";
import { generateSemesterReportPdf } from "@/lib/reports/semester-pdf";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const parsed = semesterReportPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data rapor semester tidak lengkap atau tidak valid.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const pdf = await generateSemesterReportPdf(parsed.data);
    const fileName = `Rapor Semester - ${sanitizeFileName(parsed.data.studentName)}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat PDF rapor semester.";
    console.error("[semester-pdf-route] generate failed:", error);
    return NextResponse.json({ message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}
