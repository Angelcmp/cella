import { NextResponse, type NextRequest } from "next/server";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const hostname = host.split(":")[0];

  if (request.nextUrl.pathname !== "/") {
    return NextResponse.next();
  }

  // Hosts que deben servir el landing (p. ej. cella.im, o localhost:3100 en tests).
  const landingHosts = (process.env.LANDING_HOSTS || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  if (landingHosts.includes(host)) {
    return NextResponse.next();
  }

  // En local la raíz redirige a /zen (la app es la plataforma); el landing es solo para el dominio.
  if (LOCAL_HOSTNAMES.has(hostname)) {
    return NextResponse.redirect(new URL("/zen", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
