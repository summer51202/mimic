import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { brand } from "@/shared/brand/brand";
import PublicLayout from "./(public)/layout";
import PublicHome from "./(public)/page";

vi.mock("@/shared/auth/has-session", () => ({
  hasSession: vi.fn().mockResolvedValue(false),
}));

describe("Public Landing", () => {
  it("renders the public shell and Landing content", async () => {
    render(await PublicLayout({ children: await PublicHome() }));

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主要導覽" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "mimic" }),
    ).toBeInTheDocument();
    expect(screen.getByText(brand.tagline)).toBeInTheDocument();
  });
});
