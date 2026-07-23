"use client";

import { useEffect, useState, useCallback } from "react";
import { getAuth } from "firebase/auth";
import {
  getWOdanTahapByPIC,
  updateTahapProduksi,
  getProducts,
  TAHAP_CONFIG,
  URUTAN_TAHAP,
  type WorkOrder,
  type TahapProduksi,
  type TahapId,
  type TahapStatus,
} from "@/lib/firestore";
import { TAHAP_STATUS_CFG } from "@/components/work-order/work-order-shared";
import { cn } from "@/lib/utils";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Save,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TIPE LOKAL
// ─────────────────────────────────────────────────────────────────────────────

type WODenganTahap = WorkOrder & { tahap: TahapProduksi[] };

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN: STEPPER ALUR TAHAP (visual Potong→Jahit→...→Packing)
// ─────────────────────────────────────────────────────────────────────────────

function StepperTahap({ tahapList }: { tahapList: TahapProduksi[] }) {
  const byId: Record<string, TahapProduksi> = {};
  tahapList.forEach((t) => {
    byId[t.tahap] = t;
  });

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {URUTAN_TAHAP.map((tahapId, idx) => {
        const tahap = byId[tahapId];
        const status = tahap?.status ?? "belum_mulai";
        const cfg = TAHAP_STATUS_CFG[status];
        const Icon = cfg.icon;
        const isLast = idx === URUTAN_TAHAP.length - 1;

        return (
          <div key={tahapId} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all",
                  status === "selesai" && "bg-emerald-500 border-emerald-500",
                  status === "berlangsung" &&
                    "bg-blue-500 border-blue-500 ring-2 ring-blue-200",
                  status === "ada_masalah" && "bg-red-500 border-red-500",
                  status === "belum_mulai" && "bg-muted border-border"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    status === "belum_mulai"
                      ? "text-muted-foreground"
                      : "text-white"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium w-12 text-center leading-tight",
                  cfg.warna
                )}
              >
                {TAHAP_CONFIG[tahapId].labelPendek}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-6 mx-0.5 mb-4 flex-shrink-0 transition-colors",
                  status === "selesai" ? "bg-emerald-400" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN: FORM UPDATE SATU TAHAP
// ─────────────────────────────────────────────────────────────────────────────

function FormUpdateTahap({
  woId,
  tahap,
  picId,
  onSelesai,
}: {
  woId: string;
  tahap: TahapProduksi;
  picId: string;
  onSelesai: () => void;
}) {
  const [jumlahSelesai, setJumlahSelesai] = useState(
    String(tahap.jumlahSelesai || 0)
  );
  const [jumlahCacat, setJumlahCacat] = useState(
    String(tahap.jumlahCacat || 0)
  );
  const [catatan, setCatatan] = useState(tahap.catatanKendala || "");
  const [statusBaru, setStatusBaru] = useState<TahapStatus>(tahap.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selesai = Number(jumlahSelesai);
  const cacat = Number(jumlahCacat);
  const masuk = tahap.jumlahMasuk;
  const sisaProses = masuk - selesai - cacat;

  async function handleSimpan() {
    if (isNaN(selesai) || selesai < 0) {
      setError("Jumlah selesai tidak valid.");
      return;
    }
    if (isNaN(cacat) || cacat < 0) {
      setError("Jumlah cacat tidak valid.");
      return;
    }
    if (selesai + cacat > masuk) {
      setError(`Total (${selesai + cacat}) melebihi jumlah masuk (${masuk}).`);
      return;
    }
    if (statusBaru === "ada_masalah" && !catatan.trim()) {
      setError("Isi catatan kendala jika ada masalah.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateTahapProduksi(woId, tahap.tahap, {
        jumlahSelesai: selesai,
        jumlahCacat: cacat,
        catatanKendala: catatan,
        status: statusBaru,
        picId,
      });
      onSelesai();
    } catch (e: any) {
      setError(e.message ?? "Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500";

  return (
    <div className="space-y-4 pt-3">
      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Ringkasan masuk */}
      <div className="rounded-xl bg-muted/50 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Jumlah Masuk Tahap Ini
          </p>
          <p className="text-2xl font-bold">
            {masuk.toLocaleString("id-ID")}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              pcs
            </span>
          </p>
        </div>
        {sisaProses >= 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Sisa diproses</p>
            <p
              className={cn(
                "text-lg font-semibold",
                sisaProses > 0 ? "text-amber-600" : "text-emerald-600"
              )}
            >
              {sisaProses} pcs
            </p>
          </div>
        )}
      </div>

      {/* Input jumlah selesai */}
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wide">
          Jumlah Selesai (pcs)
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={masuk}
          value={jumlahSelesai}
          onChange={(e) => setJumlahSelesai(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Input cacat */}
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wide">
          Jumlah Cacat / Reject (pcs)
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={jumlahCacat}
          onChange={(e) => setJumlahCacat(e.target.value)}
          className={inputCls}
        />
      </div>

      {/* Status tahap */}
      <div>
        <label className="block text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">
          Status Tahap Ini
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            ["berlangsung", "selesai", "ada_masalah"] as TahapStatus[]
          ).map((s) => {
            const cfg = TAHAP_STATUS_CFG[s];
            const Icon = cfg.icon;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusBaru(s)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                  statusBaru === s
                    ? s === "ada_masalah"
                      ? "border-red-400 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-300"
                      : s === "selesai"
                      ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300"
                      : "border-blue-400 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    statusBaru === s ? cfg.warna : "text-muted-foreground"
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    statusBaru === s ? cfg.warna : "text-muted-foreground"
                  )}
                >
                  {cfg.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Catatan kendala */}
      <div>
        <label className="block text-xs font-medium mb-1.5 text-muted-foreground uppercase tracking-wide">
          Catatan Kendala{" "}
          {statusBaru === "ada_masalah" && (
            <span className="text-red-500">*</span>
          )}
        </label>
        <textarea
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          rows={2}
          placeholder="Tulis kendala atau catatan jika ada..."
          className={cn(inputCls, "resize-none text-sm")}
        />
      </div>

      {/* Tombol simpan */}
      <button
        onClick={handleSimpan}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#003247] py-4 text-sm font-semibold text-white hover:bg-[#004a6e] active:scale-[0.98] transition-all disabled:opacity-60"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" /> Simpan Progress
          </>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KOMPONEN: KARTU SATU WO (bisa expand untuk lihat/update tahap)
// ─────────────────────────────────────────────────────────────────────────────

function KartuWO({
  wo,
  products,
  picId,
  onRefresh,
}: {
  wo: WODenganTahap;
  products: Record<string, string>;
  picId: string;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tahapAktif, setTahapAktif] = useState<TahapId | null>(null);

  const namaProduk = products[wo.productId] ?? wo.productId;

  const tahapSelesai = wo.tahap.filter((t) => t.status === "selesai").length;
  const totalTahap = URUTAN_TAHAP.length;
  const semuaSelesai =
    wo.tahap.length > 0 && wo.tahap.every((t) => t.status === "selesai");
  const adaMasalah = wo.tahap.some((t) => t.status === "ada_masalah");

  // Progress pcs dari tahap packing (output akhir)
  const packingTahap = wo.tahap.find((t) => t.tahap === "packing");
  const pctPacking =
    wo.jumlahTarget > 0
      ? Math.round(
          ((packingTahap?.jumlahSelesai ?? 0) / wo.jumlahTarget) * 100
        )
      : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card overflow-hidden transition-all",
        adaMasalah ? "border-red-300 dark:border-red-800" : "border-border"
      )}
    >
      {/* Header kartu */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-semibold text-[#003247]">
                {wo.nomor}
              </span>
              {adaMasalah && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-2.5 w-2.5" /> Ada Masalah
                </span>
              )}
              {semuaSelesai && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                </span>
              )}
            </div>
            <p className="text-sm font-semibold truncate">{namaProduk}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Target: {wo.tanggalTarget} ·{" "}
              {wo.jumlahTarget.toLocaleString("id-ID")} pcs
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Counter tahap */}
            <div className="text-right">
              <p className="text-lg font-bold leading-none">
                {tahapSelesai}/{totalTahap}
              </p>
              <p className="text-[10px] text-muted-foreground">tahap</p>
            </div>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Stepper visual */}
        {wo.tahap.length > 0 && (
          <div className="mt-3">
            <StepperTahap tahapList={wo.tahap} />
          </div>
        )}

        {/* Progress bar output packing */}
        {pctPacking > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Output packing</span>
              <span>{pctPacking}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#003247] transition-all"
                style={{ width: `${pctPacking}%` }}
              />
            </div>
          </div>
        )}
      </button>

      {/* Detail tahap (expanded) */}
      {expanded && (
        <div className="border-t border-border">
          {wo.tahap.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tahap produksi belum diinisialisasi.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hubungi manajer untuk mengaktifkan WO ini.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {wo.tahap.map((tahap) => {
                const cfg = TAHAP_STATUS_CFG[tahap.status];
                const Icon = cfg.icon;
                const isAktif = tahapAktif === tahap.tahap;
                const bisaUpdate =
                  tahap.status === "berlangsung" ||
                  tahap.status === "ada_masalah";

                return (
                  <div
                    key={tahap.tahap}
                    className={cn(
                      "px-4 py-3 transition-colors",
                      tahap.status === "belum_mulai" && "opacity-50"
                    )}
                  >
                    {/* Header baris tahap */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon
                          className={cn("h-4 w-4 flex-shrink-0", cfg.warna)}
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {TAHAP_CONFIG[tahap.tahap].label}
                          </p>
                          {tahap.jumlahMasuk > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {tahap.jumlahSelesai}/{tahap.jumlahMasuk} selesai
                              {tahap.jumlahCacat > 0 &&
                                ` · ${tahap.jumlahCacat} cacat`}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            "text-[10px] font-medium rounded-full px-2 py-0.5",
                            cfg.bg,
                            cfg.warna
                          )}
                        >
                          {cfg.label}
                        </span>
                        {bisaUpdate && (
                          <button
                            onClick={() =>
                              setTahapAktif(isAktif ? null : tahap.tahap)
                            }
                            className={cn(
                              "text-xs rounded-lg px-3 py-1.5 border font-medium transition-colors",
                              isAktif
                                ? "bg-muted border-border"
                                : "bg-[#003247] text-white border-[#003247]"
                            )}
                          >
                            {isAktif ? "Tutup" : "Update"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Catatan kendala */}
                    {tahap.catatanKendala && (
                      <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          {tahap.catatanKendala}
                        </p>
                      </div>
                    )}

                    {/* Form update inline */}
                    {isAktif && bisaUpdate && (
                      <FormUpdateTahap
                        woId={wo.id!}
                        tahap={tahap}
                        picId={picId}
                        onSelesai={() => {
                          setTahapAktif(null);
                          onRefresh();
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HALAMAN UTAMA — PROGRESS PIC
// ─────────────────────────────────────────────────────────────────────────────

export default function ProgressPICPage() {
  const [woDanTahap, setWoDanTahap] = useState<WODenganTahap[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [picId, setPicId] = useState<string | null>(null);
  const [picNama, setPicNama] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Ambil UID user yang sedang login
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setPicId(user.uid);
      setPicNama(user.displayName ?? user.email ?? "");
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!picId) return;
    setLoading(true);
    try {
      const [woList, prodList] = await Promise.all([
        getWOdanTahapByPIC(picId).catch((e) => {
          console.error(e);
          return [];
        }),
        getProducts().catch(() => []),
      ]);
      setWoDanTahap(woList);

      // Buat map productId → nama produk
      const map: Record<string, string> = {};
      prodList.forEach((p: any) => {
        if (p.id) map[p.id] = p.nama;
      });
      setProducts(map);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [picId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pisahkan WO: yang ada masalah naik ke atas, selesai ke bawah
  const woAktif = woDanTahap.filter((wo) => wo.status !== "selesai");
  const woSelesai = woDanTahap.filter((wo) => wo.status === "selesai");
  const adaMasalah = woAktif.filter((wo) =>
    wo.tahap.some((t) => t.status === "ada_masalah")
  );
  const normal = woAktif.filter(
    (wo) => !wo.tahap.some((t) => t.status === "ada_masalah")
  );
  const woUrut = [...adaMasalah, ...normal, ...woSelesai];

  const jamRefresh = lastRefresh.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (loading && woDanTahap.length === 0)
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#003247]" />
          <p className="text-sm text-muted-foreground">
            Memuat work order kamu...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header sticky ── */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-bold">Progress Produksi</h1>
            {picNama && (
              <p className="text-xs text-muted-foreground">{picNama}</p>
            )}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            {jamRefresh}
          </button>
        </div>

        {/* Ringkasan cepat */}
        {!loading && (
          <div className="flex gap-3 mt-3">
            <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-bold">{woAktif.length}</p>
              <p className="text-[10px] text-muted-foreground">WO Aktif</p>
            </div>
            <div
              className={cn(
                "flex-1 rounded-xl px-3 py-2 text-center",
                adaMasalah.length > 0
                  ? "bg-red-100 dark:bg-red-950/40"
                  : "bg-muted/50"
              )}
            >
              <p
                className={cn(
                  "text-lg font-bold",
                  adaMasalah.length > 0 && "text-red-700 dark:text-red-400"
                )}
              >
                {adaMasalah.length}
              </p>
              <p
                className={cn(
                  "text-[10px]",
                  adaMasalah.length > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                )}
              >
                Ada Masalah
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-muted/50 px-3 py-2 text-center">
              <p className="text-lg font-bold text-emerald-600">
                {woSelesai.length}
              </p>
              <p className="text-[10px] text-muted-foreground">Selesai</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Daftar WO ── */}
      <div className="px-4 py-4 space-y-3 pb-10">
        {woUrut.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Tidak ada WO yang ditugaskan
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hubungi manajer jika ada WO baru
            </p>
          </div>
        ) : (
          woUrut.map((wo) => (
            <KartuWO
              key={wo.id}
              wo={wo}
              products={products}
              picId={picId!}
              onRefresh={loadData}
            />
          ))
        )}
      </div>
    </div>
  );
}
