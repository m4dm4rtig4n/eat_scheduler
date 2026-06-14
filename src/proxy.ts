import { NextRequest, NextResponse } from "next/server";
import {
  API_TOKEN_HEADER,
  SESSION_COOKIE_NAME,
  isAuthEnabled,
  verifyApiToken,
  verifySessionToken,
} from "@/lib/auth";

export function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  // Clients API (Claude, scripts) : header X-API-Token = mot de passe applicatif.
  if (verifyApiToken(request.headers.get(API_TOKEN_HEADER) ?? undefined)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (verifySessionToken(token)) return NextResponse.next();

  // Pour les requêtes API non authentifiées (autres que /api/auth/*)
  // on renvoie 401 plutôt que de rediriger : le client gérera.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Tout sauf : /login, /api/auth/*, fichiers statiques, manifest, sw, icons.
  matcher: [
    "/((?!login|api/auth|api/health|api/openapi.json|api/docs|_next/static|_next/image|manifest.json|sw.js|favicon.ico|icons|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
