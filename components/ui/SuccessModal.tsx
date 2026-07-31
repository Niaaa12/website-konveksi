import { CheckCircle2 } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export function SuccessModal({
  isOpen,
  title = "Berhasil!",
  message,
  onClose,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      {/* Animasi sederhana agar modal muncul dengan efek zoom kecil */}
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Ikon Centang Hijau */}
          <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>

          {/* Teks */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {message}
            </p>
          </div>

          {/* Tombol Tutup */}
          <button
            onClick={onClose}
            className="mt-2 w-full rounded-xl bg-[#003247] py-2.5 text-sm font-semibold text-white hover:bg-[#004a6e] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
