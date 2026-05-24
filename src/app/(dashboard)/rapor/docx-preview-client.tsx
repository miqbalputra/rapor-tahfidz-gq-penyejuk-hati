"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import type { ReportDocxPayload } from "@/lib/reports/docx-template";

type Props = {
  payload: ReportDocxPayload | null;
  // Trigger ulang render saat payload identitas berubah (memo cache).
  cacheKey?: string;
};

/**
 * Render DOCX rapor live di browser pakai library docx-preview.
 * Hasilnya persis seperti file yang akan didownload — tidak ada divergensi
 * antara preview dan output cetak.
 *
 * Library di-load lazy via dynamic import agar tidak masuk bundle dashboard
 * untuk pengguna yang belum buka halaman rapor.
 */
export function DocxPreviewClient({ payload, cacheKey }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "rendered" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    async function render() {
      if (!payload) return;
      const container = containerRef.current;
      if (!container) return;

      setStatus("loading");
      setErrorMessage(null);

      try {
        const response = await fetch("/api/reports/docx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}`);
        }

        const blob = await response.blob();
        if (cancelled) return;

        // Lazy-load docx-preview supaya tidak masuk bundle utama.
        const docxPreview = await import("docx-preview");

        // Bersihkan container sebelum render baru.
        container.innerHTML = "";

        await docxPreview.renderAsync(blob, container, undefined, {
          className: "docx-preview-content",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });

        if (cancelled) return;
        setStatus("rendered");
      } catch (error) {
        if (cancelled) return;
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Gagal render preview rapor.");
      }
    }

    void render();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, payload]);

  return (
    <div className="docx-preview-wrapper">
      {status === "loading" ? (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-[var(--muted)]">
          <Loader2 className="animate-spin" size={20} />
          <span className="text-sm font-semibold">Menyusun preview rapor Word...</span>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div className="text-sm leading-6">
            <p className="font-bold">Preview gagal dibuat</p>
            <p className="mt-1">{errorMessage}</p>
            <p className="mt-2 text-xs opacity-80">
              File Word tetap bisa didownload lewat tombol Cetak Word di atas, walaupun preview tidak tampil.
            </p>
          </div>
        </div>
      ) : null}

      {status === "idle" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)]/40 p-12 text-center text-[var(--muted)]">
          <FileText size={32} />
          <p className="text-sm font-semibold">Pilih santri untuk melihat preview rapor</p>
        </div>
      ) : null}

      {/* Container untuk hasil render docx-preview. Tetap di-mount agar ref tidak hilang. */}
      <div className="docx-preview-host" ref={containerRef} style={{ display: status === "rendered" ? "block" : "none" }} />
    </div>
  );
}
