const controlPattern = /[\u0000-\u001F\u007F]/;
const encodedControlPattern = /%(?:0[0-9A-F]|1[0-9A-F]|7F)/i;

export function safeReturnTo(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value || controlPattern.test(value) || encodedControlPattern.test(value)) {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://mimic.local");

    if (parsed.origin !== "https://mimic.local") {
      return fallback;
    }

    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    if (!isAllowedReturnPath(normalized)) {
      return fallback;
    }

    return normalized;
  } catch {
    return fallback;
  }
}

function isAllowedReturnPath(value: string): boolean {
  return (
    value === "/app" ||
    value.startsWith("/app/") ||
    value.startsWith("/app?") ||
    value.startsWith("/app#") ||
    value.startsWith("/invite/")
  );
}
