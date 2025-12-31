// app/api/generate-link-wix/route.ts
export const runtime = "edge";

const encoder = new TextEncoder();

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(signed);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      // CORS Wix
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type",
    },
  });
}

export async function OPTIONS() {
  return json({ ok: true }, 200);
}

/**
 * ✅ En prod: on FORCE SITE_URL
 * Mets dans Vercel: SITE_URL = https://photopro.dreem.ch
 */
function resolveSiteUrlStrict() {
  const envUrl = process.env.SITE_URL?.trim();
  if (!envUrl) return null;
  return envUrl.replace(/\/$/, "");
}

export async function GET(req: Request) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return json({ ok: false, error: "TOKEN_SECRET missing" }, 500);

  const siteUrl = resolveSiteUrlStrict();
  if (!siteUrl) {
    return json(
      { ok: false, error: "SITE_URL missing (ex: https://photopro.dreem.ch)" },
      500
    );
  }

  const url = new URL(req.url);
  const minutesRaw = Number(url.searchParams.get("duration") || "60");
  const minutes = Number.isFinite(minutesRaw) ? Math.max(1, minutesRaw) : 60;

  const expiresAt = Date.now() + minutes * 60 * 1000;

  const sig = await sign(secret, String(expiresAt));
  const token = `${expiresAt}.${sig}`;

  const link = `${siteUrl}/?token=${encodeURIComponent(token)}`;

  return json({
    ok: true,
    link,
    result: link, // ✅ pratique pour Wix
  });
}
