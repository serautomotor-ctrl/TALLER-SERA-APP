import { NextResponse, type NextRequest } from "next/server";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { canAccess, sectionForPath } from "@/lib/permissions";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/sitio") ||
    pathname.startsWith("/doc/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const user = parseSessionToken(token);
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Permisos por seccion: si no puede entrar, vuelve al inicio con un aviso
  const section = sectionForPath(pathname);
  if (section && !canAccess(user, section)) {
    const home = new URL("/", request.url);
    home.searchParams.set("sinpermiso", section);
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
