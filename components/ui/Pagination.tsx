import React from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card">
      {/* Teks Informasi Dinamis */}
      <p className="text-xs text-muted-foreground">
        Menampilkan{" "}
        <span className="font-medium text-foreground">{startItem}</span> –{" "}
        <span className="font-medium text-foreground">{endItem}</span> dari{" "}
        <span className="font-medium text-foreground">{totalItems}</span> data
      </p>

      {/* Tombol Navigasi */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Sebelumnya
        </button>

        <span className="text-xs text-muted-foreground px-2">
          Halaman{" "}
          <span className="font-semibold text-foreground">{currentPage}</span>{" "}
          dari {totalPages || 1}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
