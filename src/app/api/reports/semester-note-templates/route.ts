import { NextResponse } from "next/server";
import { loadSemesterNoteTemplates } from "@/lib/reports/semester-note-templates";

export const runtime = "nodejs";

export async function GET() {
  try {
    const templates = await loadSemesterNoteTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membaca aturan catatan semester.";
    console.error("[semester-note-templates-route] load failed:", error);
    return NextResponse.json({ message }, { status: 500 });
  }
}
