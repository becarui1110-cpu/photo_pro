export const runtime = "edge";

type Ok = { ok: true; dataUrl: string };
type Fail = { ok: false; error: string };

function json(payload: Ok | Fail, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function clampText(input: FormDataEntryValue | null, maxLen: number) {
  const s = typeof input === "string" ? input.trim() : "";
  return s ? s.slice(0, maxLen) : "";
}

// ArrayBuffer -> base64 (Edge-safe)
function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json({ ok: false, error: "GEMINI_API_KEY manquant" }, 500);

    const model = (process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image").trim();

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

    const background =
      clampText(form.get("background"), 120) || "studio neutral light gray";
    const style = clampText(form.get("style"), 120) || "clean corporate headshot";

    const prompt =
      `Transform this image into a professional headshot photograph.\n` +
      `Keep the same person and preserve identity (face, age, ethnicity).\n` +
      `Improve lighting, correct white balance, reduce noise, subtle skin retouch, sharp eyes.\n` +
      `Wardrobe: business casual, neat.\n` +
      `Background: ${background}.\n` +
      `Style: ${style}.\n` +
      `Do NOT add accessories, do NOT change hair dramatically, do NOT change gender/age.\n` +
      `Return an image.`;

    const b64 = arrayBufferToBase64(await image.arrayBuffer());

    // REST: generateContent with text + inlineData (image editing)
    // Endpoint + modèle d’après la doc Gemini API Nano Banana  [oai_citation:2‡Google AI for Developers](https://ai.google.dev/gemini-api/docs/image-generation)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.type || "image/png",
                data: b64,
              },
            },
          ],
        },
      ],
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: GeminiResponse | null = null;
    try {
      data = JSON.parse(text) as GeminiResponse;
    } catch {
      // si Google renvoie autre chose (rare), on remonte le texte
      if (!res.ok) return json({ ok: false, error: `Erreur Gemini: ${text}` }, 500);
      return json({ ok: false, error: "Réponse Gemini non-JSON inattendue." }, 500);
    }

    if (!res.ok) {
      const msg = data?.error?.message || `Erreur Gemini (HTTP ${res.status})`;
      return json({ ok: false, error: msg }, 500);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(
      (p): p is { inlineData: { mimeType: string; data: string } } =>
        typeof (p as any)?.inlineData?.data === "string"
    );

    if (!imgPart?.inlineData?.data) {
      return json({
        ok: false,
        error: "Gemini n’a pas renvoyé d’image (inlineData manquant).",
      }, 500);
    }

    // En pratique Gemini renvoie souvent image/png
    const mime = imgPart.inlineData.mimeType || "image/png";
    return json({ ok: true, dataUrl: `data:${mime};base64,${imgPart.inlineData.data}` }, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return json({ ok: false, error: message }, 500);
  }
}
