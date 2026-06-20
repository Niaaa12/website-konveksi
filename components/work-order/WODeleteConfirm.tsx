"use client";

import { Loader2, Trash2 } from "lucide-react";
import type { WorkOrder } from "@/lib/firestore";

export function WODeleteConfirm({
  target,
  deleting,
  onClose,
  onConfirm,
}: {
  target: WorkOrder;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Hapus Work Order?</h3>
            <p className="text-xs text-muted-foreground">
              Tindakan ini tidak bisa dibatalkan
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Work Order <strong className="text-foreground">{target.nomor}</strong>{" "}
          dan seluruh log progress-nya akan dihapus permanen.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-muted/50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
