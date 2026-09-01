import { isCookieSecure } from "./cookies";

export function clearGroupPreferenceCookie(): string {
  return [
    "mimic_group=",
    "Max-Age=0",
    "Path=/",
    "SameSite=Lax",
    ...(isCookieSecure() ? ["Secure"] : []),
  ].join("; ");
}
