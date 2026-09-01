import { parseInviteCode } from "./invite-schema";

const invitePathPattern = /^\/invite\/([^/]+)\/?$/;

export function parseInviteEntry(value: string): string | null {
  const normalized = value.trim();
  const rawCode = parseInviteCode(normalized);

  if (rawCode) {
    return rawCode;
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const match = invitePathPattern.exec(url.pathname);

  if (!match) {
    return null;
  }

  try {
    return parseInviteCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
