"use client";

import { useState } from "react";

export default function AdminPanelPage() {
  const [link, setLink] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/generate-link?duration=${minutes}`);
      if (!res.ok) throw new Error("Erreur lors de la génération du lien");
      const data = (await res.json()) as { link: string };
      setLink(data.link);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
      <div className="bg-slate-900/60 p-8 rounded-2xl max-w-lg w-full space-y-4 shadow-xl">
        <h1 className="text-2xl font-bold text-center">🎟️ Générer un lien d’accès</h1>

        <div className="flex items-center gap-2 justify-center">
          <label className="text-slate-300">Durée (minutes)</label>
          <input
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            type="number"
            min={1}
            className="bg-slate-800 rounded px-3 py-1 w-24 text-right"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={generate}
            disabled={loading}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Génération..." : "Générer le lien"}
          </button>
        </div>

        {error && (
          <div className="bg-red-600/40 p-2 rounded text-sm text-red-100 text-center">
            {error}
          </div>
        )}

        {link && (
          <div className="bg-slate-800 p-3 rounded break-all text-sm">
            <p className="text-slate-400 mb-1">Lien généré :</p>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 underline break-all"
            >
              {link}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
