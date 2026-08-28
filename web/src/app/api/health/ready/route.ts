import { NextResponse } from "next/server";

import { requestToApi } from "@/shared/api/server-api";

export async function GET(): Promise<Response> {
  try {
    const data = await requestToApi<{ ok: true }>("/health/ready", {
      method: "GET",
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json(
      { error: { code: "SERVICE_NOT_READY" } },
      { status: 503 },
    );
  }
}
