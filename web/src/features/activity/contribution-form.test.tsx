import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ContributionForm } from "./contribution-form";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("submits a regular contribution in minor units", async () => {
  const user = userEvent.setup(); const success = vi.fn();
  const fetchMock = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(url === "/api/auth/csrf" ? { token: "t" } : { data: { id: "c1" } }), { status: 200, headers: { "content-type": "application/json" } })));
  vi.stubGlobal("fetch", fetchMock);
  render(<ContributionForm fundId="f1" currency="TWD" members={[{ user_id: "u1", display_name: "Mina", mimic_id: "MIMIC-2345-6789", role: "owner", status: "active" }]} currentUserId="missing" onSuccess={success} />);
  expect(screen.getByLabelText("Contributor")).toHaveValue("u1");
  await user.type(screen.getByLabelText("Amount"), "50");
  await user.click(screen.getByRole("button", { name: "Add contribution" }));
  await waitFor(() => expect(success).toHaveBeenCalled());
  expect(fetchMock).toHaveBeenLastCalledWith("/api/app/funds/f1/contributions", expect.objectContaining({ body: expect.stringContaining('"amount_minor":5000') }));
});

it("keeps entries and gives a retry action when the network is unavailable", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
  render(<ContributionForm fundId="f1" currency="TWD" members={[{ user_id: "u1", display_name: "Mina", mimic_id: "MIMIC-2345-6789", role: "owner", status: "active" }]} currentUserId="u1" onSuccess={vi.fn()} />);

  await user.type(screen.getByLabelText("Amount"), "50");
  await user.click(screen.getByRole("button", { name: "Add contribution" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Your entries are still here; try again");
  expect(screen.getByLabelText("Amount")).toHaveValue("50");
});
