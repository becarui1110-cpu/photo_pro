"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ApiOk = { ok: true; dataUrl: string };
type ApiFail = { ok: false; error: string };
type ApiResult = ApiOk | ApiFail;

const BUY_LINK = "https://dreem.ch"; // ✅ mets ici ton futur lien produit quand prêt
const MAX_RUNS = 1;

function getTokenFromUrl(): string {
  if (typeof window === "undefined") return "no-window";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("token") ?? "no-token";
}

function storageKey(token: string) {
  return `photo_pro_runs_used:${token}`;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

async function readJsonOrText(res: Response): Promise<{ json?: unknown; text?: string }> {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return { json: await res.json() };
    } catch {
      // fallback
    }
  }
  try {
    return { text: await res.text() };
  } catch {
    return {};
  }
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [token, setToken] = useState<string>("no-token");
  const [runsUsed, setRunsUsed] = useState<number>(0);

  const [file, setFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [afterUrl, setAfterUrl] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [background, setBackground] = useState("studio neutral light gray");
  const [style, setStyle] = useState("clean corporate headshot");

  const remaining = useMemo(() => Math.max(0, MAX_RUNS - runsUsed), [runsUsed]);
  const blocked = remaining <= 0;

  const canPick = useMemo(() => !loading && !blocked, [loading, blocked]);
  const canRun = useMemo(() => !!file && !loading && !blocked, [file, loading, blocked]);

  // ✅ hydrate runsUsed depuis localStorage (persistant après refresh)
  useEffect(() => {
    const t = getTokenFromUrl();
    setToken(t);

    const key = storageKey(t);
    const raw = window.localStorage.getItem(key);
    const restored = raw == null ? 0 : clampInt(Number(raw), 0, MAX_RUNS);

    if (raw == null) {
      window.localStorage.setItem(key, String(0));
    }

    setRunsUsed(restored);
  }, []);

  function persistRunsUsed(next: number) {
    const key = storageKey(token);
    window.localStorage.setItem(key, String(next));
    setRunsUsed(next);
  }

  function onPick(f: File | null) {
    if (!canPick) return;

    setError("");
    setAfterUrl("");
    setFile(f);

    if (!f) {
      setBeforeUrl("");
      return;
    }

    // refresh preview
    const url = URL.createObjectURL(f);
    setBeforeUrl(url);
  }

  async function run() {
    if (!file || !canRun) return;

    try {
      setLoading(true);
      setError("");
      setAfterUrl("");

      const fd = new FormData();
      fd.append("image", file);
      fd.append("background", background);
      fd.append("style", style);

      const res = await fetch("/api/photo-pro", { method: "POST", body: fd });
      const parsed = await readJsonOrText(res);

      if (!res.ok) {
        const textHead = (parsed.text || "").slice(0, 180);
        throw new Error(
          `Erreur API (HTTP ${res.status}). ${
            textHead ? `Début: ${textHead}` : "Réponse non JSON."
          }`
        );
      }

      if (!parsed.json) {
        const textHead = (parsed.text || "").slice(0, 180);
        throw new Error(
          `Réponse API non-JSON (HTTP ${res.status}). ${textHead ? `Début: ${textHead}` : ""}`
        );
      }

      const data = parsed.json as ApiResult;

      if (!data.ok) {
        throw new Error(data.error || "Erreur API");
      }

      setAfterUrl(data.dataUrl);

      // ✅ consomme 1 run et bloque ensuite
      persistRunsUsed(clampInt(runsUsed + 1, 0, MAX_RUNS));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!afterUrl) return;
    const a = document.createElement("a");
    a.href = afterUrl;
    a.download = "photo_pro.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <main className="min-h-dvh bg-slate-950 text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <a
              href="https://dreem.ch"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
              aria-label="Aller sur dreem.ch"
              title="dreem.ch"
            >
              <img
                src="/dreem_w.png"
                alt="Dreem"
                className="h-9 w-auto object-contain"
                style={{ display: "block" }}
              />
            </a>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">
                Photo Pro • Agent IA
              </p>
              <p className="text-sm sm:text-base font-semibold truncate">
                Transforme ta photo en{" "}
                <span className="text-emerald-300">photo professionnelle</span>
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-[11px] text-slate-200 border border-slate-700">
            <span className="opacity-80">Crédit :</span>
            <span className={remaining <= 0 ? "text-amber-300 font-semibold" : "text-emerald-300 font-semibold"}>
              {remaining}
            </span>
            <span className="opacity-80">/ {MAX_RUNS}</span>
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Bandeau si bloqué */}
        {blocked && (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-semibold text-amber-200">
              Crédit utilisé (1/1)
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Pour refaire une transformation, utilise l’agent Photo Pro (nouvel accès).
            </p>
            <a
              href={BUY_LINK}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-950 text-xs font-semibold px-4 py-2 hover:bg-white/90 transition"
            >
              Obtenir un nouvel accès
            </a>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold">1) Ta photo</h2>

            <div
              onDragOver={(e) => {
                if (!canPick) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (!canPick) return;
                e.preventDefault();
                const f = e.dataTransfer.files?.[0] ?? null;
                if (f) onPick(f);
              }}
              className={[
                "rounded-xl border border-dashed bg-slate-950/40 p-4 text-center transition",
                canPick ? "border-slate-700" : "border-slate-800 opacity-60 cursor-not-allowed",
              ].join(" ")}
            >
              <p className="text-sm text-slate-300">
                Glisse une image ici, ou{" "}
                <button
                  className={canPick ? "underline text-emerald-300" : "underline text-slate-500"}
                  onClick={() => {
                    if (!canPick) return;
                    fileInputRef.current?.click();
                  }}
                  type="button"
                  disabled={!canPick}
                >
                  choisis un fichier
                </button>
              </p>
              <p className="text-xs text-slate-500 mt-1">PNG / JPG conseillé</p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!canPick}
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />

              {beforeUrl && (
                <div className="mt-4">
                  <img
                    src={beforeUrl}
                    alt="Avant"
                    className="w-full max-h-[420px] object-contain rounded-xl border border-slate-800 bg-slate-950"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Background</label>
                <input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  disabled={!canPick}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Style</label>
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  disabled={!canPick}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <button
              onClick={run}
              disabled={!canRun}
              className="w-full rounded-lg bg-emerald-400 text-slate-950 font-semibold py-2 disabled:opacity-50 hover:bg-emerald-300 transition"
            >
              {loading ? "Transformation..." : blocked ? "Crédit épuisé" : "Générer la photo pro"}
            </button>

            {error && (
              <div className="bg-red-600/30 border border-red-700/40 rounded-lg p-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <p className="text-[11px] text-slate-500">
              Token: <span className="font-mono">{token}</span>
            </p>
          </section>

          {/* RIGHT */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold">2) Résultat</h2>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 min-h-[320px] flex items-center justify-center">
              {afterUrl ? (
                <img
                  src={afterUrl}
                  alt="Après"
                  className="w-full max-h-[520px] object-contain rounded-xl border border-slate-800 bg-slate-950"
                />
              ) : (
                <p className="text-sm text-slate-500 text-center">
                  Le résultat apparaîtra ici.
                </p>
              )}
            </div>

            <button
              onClick={download}
              disabled={!afterUrl}
              className="w-full rounded-lg bg-slate-100 text-slate-950 font-semibold py-2 disabled:opacity-50 hover:bg-white/90 transition"
            >
              Télécharger l’image
            </button>

            {blocked && (
              <a
                href={BUY_LINK}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center rounded-lg bg-slate-800 text-slate-100 font-semibold py-2 hover:bg-slate-700 transition"
              >
                Refaire une photo (nouvel accès)
              </a>
            )}

            <p className="text-xs text-slate-500">
              Astuce : photo bien éclairée, visage visible, sans filtre.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
