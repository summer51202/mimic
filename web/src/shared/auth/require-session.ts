import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authCookies } from "@/shared/auth/cookies";
import { isJwtShaped } from "@/shared/auth/jwt-shape";

export type AuthenticatedSession = {
  isAuthenticated: true;
  user: unknown | null;
};

const appReturnTo = "/app";
const loginRedirectPath = `/login?returnTo=${encodeURIComponent(appReturnTo)}`;
const refreshRedirectPath = `/api/auth/refresh?returnTo=${encodeURIComponent(
  appReturnTo,
)}`;

export async function requireSession(): Promise<AuthenticatedSession> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;

  if (accessToken && isJwtShaped(accessToken)) {
    return { isAuthenticated: true, user: null };
  }

  const refreshToken = cookieStore.get(authCookies.refresh)?.value;

  if (!refreshToken) {
    redirect(loginRedirectPath);
  }

  redirect(refreshRedirectPath);
}
