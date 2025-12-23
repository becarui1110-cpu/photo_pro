// middleware.ts
import { NextResponse } from "next/server";

export const runtime = "experimental-edge"; // Next.js 15

const SECRET = process.env.TOKEN_SECRET || "";
const ADMIN_CODE = process.env.ADMIN_CODE || "dreem2025";
const encoder = new TextEncoder();

const EXPIRED_ROUTE = "/expired";
const ADMIN_BASE_ROUTE = "/admin-panel";
const ADMIN_LOGIN_ROUTE = `${ADMIN_BASE_ROUTE}/login`;

/** ✅ Assets publics (sinon redirigé /expired) */
function isPublicAsset(pathname: string) {
  if (pathname.startsWith("/_next")) return true;

  // fichiers racine usuels
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/site.webmanifest"
  ) {
    return true;
  }

  // icônes PWA / Apple
  if (
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/android-chrome") ||
    pathname.startsWith("/icons/")
  ) {
    return true;
  }

  // toutes extensions statiques
  return /\.(png|jpe?g|gif|webp|svg|ico|css|js|map|txt|xml|json|woff2?|ttf|otf)$/i.test(
    pathname
  );
}

function toBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function verifyToken(token: string) {
  if (!SECRET) return false;

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

  // 0) assets publics
  if (isPublicAsset(pathname)) return NextResponse.next();

  // 1) expired
  if (pathname.startsWith(EXPIRED_ROUTE)) return NextResponse.next();

  // 2) admin panel protégé par cookie
  if (pathname.startsWith(ADMIN_BASE_ROUTE)) {
    if (pathname.startsWith(ADMIN_LOGIN_ROUTE)) return NextResponse.next();

    const cookies = (req.headers.get("cookie") || "")
      .split(";")
      .map((c) => c.trim());

    const hasValidCookie = cookies.some((c) => c === `admin_code=${ADMIN_CODE}`);
    if (!hasValidCookie) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_ROUTE, req.url));
    }
    return NextResponse.next();
  }

  // 3) API libres
  if (pathname.startsWith("/api")) return NextResponse.next();

  // 4) tout le reste doit avoir un token valide
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL(EXPIRED_ROUTE, req.url));

  const ok = await verifyToken(token);
  if (!ok) return NextResponse.redirect(new URL(EXPIRED_ROUTE, req.url));

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
