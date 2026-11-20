import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Быстрые (оптимистичные) проверки по наличию cookie сессии.
 * Настоящая проверка сессии — в lib/dal.ts (requireUser) на каждой странице
 * и в каждом Server Action.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(getSessionCookie(request));
  const { pathname, search } = request.nextUrl;

  // Главная: вошедших сразу ведём на дашборд (шаг 6.5).
  // Если cookie устарела, /dashboard отправит на /login — цикла нет,
  // потому что /login отсюда не перенаправляется.
  if (pathname === "/") {
    return hasSession
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    // Предзагрузку главной не перенаправляем: иначе предзагрузка ссылки «/»
    // после входа получает редирект без RSC-заголовков и падает с 404.
    {
      source: "/",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "next-router-segment-prefetch" },
      ],
    },
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/analytics/:path*",
    "/settings/:path*",
  ],
};
