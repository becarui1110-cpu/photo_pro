// app/api/photo-pro/route.ts
export const runtime = "edge";

type Ok = { ok: true; dataUrl: string };
type Err = { ok: false; error: string };
type ApiResult = Ok | Err;

function json(payload: ApiResult, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST,OPTIONS",
      "access-control-allow-headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return json({ ok: true, dataUrl: "" }, 200);
}

// Petit helper: lit un File -> base64 dataUrl (utile pour afficher côté client)
async function fileToDataUrl(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return `data:${file.type || "image/png"};base64,${b64}`;
}

export async function POST(req: Request) {
  try {
    const fd = await req.formData();

    const image = fd.get("image");
    const background = String(fd.get("background") ?? "");
    const style = String(fd.get("style") ?? "");

    if (!(image instanceof File)) {
      return json({ ok: false, error: "Fichier image manquant." }, 400);
    }

    // ✅ Pour l’instant: renvoie l’image en dataUrl (pipeline OK)
    // Ensuite on branchera l’appel Nano Banana / OpenAI ici.
    // (Comme ça tu débloques Vercel + tu testes l’UI end-to-end)
    const dataUrl = await fileToDataUrl(image);

    // TODO: ici tu remplaceras dataUrl par le résultat généré par l’IA
    // en utilisant background + style dans ton prompt.
    void background;
    void style;

    return json({ ok: true, dataUrl }, 200);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ ok: false, error: message }, 500);
  }
}
