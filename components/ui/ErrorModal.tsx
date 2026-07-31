import { XCircle } from "lucide-react";

interface ErrorModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

export function ErrorModal({
  isOpen,
  title = "Terjadi Kesalahan!",
  message,
  onClose,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Ikon Silang Merah */}
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
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
            className="mt-2 w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
