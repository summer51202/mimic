import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import getRequestConfig from "./request";

vi.mock("next-intl/server", () => ({
  getRequestConfig: (callback: unknown) => callback,
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe("request locale", () => {
  const get = vi.fn();

  beforeEach(() => {
    get.mockReset();
    vi.mocked(cookies).mockResolvedValue({ get } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  it.each([
    [undefined, "zh-TW"],
    ["en", "en"],
    ["ja", "ja"],
  ])("uses the locale cookie %s to select %s", async (value, locale) => {
    get.mockReturnValue(value === undefined ? undefined : { value });
    const config = await getRequestConfig({ requestLocale: Promise.resolve(undefined) });
    expect(get).toHaveBeenCalledWith("mimic-locale");
    expect(config).toMatchObject({ locale, timeZone: "UTC" });
    expect(config.messages).toBeTruthy();
  });
});
