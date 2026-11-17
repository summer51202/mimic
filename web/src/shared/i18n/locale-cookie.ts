import "server-only";

import * as Sentry from "@sentry/nextjs";
import type { NextResponse } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isEnabledLocale, resolveLocale, type EnabledLocale } from "@/i18n/config";
import { requestToApi } from "@/shared/api/server-api";
import { isCookieSecure } from "@/shared/auth/cookies";
import { readCookie, type AuthPayload } from "@/shared/auth/session";

export function setLocaleCookie(response: NextResponse, locale: EnabledLocale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: isCookieSecure(),
  });
}

export async function syncLocaleAfterAuthentication(
  request: Request,
  response: NextResponse,
  payload: AuthPayload,
) {
  const device = readCookie(request, LOCALE_COOKIE);
  const { user } = payload;
  const account = user && typeof user === "object" && "locale" in user ? user.locale : undefined;
  if (device === undefined) {
    if (isEnabledLocale(account)) setLocaleCookie(response, account);
    return;
  }

  const locale = resolveLocale(device);
  if (locale === (account ?? DEFAULT_LOCALE)) return;
  try {
    await requestToApi("/me", {
      accessToken: payload.access_token,
      body: { locale },
      method: "PATCH",
    });
  } catch (error) {
    Sentry.captureException(error, { tags: { operation: "auth-locale-sync" } });
  }
}
