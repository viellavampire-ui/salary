import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "./auth";

/**
 * Data Access Layer: единственное место, где читается сессия.
 * Читает cookie запроса, поэтому вызывать только внутри <Suspense>
 * (так требует cacheComponents в Next.js 16).
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Текущий пользователь или редирект на /login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id, name, email, image, currency, monthStartDay } = session.user;
  return { id, name, email, image, currency, monthStartDay };
}

export type CurrentUser = Awaited<ReturnType<typeof requireUser>>;
