// app/api/photo-pro/route.ts
export const runtime = "edge";

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
  if (!s) return "";
  return s.slice(0, maxLen);
}

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

    // petites validations
    if (!image.type.startsWith("image/")) {
      return json({ ok: false, error: "Fichier invalide: ce n'est pas une image." }, 400);
    }
    if (image.size > 12 * 1024 * 1024) {
      return json({ ok: false, error: "Image trop lourde (max ~12MB conseillé)." }, 400);
    }

    const background = clampText(form.get("background"), 120) || "studio neutral light gray";
    const style = clampText(form.get("style"), 120) || "clean corporate headshot";

    // ✅ Prompt “pro headshot” (identité conservée)
    const prompt =
      `Transform this into a professional headshot photograph.\n` +
      `Keep the same person and preserve facial features/identity.\n` +
      `Improve lighting, reduce noise, correct white balance, subtle skin retouch, sharp eyes.\n` +
      `Wardrobe: business casual, neat.\n` +
      `Background: ${background}.\n` +
      `Style: ${style}.\n` +
      `Do not change age, gender, ethnicity, or add accessories.`;

    // Appel OpenAI Images Edits
    const out = new FormData();
    out.append("model", model);
    out.append("prompt", prompt);
    out.append("image", image, image.name || "input.png");

    // Paramètres utiles (selon modèle)
    out.append("size", "auto");
    out.append("background", "opaque");
    out.append("output_format", "png");
    // très important pour garder le visage (si supporté)
    out.append("input_fidelity", "high");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: out,
    });

    const data = (await res.json()) as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };

    if (!res.ok) {
      const msg = data?.error?.message || "Erreur OpenAI (images/edits).";
      return json({ ok: false, error: msg }, 500);
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ ok: false, error: "Réponse OpenAI invalide (pas d'image)." }, 500);

    return json({ ok: true, dataUrl: `data:image/png;base64,${b64}` }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ ok: false, error: message }, 500);
  }
}
