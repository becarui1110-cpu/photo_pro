// app/api/generate-link/route.ts
export const runtime = "edge";

const encoder = new TextEncoder();

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET(request: Request) {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    return new Response(
      JSON.stringify({ error: "TOKEN_SECRET manquant dans Vercel" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

  const { searchParams } = new URL(request.url);
  const durationMinutes = Number(searchParams.get("duration") || "60");

  const expiresAt = Date.now() + durationMinutes * 60 * 1000;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(String(expiresAt))
  );

  const signature = toBase64Url(signatureBuffer);

  const token = `${expiresAt}.${signature}`;

  const siteUrl = "https://ltr.dreem.ch";
  const link = `${siteUrl}/?token=${token}`;

  return new Response(JSON.stringify({ link }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
