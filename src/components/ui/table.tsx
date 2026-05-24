"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DataTableProps = {
  columns: string[];
  rows: ReactNode[][];
  className?: string;
  // Optional: aktifkan paginasi client-side. Jika tidak diset, tabel tampil semua baris (backward-compatible).
  pageSize?: number;
  // Optional: opsi page size yang bisa dipilih user. Default [10, 25, 50, 100].
  pageSizeOptions?: number[];
  // Optional: label entitas untuk pesan "X dari Y". Default "baris".
  entityLabel?: string;
};

export function DataTable({
  columns,
  rows,
  className,
  pageSize: initialPageSize,
  pageSizeOptions = [10, 25, 50, 100],
  entityLabel = "baris",
}: DataTableProps) {
  const usePagination = typeof initialPageSize === "number" && initialPageSize > 0;

  const [pageSize, setPageSize] = useState<number>(initialPageSize ?? 10);
  const [page, setPage] = useState<number>(1);

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  // Reset ke halaman 1 jika data berubah dan halaman saat ini melampaui total.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const visibleRows = useMemo(() => {
    if (!usePagination) return rows;
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows, usePagination]);

  const startIndex = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalRows);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-x-auto rounded-md border border-[var(--line)]">
        <div className="border-b border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)] sm:hidden">
          Geser tabel ke samping untuk melihat semua kolom.
        </div>
        <table className="w-full min-w-[720px] border-collapse bg-[var(--surface)] text-sm">
          <thead className="bg-[var(--surface-soft)] text-left text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
            <tr>
              {columns.map((column) => (
                <th className="border-b border-[var(--line)] px-3 py-3" key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-[var(--muted)]" colSpan={columns.length}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, rowIndex) => (
                <tr className="border-b border-[var(--line)] last:border-0" key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td className="px-3 py-3 align-middle text-[var(--foreground)]" key={`${rowIndex}-${cellIndex}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {usePagination ? (
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]">
            <span>
              Menampilkan <span className="font-semibold text-[var(--foreground)]">{startIndex}</span>
              {" - "}
              <span className="font-semibold text-[var(--foreground)]">{endIndex}</span>
              {" dari "}
              <span className="font-semibold text-[var(--foreground)]">{totalRows}</span> {entityLabel}
            </span>
            <div className="flex items-center gap-2">
              <span>Per halaman</span>
              <select
                aria-label="Jumlah baris per halaman"
                className="min-h-9 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 text-sm"
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                value={pageSize}
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Halaman sebelumnya"
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft size={16} />
              Sebelumnya
            </button>
            <span className="text-sm text-[var(--muted)]">
              Halaman <span className="font-semibold text-[var(--foreground)]">{page}</span>
              {" dari "}
              <span className="font-semibold text-[var(--foreground)]">{totalPages}</span>
            </span>
            <button
              aria-label="Halaman berikutnya"
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Berikutnya
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
