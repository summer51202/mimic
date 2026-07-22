export class ApiContractError extends Error {
  readonly name = "ApiContractError";
}

export function readEnvelope<T>(envelope: unknown): T {
  if (!isRecord(envelope)) {
    throw new ApiContractError("API response envelope must be an object.");
  }

  if ("error" in envelope) {
    throw new ApiContractError("API returned an error envelope.");
  }

  if (!Object.prototype.hasOwnProperty.call(envelope, "data")) {
    throw new ApiContractError("API response envelope is missing data.");
  }

  const data = envelope.data;

  if (typeof data === "undefined") {
    throw new ApiContractError("API response envelope data is undefined.");
  }

  return data as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
