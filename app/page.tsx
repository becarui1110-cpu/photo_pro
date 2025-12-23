// app/page.tsx
"use client";

import { useMemo, useRef, useState } from "react";

type ApiResult = { ok: true; dataUrl: string } | { ok: false; error: string };

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [beforeUrl, setBeforeUrl] = useState<string>("");
  const [afterUrl, setAfterUrl] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Options simples (facultatif)
  const [background, setBackground] = useState("studio neutral light gray");
  const [style, setStyle] = useState("clean corporate headshot");

  const canRun = useMemo(() => !!file && !loading, [file, loading]);

  function onPick(f: File | null) {
    setError("");
    setAfterUrl("");
    setFile(f);
    if (!f) {
      setBeforeUrl("");
      return;
    }
    const url = URL.createObjectURL(f);
    setBeforeUrl(url);
  }

  async function run() {
    if (!file) return;
    try {
      setLoading(true);
      setError("");
      setAfterUrl("");

      const fd = new FormData();
      fd.append("image", file);
      fd.append("background", background);
      fd.append("style", style);

      const res = await fetch("/api/photo-pro", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as ApiResult;
      if (!res.ok || !data.ok) {
        throw new Error(!data.ok ? data.error : "Erreur API");
      }

      setAfterUrl(data.dataUrl);
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
                className="h-8 w-auto object-contain"
                style={{ display: "block" }}
              />
            </a>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">
                Photo Pro • Agent IA
              </p>
              <p className="text-sm sm:text-base font-semibold truncate">
                Transforme ta photo en <span className="text-emerald-300">photo professionnelle</span>
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-2.5 py-1 text-[11px] border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Prêt
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LEFT: upload */}
          <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold">1) Ta photo</h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0] ?? null;
                if (f) onPick(f);
              }}
              className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-4 text-center"
            >
              <p className="text-sm text-slate-300">
                Glisse une image ici, ou{" "}
                <button
                  className="underline text-emerald-300"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
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

            {/* Options prompt (safe) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Background</label>
                <input
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Style</label>
                <input
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <button
              onClick={run}
              disabled={!canRun}
              className="w-full rounded-lg bg-emerald-400 text-slate-950 font-semibold py-2 disabled:opacity-50 hover:bg-emerald-300 transition"
            >
              {loading ? "Transformation..." : "Générer la photo pro"}
            </button>

            {error && (
              <div className="bg-red-600/30 border border-red-700/40 rounded-lg p-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>

          {/* RIGHT: result */}
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

            <p className="text-xs text-slate-500">
              Astuce : utilise une photo bien éclairée, visage visible, sans filtre.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
