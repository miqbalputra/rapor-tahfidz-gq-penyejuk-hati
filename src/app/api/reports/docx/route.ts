import { NextRequest, NextResponse } from "next/server";
import { generateReportDocx } from "@/lib/reports/docx-template";
import { reportPayloadSchema } from "@/lib/reports/report-payload-schema";

export async function POST(request: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const parsed = reportPayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Data rapor tidak lengkap atau tidak valid.", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  try {
    const docx = await generateReportDocx(payload);
    const fileName = `Rapor Juz ${payload.juz} - ${sanitizeFileName(payload.studentName)}.docx`;

    return new NextResponse(new Uint8Array(docx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat DOCX rapor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}
