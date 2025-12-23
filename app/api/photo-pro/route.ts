// app/api/photo-pro/route.ts
export const runtime = "nodejs";

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clampText(input: string, maxLen = 120) {
  return String(input || "").slice(0, maxLen).trim();
}

export async function POST(req: Request) {
  try {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return json({ ok: false, error: "OPENAI_API_KEY manquant" }, 500);

    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File)) {
      return json({ ok: false, error: "Aucune image reçue (champ 'image')" }, 400);
    }

    const background = clampText(String(form.get("background") || "studio neutral light gray"));
    const style = clampText(String(form.get("style") || "clean corporate headshot"));

    // ✅ PROMPT SERVEUR (le plus important)
    const prompt = [
      "Transform this into a professional corporate headshot.",
      "Preserve identity and facial features (do not change the person).",
      "Natural skin texture, subtle retouch, realistic lighting, sharp focus.",
      `Background: ${background}.`,
      `Style: ${style}.`,
      "Remove clutter, remove harsh shadows, improve exposure and white balance.",
      "No watermark, no text, no artifacts.",
      "Output: photorealistic, high quality."
    ].join(" ");

    // On utilise l’endpoint images/edits (image + prompt)
    const fd = new FormData();
    fd.append("model", "gpt-image-1");
    fd.append("prompt", prompt);
    fd.append("image", image, image.name || "input.png");
    fd.append("size", "1024x1024");

    const resp = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });

    const data = (await resp.json()) as any;

    if (!resp.ok) {
      const msg = data?.error?.message || "Erreur OpenAI";
      return json({ ok: false, error: msg }, 500);
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return json({ ok: false, error: "Aucune image retournée" }, 500);

    const dataUrl = `data:image/png;base64,${b64}`;
    return json({ ok: true, dataUrl });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
}
