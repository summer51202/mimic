type RuntimeHealthOptions = {
  apiBaseUrl: string;
  expectedRevision: string;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
  phase: string;
};

const revisionPattern = /^[0-9a-f]{7,64}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function checkRuntimeHealth({
  apiBaseUrl,
  expectedRevision,
  fetchImpl = fetch,
  log = console.log,
  phase,
}: RuntimeHealthOptions) {
  const healthUrl = `${apiBaseUrl}/health`;
  let response: Response;
  try {
    response = await fetchImpl(healthUrl, {
      signal: AbortSignal.timeout(5_000),
    });
  } catch (cause) {
    throw new Error(`Health checkpoint failed (${phase}): ${healthUrl}`, {
      cause,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Health checkpoint failed (${phase}): ${healthUrl}: ${response.status} ${response.statusText}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      `Health checkpoint failed (${phase}): ${healthUrl}: invalid health response`,
    );
  }
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new Error(
      `Health checkpoint failed (${phase}): ${healthUrl}: invalid health response`,
    );
  }

  const revision = body.data.revision;
  if (typeof revision !== "string" || !revisionPattern.test(revision)) {
    throw new Error(`Backend revision missing or invalid at ${healthUrl}`);
  }
  if (revision !== expectedRevision) {
    throw new Error(
      `Backend revision mismatch at ${healthUrl}: expected ${expectedRevision}, received ${revision}`,
    );
  }

  log(`Health checkpoint passed (${phase}): ${healthUrl}`);
}
