import { NextRequest, NextResponse } from "next/server";
import { semesterReportPayloadSchema } from "@/lib/reports/semester-report-payload-schema";
import { generateSemesterReportDocx } from "@/lib/reports/semester-docx";

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
    const docx = await generateSemesterReportDocx(parsed.data);
    const fileName = `Rapor Semester - ${sanitizeFileName(parsed.data.studentName)}.docx`;

    return new NextResponse(new Uint8Array(docx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat file rapor semester.";
    console.error("[semester-docx-route] generate failed:", error);
    return NextResponse.json({ message, stack: error instanceof Error ? error.stack : undefined }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}
