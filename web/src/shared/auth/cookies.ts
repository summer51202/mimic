import "server-only";

import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const authCookies = {
  access: "mimic_access",
  refresh: "mimic_refresh",
  csrf: "mimic_csrf",
} as const;

export const accessCookieMaxAgeSeconds = 15 * 60;
export const refreshCookieMaxAgeSeconds = 30 * 24 * 60 * 60;

export function isCookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.MIMIC_COOKIE_SECURE === "true"
  );
}

export function authCookieOptions(maxAge: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite: "lax",
    secure: isCookieSecure(),
  };
}

export function csrfCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    secure: isCookieSecure(),
  };
}

export function clearCookieOptions(): Partial<ResponseCookie> {
  return {
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isCookieSecure(),
  };
}
