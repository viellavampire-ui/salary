import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Быстрая (оптимистичная) проверка: есть ли cookie сессии.
 * Настоящая проверка сессии — в lib/dal.ts (requireUser) на каждой странице
 * и в каждом Server Action.
 */
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
