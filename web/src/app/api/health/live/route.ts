import { NextResponse } from "next/server";

export async function GET(): Promise<Response> {
  return NextResponse.json({ data: { ok: true } });
}
