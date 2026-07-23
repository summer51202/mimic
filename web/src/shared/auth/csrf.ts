import "server-only";

import { randomBytes, timingSafeEqual } from "node:crypto";

export function generateCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function validateCsrf(
  cookieToken: string | undefined,
  headerToken: string | undefined,
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBytes = Buffer.from(cookieToken);
  const headerBytes = Buffer.from(headerToken);

  if (cookieBytes.length !== headerBytes.length) {
    return false;
  }

  return timingSafeEqual(cookieBytes, headerBytes);
}
