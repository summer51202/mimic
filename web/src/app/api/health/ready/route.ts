import { NextResponse } from "next/server";

import { requestToApi } from "@/shared/api/server-api";

export async function GET(): Promise<Response> {
  try {
    const data = await requestToApi<unknown>("/health/ready", {
      method: "GET",
    });

    if (!isReadyPayload(data)) {
      return notReadyResponse();
    }

    return NextResponse.json({ data });
  } catch {
    return notReadyResponse();
  }
}

function isReadyPayload(value: unknown): value is { ok: true } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "ok" in value &&
    value.ok === true
  );
}

function notReadyResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "SERVICE_NOT_READY" } },
    { status: 503 },
  );
}
