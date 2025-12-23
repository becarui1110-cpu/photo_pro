export const runtime = "edge";

type Ok = { ok: true; dataUrl: string };
type Fail = { ok: false; error: string; debug?: string };

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

async function safeReadJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    // pas du JSON (HTML / texte)
    return { __raw: text.slice(0, 500) };
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return json({ ok: false, error: "OPENAI_API_KEY manquant (Vercel env)." }, 500);

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
      return json({ ok: false, error: "Image trop lourde (max ~12MB)." }, 400);
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
    out.append("output_format", "png");
    out.append("input_fidelity", "high");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: out,
    });

    const data = (await safeReadJson(res)) as any;

    if (!res.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        (typeof data?.__raw === "string" ? data.__raw : null) ||
        "Erreur OpenAI (images/edits).";

      return json({ ok: false, error: msg, debug: `OpenAI status=${res.status}` }, 500);
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return json(
        { ok: false, error: "Réponse OpenAI invalide (pas d'image).", debug: JSON.stringify(data).slice(0, 500) },
        500
      );
    }

    return json({ ok: true, dataUrl: `data:image/png;base64,${b64}` }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ ok: false, error: message }, 500);
  }
}
