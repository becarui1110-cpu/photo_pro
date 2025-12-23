// app/api/photo-pro/route.ts
export const runtime = "nodejs";        // ✅ PAS edge
export const maxDuration = 60;          // ✅ Vercel: autorise jusqu'à 60s (selon ton plan)
export const dynamic = "force-dynamic"; // ✅ évite toute mise en cache

type Ok = { ok: true; dataUrl: string };
type Fail = { ok: false; error: string };

function json(payload: Ok | Fail, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clampText(input: unknown, maxLen: number) {
  const s = typeof input === "string" ? input.trim() : "";
  return s ? s.slice(0, maxLen) : "";
}

type OpenAIImagesEditResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: { message?: string };
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json({ ok: false, error: "OPENAI_API_KEY manquant" }, 500);

    const model = (process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();

    const form = await req.formData();
    const image = form.get("image");

    if (!(image instanceof File)) {
      return json({ ok: false, error: "Aucune image reçue (champ 'image')." }, 400);
    }
    if (!image.type.startsWith("image/")) {
      return json({ ok: false, error: "Fichier invalide: ce n'est pas une image." }, 400);
    }
    if (image.size > 12 * 1024 * 1024) {
      return json({ ok: false, error: "Image trop lourde (max ~12MB conseillé)." }, 400);
    }

    const background = clampText(form.get("background"), 120) || "studio neutral light gray";
    const style = clampText(form.get("style"), 120) || "clean corporate headshot";

    const prompt =
      `Transform this into a professional headshot photograph.\n` +
      `Keep the same person and preserve facial features/identity.\n` +
      `Improve lighting, reduce noise, correct white balance, subtle skin retouch, sharp eyes.\n` +
      `Wardrobe: business casual, neat.\n` +
      `Background: ${background}.\n` +
      `Style: ${style}.\n` +
      `Do not change age, gender, ethnicity, or add accessories.`;

    const out = new FormData();
    out.append("model", model);
    out.append("prompt", prompt);
    out.append("image", image, image.name || "input.png");
    out.append("size", "auto");
    out.append("background", "opaque");
    out.append("output_format", "png");
    out.append("input_fidelity", "high");

    // ✅ timeout côté fetch (évite de bloquer trop longtemps)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 55_000);

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: out,
      signal: controller.signal,
    }).finally(() => clearTimeout(t));

    const text = await res.text();
    let data: OpenAIImagesEditResponse;
    try {
      data = JSON.parse(text) as OpenAIImagesEditResponse;
    } catch {
      return json({ ok: false, error: `OpenAI non-JSON (status ${res.status}): ${text.slice(0, 200)}` }, 500);
    }

    if (!res.ok) {
      return json({ ok: false, error: data?.error?.message || `Erreur OpenAI (status ${res.status}).` }, 500);
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ ok: false, error: "Réponse OpenAI invalide (pas d'image)." }, 500);

    return json({ ok: true, dataUrl: `data:image/png;base64,${b64}` }, 200);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return json({ ok: false, error: "Timeout: génération trop longue. Réessaie avec une image plus légère." }, 504);
    }
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
}
