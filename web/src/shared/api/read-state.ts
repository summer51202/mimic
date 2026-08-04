import { ApiError, ApiUnavailableError } from "./errors";

export type AppReadState = "forbidden" | "not-found" | "unavailable" | "unknown";

export function classifyReadError(error: unknown): AppReadState {
  if (error instanceof ApiUnavailableError) {
    return "unavailable";
  }

  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "forbidden";
    }

    if (error.status === 404) {
      return "not-found";
    }
  }

  return "unknown";
}
