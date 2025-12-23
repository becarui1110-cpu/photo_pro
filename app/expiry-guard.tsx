"use client";

import { useEffect } from "react";

export function ExpiryGuard() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("token");
    if (!token) return;

    const [expiresStr] = token.split(".");
    const expiresAt = Number(expiresStr);
    if (!Number.isFinite(expiresAt)) return;

    const check = () => {
      if (Date.now() > expiresAt) {
        window.location.href = "/expired";
      }
    };

    // check immédiat
    check();
    // check périodique
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, []);

    return null;
}
