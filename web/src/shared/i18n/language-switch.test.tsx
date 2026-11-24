import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { render } from "@/test/render-with-intl";
import { LanguageSwitch } from "./language-switch";
import { appFetch } from "@/shared/api/app-fetch";
import { IntlTestProvider } from "@/test/render-with-intl";

vi.mock("@/shared/api/app-fetch", () => ({ appFetch: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it.each([
  [40, 180, 120, "end", ""],
  [-20, 120, 55, "start", ""],
  [-10, 290, 50, "end", "translateX(18px)"],
] as const)("positions a menu with initial edges %s and %s", (left, right, anchor, align, transform) => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("role") === "menu"
      ? DOMRect.fromRect({ x: left, width: right - left })
      : DOMRect.fromRect({ x: anchor });
  });
  render(<LanguageSwitch />);
  fireEvent.click(screen.getByRole("button", { name: "語言：中文" }));
  const menu = screen.getByRole("menu");
  expect(menu).toHaveAttribute("data-align", align);
  expect(menu.style.transform).toBe(transform);
});

it("recalculates an open menu after resize", () => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(320);
  let left = 20;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return DOMRect.fromRect({ x: this.getAttribute("role") === "menu" ? left : 55, width: 140 });
  });
  render(<LanguageSwitch />);
  fireEvent.click(screen.getByRole("button", { name: "語言：中文" }));
  const menu = screen.getByRole("menu");
  expect(menu).toHaveAttribute("data-align", "end");
  left = -20;
  fireEvent(window, new Event("resize"));
  expect(menu).toHaveAttribute("data-align", "start");
});

it("names the current language and opens a menu with all three self-names", () => {
  render(<LanguageSwitch />);
  const button = screen.getByRole("button", { name: "語言：中文" });
  expect(button).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(button);
  expect(button).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("menuitemradio", { name: /中文/ })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("menuitemradio", { name: "English" })).toBeVisible();
  expect(screen.getByRole("menuitemradio", { name: "日本語" })).toHaveAttribute("lang", "ja");
  fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});

it("moves focus with arrow keys, closes outside, and keeps the full English accessible name", async () => {
  render(<LanguageSwitch />, { wrapper: ({ children }) => <IntlTestProvider locale="en">{children}</IntlTestProvider> });
  const trigger = screen.getByRole("button", { name: "Language: English" });
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  const options = screen.getAllByRole("menuitemradio");
  await waitFor(() => expect(options[0]).toHaveFocus());
  fireEvent.keyDown(options[0], { key: "ArrowDown" });
  expect(options[1]).toHaveFocus();
  expect(options[1]).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(options[1], { key: "ArrowUp" });
  expect(options[0]).toHaveFocus();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});

it("prevents repeated locale submissions while a request is pending", async () => {
  vi.mocked(appFetch).mockClear();
  let resolve!: (value: { locale: "ja"; synced: boolean }) => void;
  vi.mocked(appFetch).mockImplementationOnce(() => new Promise(resolveRequest => { resolve = resolveRequest; }));
  render(<LanguageSwitch />);
  const trigger = screen.getByRole("button", { name: "語言：中文" });
  fireEvent.click(trigger);
  const japanese = screen.getByRole("menuitemradio", { name: "日本語" });
  fireEvent.click(japanese);
  fireEvent.click(japanese);
  expect(trigger).toHaveAttribute("aria-busy", "true");
  expect(appFetch).toHaveBeenCalledTimes(1);
  expect(appFetch).toHaveBeenCalledWith("/api/locale", { method: "POST", body: JSON.stringify({ locale: "ja" }) });
  resolve({ locale: "ja", synced: false });
  await waitFor(() => expect(trigger).toHaveAttribute("aria-busy", "false"));
});
