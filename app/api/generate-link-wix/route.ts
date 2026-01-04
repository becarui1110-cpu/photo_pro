// app/api/generate-link-wix/route.ts
export const runtime = "edge"; // ✅ Next.js 15: 'edge' | 'nodejs' uniquement

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

type Ok = { ok: true; link: string; result: string };
type Fail = { ok: false; error: string };

function json(payload: Ok | Fail, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      // ✅ CORS Wix
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
    },
  });
}

export async function OPTIONS() {
  return json({ ok: true, link: "", result: "" } as Ok, 200);
}

/**
 * ✅ En prod: FORCE SITE_URL
 * Dans Vercel: SITE_URL = https://photopro.dreem.ch
 */
function resolveSiteUrlStrict(): string | null {
  const envUrl = process.env.SITE_URL?.trim();
  if (!envUrl) return null;
  return envUrl.replace(/\/$/, "");
}

function parseMinutes(req: Request) {
  const url = new URL(req.url);
  const minutesRaw = Number(url.searchParams.get("duration") || "60");
  return Number.isFinite(minutesRaw) ? Math.max(1, minutesRaw) : 60;
}

async function buildLink(minutes: number) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) return { ok: false, error: "TOKEN_SECRET missing" } as const;

  const siteUrl = resolveSiteUrlStrict();
  if (!siteUrl) {
    return {
      ok: false,
      error: "SITE_URL missing (ex: https://photopro.dreem.ch)",
    } as const;
  }

  const expiresAt = Date.now() + minutes * 60 * 1000;
  const sig = await sign(secret, String(expiresAt));
  const token = `${expiresAt}.${sig}`;

  const link = `${siteUrl}/?token=${encodeURIComponent(token)}`;
  return { ok: true, link, result: link } as const;
}

export async function GET(req: Request) {
  const minutes = parseMinutes(req);
  const result = await buildLink(minutes);
  return json(result as Ok | Fail, result.ok ? 200 : 500);
}

export async function POST(req: Request) {
  const minutes = parseMinutes(req);
  const result = await buildLink(minutes);
  return json(result as Ok | Fail, result.ok ? 200 : 500);
}
