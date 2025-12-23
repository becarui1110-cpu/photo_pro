export default function ExpiredPage() {
  return (
    <main className="min-h-dvh bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <h1 className="text-xl font-bold">Accès expiré</h1>
        <p className="text-sm text-slate-300">
          Ce lien n’est pas valide (ou a expiré). Demande un nouveau lien depuis l’admin panel.
        </p>
        <a
          href="/admin-panel/login"
          className="inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-950 text-sm font-semibold px-4 py-2 hover:bg-white/90 transition"
        >
          Aller au login admin
        </a>
      </div>
    </main>
  );
}
