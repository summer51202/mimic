import { describe, expect, it, vi } from "vitest";

import { checkRuntimeHealth } from "./runtime-health";

describe("checkRuntimeHealth", () => {
  it("checks the exact health URL and expected process revision", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ok: true, revision: "e40aba9" } }),
        { status: 200 },
      ),
    );

    await checkRuntimeHealth({
      apiBaseUrl: "http://localhost:3001/api/v1",
      expectedRevision: "e40aba9",
      fetchImpl,
      log: vi.fn(),
      phase: "after authentication setup",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/health",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("includes the exact health URL when the backend becomes unavailable", async () => {
    await expect(
      checkRuntimeHealth({
        apiBaseUrl: "http://localhost:3001/api/v1",
        expectedRevision: "e40aba9",
        fetchImpl: vi.fn().mockRejectedValue(new Error("fetch failed")),
        log: vi.fn(),
        phase: "after Groups/Funds navigation",
      }),
    ).rejects.toThrow(
      "Health checkpoint failed (after Groups/Funds navigation): http://localhost:3001/api/v1/health",
    );
  });

  it("does not echo an invalid secret-like revision", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { ok: true, revision: "token=secret" } }),
        { status: 200 },
      ),
    );

    await expect(
      checkRuntimeHealth({
        apiBaseUrl: "http://localhost:3001/api/v1",
        expectedRevision: "e40aba9",
        fetchImpl,
        log: vi.fn(),
        phase: "after authentication setup",
      }),
    ).rejects.not.toThrow(/token|secret/);
  });
});
