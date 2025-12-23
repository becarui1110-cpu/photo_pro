"use client";

import { useState } from "react";

const ADMIN_CODE = "dreem2025";

export default function AdminPanelLoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim() === ADMIN_CODE) {
      document.cookie = `admin_code=${ADMIN_CODE}; Path=/; Max-Age=${
        60 * 60 * 24
      }`;
      window.location.href = "/admin-panel";
    } else {
      setError("Code invalide");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-slate-900/60 p-6 rounded-xl space-y-4 w-full max-w-sm"
      >
        <h1 className="text-xl font-bold">Accès admin</h1>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code admin"
            type={show ? "text" : "password"}
            className="flex-1 bg-slate-800 rounded px-3 py-2 outline-none"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="bg-slate-700 px-3 rounded text-sm"
          >
            {show ? "Cacher" : "Voir"}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2 rounded"
        >
          Valider
        </button>
      </form>
    </main>
  );
}
