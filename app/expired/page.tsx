export default function ExpiredPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-4">
      <div className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center shadow-[0_0_40px_-10px_rgba(0,0,0,0.6)] animate-fadeIn space-y-6">
        
        {/* ICON */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg
              className="h-8 w-8 text-red-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 110 20 10 10 0 010-20z"
              />
            </svg>
          </div>
        </div>

        {/* TITLE */}
        <h1 className="text-2xl font-bold tracking-tight">Lien expiré</h1>

        {/* MESSAGE */}
        <p className="text-slate-300 leading-relaxed">
          Ce lien d’accès n’est plus valide.  
          Pour continuer à utiliser votre conseiller en droit du travail,
          veuillez générer un nouveau lien sécurisé.
        </p>

        {/* BUTTON */}
        <a
          href="https://dreem.ch"
          className="inline-flex items-center justify-center rounded-xl bg-white text-slate-950 px-5 py-2.5 text-sm font-medium shadow hover:bg-slate-200 transition"
        >
          Retourner sur Dreem.ch
        </a>

        {/* SUBTEXT */}
        <p className="text-xs text-slate-500 mt-3">
          Mesure de sécurité active — vos données restent protégées.
        </p>
      </div>

      {/* ANIMATION KEYFRAMES */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
