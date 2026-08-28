export type JwtSecretName = 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET';

export function getRequiredJwtSecret(name: JwtSecretName): string {
  const secret = process.env[name];

  if (!secret?.trim()) {
    throw new Error(`${name} must be set to a non-empty value`);
  }

  return secret;
}
