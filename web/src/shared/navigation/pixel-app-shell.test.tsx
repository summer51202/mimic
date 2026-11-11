import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { PixelAppShell } from "./pixel-app-shell";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(), useSearchParams: () => new URLSearchParams() }));
afterEach(cleanup);

it.each([
  ["/app", false],
  ["/app/tasks", true],
  ["/app/spaces/00000000-0000-4000-8000-000000000001", true],
] as const)("renders the shell quick action on %s only when eligible", (pathname, visible) => {
  vi.mocked(usePathname).mockReturnValue(pathname);
  render(<PixelAppShell>Content</PixelAppShell>);
  expect(Boolean(screen.queryByRole("link", { name: "記一筆支出" }))).toBe(visible);
});
