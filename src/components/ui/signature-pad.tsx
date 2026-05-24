"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

type SignaturePadProps = {
  // Tanda tangan disimpan sebagai data URL PNG. Bisa di-paste langsung ke <img src> atau ke DOCX.
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  className?: string;
  height?: number;
};

export function SignaturePad({ value, onChange, className, height = 180 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(Boolean(value));

  // Setup canvas saat mount: scale untuk retina display, set stroke style.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#1e2520";

    // Render value awal jika ada.
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasContent(true);
      };
      img.src = value;
    }
  }, [value]);

  function getPos(event: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top,
      };
    }
    if ("clientX" in event) {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  }

  function startDrawing(event: React.MouseEvent | React.TouchEvent) {
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  }

  function draw(event: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    event.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setHasContent(true);
    onChange(dataUrl);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasContent(false);
    onChange(null);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="relative overflow-hidden rounded-md border-2 border-dashed border-[var(--line)] bg-[var(--surface)]"
        style={{ height }}
      >
        <canvas
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          onTouchStart={startDrawing}
          ref={canvasRef}
        />
        {!hasContent ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-[var(--muted)]">
            <PenLine size={28} />
            <p className="mt-2 text-sm font-semibold">Tanda tangan di sini</p>
            <p className="text-xs">Pakai stylus / jari di HP, mouse di desktop</p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted)]">{hasContent ? "Tanda tangan tersimpan otomatis saat Anda berhenti menggambar." : "Belum ada tanda tangan."}</p>
        {hasContent ? (
          <Button onClick={clear} size="sm" type="button" variant="ghost">
            <Eraser size={14} />
            Hapus
          </Button>
        ) : null}
      </div>
    </div>
  );
}
