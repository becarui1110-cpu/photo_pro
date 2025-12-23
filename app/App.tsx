// app/App.tsx (LTR)
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatKitPanel, type FactAction } from "@/components/ChatKitPanel";
import { useColorScheme } from "@/hooks/useColorScheme";

const MAX_ANSWERS = 5;
const MIN_MS_BETWEEN_COUNTS = 1200;

const NEW_ACCESS_URL =
  "https://www.dreem.ch/product-page/discutez-avec-un-conseiller-du-travail-ia";

function clampRemaining(n: number) {
  if (!Number.isFinite(n)) return MAX_ANSWERS;
  return Math.max(0, Math.min(MAX_ANSWERS, Math.floor(n)));
}

function getTokenFromUrl(): string {
  if (typeof window === "undefined") return "no-window";
  const sp = new URLSearchParams(window.location.search);
  return sp.get("token") ?? "no-token";
}

export default function App() {
  const { scheme, setScheme } = useColorScheme();

  const [hydrated, setHydrated] = useState(false);
  const [ready, setReady] = useState(false);

  const [remaining, setRemaining] = useState<number>(MAX_ANSWERS);
  const [blocked, setBlocked] = useState(false);

  const ignoredFirstEndRef = useRef(false);
  const lastCountAtRef = useRef(0);
  const storageKeyRef = useRef<string>("");

  const handleWidgetAction = useCallback(async (action: FactAction) => {
    if (process.env.NODE_ENV !== "production") {
      console.info("[ChatKitPanel][LTR] widget action", action);
    }
  }, []);

  // 1) Charger quota depuis localStorage avant de monter ChatKit
  useEffect(() => {
    const token = getTokenFromUrl();
    const key = `ltr_quota_remaining:${token}`;
    storageKeyRef.current = key;

    const raw = window.localStorage.getItem(key);
    const restored = raw == null ? MAX_ANSWERS : clampRemaining(Number(raw));

    if (raw == null) {
      window.localStorage.setItem(key, String(MAX_ANSWERS));
    }

    setRemaining(restored);
    setBlocked(restored <= 0);

    window.dispatchEvent(
      new CustomEvent<{ remaining: number }>("ltr-quota-update", {
        detail: { remaining: restored },
      })
    );

    setHydrated(true);
  }, []);

  const persistRemaining = useCallback((value: number) => {
    const key = storageKeyRef.current;
    if (!key) return;
    window.localStorage.setItem(key, String(value));
  }, []);

  // 2) Décrémenter quota à la fin de la réponse (garde-fous)
  const handleResponseEnd = useCallback(() => {
    // ignore greeting
    if (!ignoredFirstEndRef.current) {
      ignoredFirstEndRef.current = true;
      return;
    }

    const now = Date.now();
    if (now - lastCountAtRef.current < MIN_MS_BETWEEN_COUNTS) return;
    lastCountAtRef.current = now;

    setRemaining((prev) => {
      const next = Math.max(prev - 1, 0);

      persistRemaining(next);

      window.dispatchEvent(
        new CustomEvent<{ remaining: number }>("ltr-quota-update", {
          detail: { remaining: next },
        })
      );

      if (next <= 0) setBlocked(true);
      return next;
    });
  }, [persistRemaining]);

  // 3) Ready (petit délai UI)
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Tant que quota pas chargé, on ne monte pas ChatKitPanel
  if (!hydrated) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950/40">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Chargement de l’accès…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 relative">
      {/* Bandeau quota */}
      <div className="px-3 py-1 text-[11px] text-slate-400 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center">
        <span>Session LTR Dreem</span>
        <span>
          Réponses restantes :{" "}
          <span
            className={
              remaining <= 1
                ? "text-amber-300 font-semibold"
                : "text-emerald-300 font-semibold"
            }
          >
            {remaining}
          </span>{" "}
          / {MAX_ANSWERS}
        </span>
      </div>

      {/* Zone chat */}
      <div className="flex-1 relative min-h-0">
        {ready ? (
          <>
            <ChatKitPanel
              theme={scheme}
              onWidgetAction={handleWidgetAction}
              onResponseEnd={handleResponseEnd}
              onThemeRequest={setScheme}
            />

            {/* ✅ Blocage saisie, bouton cliquable */}
            {blocked && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0">
                {/* fondu */}
                <div className="h-16 bg-gradient-to-t from-slate-950/95 to-transparent" />

                {/* panneau (cliquable) */}
                <div className="pointer-events-auto bg-slate-950/95 border-t border-slate-800 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-100">
                    Quota atteint
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vous pouvez continuer à lire la conversation, mais vous ne
                    pouvez plus poser de question avec ce lien.
                  </p>

                  <a
                    href={NEW_ACCESS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-950 text-xs font-medium px-4 py-2 hover:bg-white/90 transition"
                  >
                    Demander un nouvel accès
                  </a>
                </div>

                {/* couche qui bloque uniquement la zone input (NON cliquable ailleurs) */}
                <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-28 cursor-not-allowed" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-slate-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-400">
                Initialisation du conseiller…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
