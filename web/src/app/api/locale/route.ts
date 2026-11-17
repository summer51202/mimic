import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { isEnabledLocale } from "@/i18n/config";
import { authenticatedApi } from "@/shared/api/authenticated-api";
import { authCookies } from "@/shared/auth/cookies";
import { csrfRejectedResponse, hasValidCsrf, readCookie, readJsonRequestBody } from "@/shared/auth/session";
import { setLocaleCookie } from "@/shared/i18n/locale-cookie";

export async function POST(request: Request) {
  if (!hasValidCsrf(request)) return csrfRejectedResponse();

  const body = await readJsonRequestBody(request);
  const locale = body && typeof body === "object" && "locale" in body ? body.locale : undefined;
  if (!isEnabledLocale(locale)) {
    return NextResponse.json({ error: { code: "LOCALE_UNSUPPORTED" } }, { status: 400 });
  }

  let synced = false;
  if (readCookie(request, authCookies.access) || readCookie(request, authCookies.refresh)) {
    try {
      await authenticatedApi(request, "/me", { body: { locale }, method: "PATCH" });
      synced = true;
    } catch (error) {
      Sentry.captureException(error, { tags: { operation: "locale-switch-sync" } });
    }
  }
  const response = NextResponse.json({ locale, synced }, {
    headers: { "Cache-Control": "private, no-store" },
  });
  setLocaleCookie(response, locale);
  return response;
}
