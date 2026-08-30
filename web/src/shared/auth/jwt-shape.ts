export function isJwtShaped(token: string): boolean {
  if (token.trim() !== token) {
    return false;
  }

  const parts = token.split(".");

  return (
    parts.length === 3 &&
    parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
  );
}
