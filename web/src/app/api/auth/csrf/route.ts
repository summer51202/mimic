import { NextResponse } from "next/server";

import { generateCsrfToken } from "@/shared/auth/csrf";
import { setCsrfCookie } from "@/shared/auth/session";

export function GET(): NextResponse {
  const token = generateCsrfToken();
  const response = NextResponse.json({ token });

  setCsrfCookie(response, token);

  return response;
}
