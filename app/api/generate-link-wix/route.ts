// app/api/generate-link-wix/route.ts
export const runtime = "edge";

const encoder = new TextEncoder();

/** Convertit ArrayBuffer → base64url */
function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Génère le token signé, valable `minutes` minutes */
async function makeToken(secret: string, minutes: number) {
  const expiresAt = Date.now() + minutes * 60 * 1000;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(expiresAt))
  );
  const signature = toBase64Url(sigBuf);

  return `${expiresAt}.${signature}`;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      // ✅ Wix détecte mieux avec charset
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return json({ ok: true }, 200);
}

function resolveSiteUrl() {
  return (process.env.SITE_URL || "https://ltr.dreem.ch").replace(/\/$/, "");
}

function resolveDurationMinutes(value: unknown, fallback = 360) {
  const val = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : fallback;
}

async function buildLink(durationMinutes: number) {
  const tokenSecret = process.env.TOKEN_SECRET;
  if (!tokenSecret) {
    return { error: "TOKEN_SECRET missing in Vercel", status: 500 as const };
  }

  const siteUrl = resolveSiteUrl();
  const token = await makeToken(tokenSecret, durationMinutes);
  const link = `${siteUrl}/?token=${encodeURIComponent(token)}`;

  return { link, durationMinutes, status: 200 as const };
}

/** ✅ GET: /api/generate-link-wix?duration=360 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const durationMinutes = resolveDurationMinutes(
    searchParams.get("duration"),
    360
  );

  const result = await buildLink(durationMinutes);
  if ("error" in result) return json({ ok: false, error: result.error }, result.status);

  // ✅ Solution 1: doubler le lien dans `result`
  return json(
    {
      ok: true,
      link: result.link,
      result: result.link, // 👈 Wix va souvent plus facilement mapper "result"
      durationMinutes: result.durationMinutes,
    },
    result.status
  );
}

/** ✅ POST: { "duration": 360 } */
export async function POST(req: Request) {
  let durationMinutes = 360;

  try {
    const body = (await req.json()) as { duration?: number | string };
    durationMinutes = resolveDurationMinutes(body?.duration, 360);
  } catch {
    // keep default
  }

  const result = await buildLink(durationMinutes);
  if ("error" in result) return json({ ok: false, error: result.error }, result.status);

  // ✅ Solution 1: doubler le lien dans `result`
  return json(
    {
      ok: true,
      link: result.link,
      result: result.link, // 👈 Wix va souvent plus facilement mapper "result"
      durationMinutes: result.durationMinutes,
    },
    result.status
  );
}
