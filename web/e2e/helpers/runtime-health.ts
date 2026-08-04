type RuntimeHealthOptions = {
  apiBaseUrl: string;
  expectedRevision: string;
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
  phase: string;
};

const revisionPattern = /^[0-9a-f]{7,64}$/i;

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

  const body = (await response.json()) as {
    data?: { revision?: string };
  };
  const revision = body.data?.revision;
  if (!revision || !revisionPattern.test(revision)) {
    throw new Error(`Backend revision missing or invalid at ${healthUrl}`);
  }
  if (revision !== expectedRevision) {
    throw new Error(
      `Backend revision mismatch at ${healthUrl}: expected ${expectedRevision}, received ${revision}`,
    );
  }

  log(`Health checkpoint passed (${phase}): ${healthUrl}`);
}
