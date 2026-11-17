import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next-intl/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl/server")>();
  const { createTranslator } = await import("next-intl");
  const { default: messages } = await import("@/i18n/messages/zh-TW.json");
  return {
    ...actual,
    getLocale: async () => "zh-TW",
    getMessages: async () => messages,
    getTranslations: async <Namespace extends Parameters<typeof createTranslator<typeof messages>>[0]["namespace"]>(
      namespace: Namespace,
    ) => createTranslator({ locale: "zh-TW", messages, namespace }),
  };
});
