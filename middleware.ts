// middleware.ts
import { NextResponse } from "next/server";

const SECRET = process.env.TOKEN_SECRET!;
const ADMIN_CODE = process.env.ADMIN_CODE || "dreem2025";
const encoder = new TextEncoder();

const EXPIRED_ROUTE = "/expired";
const ADMIN_BASE_ROUTE = "/admin-panel";
const ADMIN_LOGIN_ROUTE = `${ADMIN_BASE_ROUTE}/login`;

function toBase64Url(buffer: ArrayBuffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function verifyToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [tsStr, signature] = parts;
  const expiresAt = Number(tsStr);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(tsStr));
  const expectedSig = toBase64Url(signed);

  return expectedSig === signature;
}

export async function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // ✅ 1. Pages publiques / assets (NE JAMAIS BLOQUER)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/icons") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".svg") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png"
  ) {
    return NextResponse.next();
  }

  // ✅ 2. Page expirée
  if (pathname.startsWith(EXPIRED_ROUTE)) {
    return NextResponse.next();
  }

  // ✅ 3. Admin
  if (pathname.startsWith(ADMIN_BASE_ROUTE)) {
    if (pathname.startsWith(ADMIN_LOGIN_ROUTE)) {
      return NextResponse.next();
    }

    const cookies = (req.headers.get("cookie") || "")
      .split(";")
      .map((c) => c.trim());

    const hasValidCookie = cookies.some(
      (c) => c === `admin_code=${ADMIN_CODE}`
    );

    if (!hasValidCookie) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, req.url));
    }

    return NextResponse.next();
  }

  // ✅ 4. API
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // ✅ 5. Tout le reste = token requis
  const token = url.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL(EXPIRED_ROUTE, req.url));
  }

  const ok = await verifyToken(token);
  if (!ok) {
    return NextResponse.redirect(new URL(EXPIRED_ROUTE, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
