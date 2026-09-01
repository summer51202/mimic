import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

import { settingsProfileSchema, type SettingsProfile } from "./settings-schema";

export async function getSettingsProfile(): Promise<SettingsProfile> {
  const data = await authenticatedServerApi<unknown>("/me", { method: "GET" });

  return settingsProfileSchema.parse(data);
}
