"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import App from "./App";

const MAX_ANSWERS = 5;

function clampRemaining(n: number) {
  if (!Number.isFinite(n)) return MAX_ANSWERS;
  return Math.max(0, Math.min(MAX_ANSWERS, Math.floor(n)));
}

function getTokenFromUrl(): string {
  if (typeof window === "undefined") return "no-window";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("token") ?? "no-token";
}

function HomeInner() {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [remaining, setRemaining] = useState<number>(MAX_ANSWERS);
  const [infoOpen, setInfoOpen] = useState(false);

  /* ===============================
     🔁 Hydratation quota
     =============================== */
  useEffect(() => {
    const token = getTokenFromUrl();
    const key = `ltr_quota_remaining:${token}`;

    const raw = window.localStorage.getItem(key);
    const restored = raw == null ? MAX_ANSWERS : clampRemaining(Number(raw));

    if (raw == null) {
      window.localStorage.setItem(key, String(MAX_ANSWERS));
    }

    setRemaining(restored);
  }, []);

  /* ===============================
     🔔 Écoute updates depuis App.tsx
     =============================== */
  useEffect(() => {
    const handler: EventListener = (event) => {
      const e = event as CustomEvent<{ remaining: number }>;
      if (typeof e.detail?.remaining === "number") {
        setRemaining(clampRemaining(e.detail.remaining));
      }
    };

    window.addEventListener("ltr-quota-update", handler);
    return () => window.removeEventListener("ltr-quota-update", handler);
  }, []);

  const progress = Math.max(0, Math.min(1, remaining / MAX_ANSWERS));

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-50 flex flex-col">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          
          {/* ✅ LOGO DREEM CLIQUABLE */}
          <a
            href="https://www.dreem.ch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <Image
              src="/dreem_w.png"
              alt="Dreem"
              width={140}
              height={40}
              priority
              className="h-8 w-auto object-contain"
            />
          </a>

          {/* Titre */}
          <div className="ml-3">
            <p className="text-sm uppercase tracking-wide text-slate-300">
              Conseiller Droit du Travail
            </p>
            <p className="text-base font-semibold">
              Agent IA Expert
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs border border-emerald-500/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Actif
            </span>

            <button
              onClick={() => setInfoOpen((v) => !v)}
              className="md:hidden rounded-lg border border-slate-700 px-3 py-1.5 text-xs bg-slate-900"
            >
              {infoOpen ? "Masquer" : "Infos"}
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 grid md:grid-cols-[1.1fr_0.55fr] gap-6">
        {/* Chat panel */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl min-h-[520px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div>
              <h1 className="text-lg font-semibold">
                Votre conseiller en droit du travail
              </h1>
              <p className="text-sm text-slate-400">
                Posez vos questions juridiques en toute confiance.
              </p>
            </div>
            <button
              onClick={() => setIsChatOpen((p) => !p)}
              className="text-xs border border-slate-700 px-3 py-1 rounded-lg bg-slate-900"
            >
              {isChatOpen ? "Masquer" : "Afficher"}
            </button>
          </div>

          <div className="flex-1 min-h-[430px] bg-slate-950/30">
            {isChatOpen ? (
              <App />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Chat masqué.
              </div>
            )}
          </div>
        </section>

        {/* Panel droit */}
        <aside className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Quota d’accès
            </h2>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-center space-y-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Réponses restantes
              </p>

              <p className="text-3xl font-mono font-semibold">
                {remaining}{" "}
                <span className="text-slate-500 text-sm">
                  / {MAX_ANSWERS}
                </span>
              </p>

              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500 origin-left"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
          Initialisation de la session…
        </div>
      }
    >
      <HomeInner />
    </Suspense>
  );
}
