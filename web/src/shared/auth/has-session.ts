import "server-only";

import { cookies } from "next/headers";

import { authCookies } from "@/shared/auth/cookies";
import { isJwtShaped } from "@/shared/auth/jwt-shape";

export async function hasSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;

  return accessToken !== undefined && isJwtShaped(accessToken);
}
