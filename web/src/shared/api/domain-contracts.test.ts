import { describe, expect, it } from "vitest";

import {
  groupDashboardSchema,
  groupSchema,
  inviteAcceptResultSchema,
  inviteCreatedSchema,
} from "./domain-contracts";

const periodTotals = {
  net_change_minor: "0",
  contribution_minor: "0",
  expense_minor: "0",
  member_positions: [],
};

describe("domain contracts", () => {
  it("parses canonical group dashboard money strings", () => {
    const parsed = groupDashboardSchema.parse({
      group: { id: "g1", name: "Adventure Fund", default_currency: "TWD" },
      currencies: [
        {
          currency: "TWD",
          cash_balance_minor: "24680",
          current: periodTotals,
          all_time: {
            ...periodTotals,
            net_change_minor: "24680",
            contribution_minor: "24680",
          },
          funds: [
            {
              fund_id: "f1",
              name: "Rent",
              cash_balance_minor: "24680",
              current_net_change_minor: "-860",
              period_start: "2026-07-01",
              period_end: null,
            },
          ],
        },
      ],
    });

    expect(parsed.currencies[0]?.cash_balance_minor).toBe("24680");
    expect(parsed.currencies[0]?.funds[0]?.current_net_change_minor).toBe(
      "-860",
    );
  });

  it("rejects decimal and exponential minor units", () => {
    const dashboard = {
      group: { id: "g1", name: "x", default_currency: "TWD" },
      currencies: [
        {
          currency: "TWD",
          cash_balance_minor: "1.25",
          current: periodTotals,
          all_time: periodTotals,
          funds: [],
        },
      ],
    };

    expect(() => groupDashboardSchema.parse(dashboard)).toThrow();
    expect(() =>
      groupDashboardSchema.parse({
        ...dashboard,
        currencies: [{ ...dashboard.currencies[0], cash_balance_minor: "1e3" }],
      }),
    ).toThrow();
  });

  it("parses group and invite acceptance identities", () => {
    expect(
      groupSchema.parse({
        id: "g1",
        name: "Household",
        group_type: "couple",
        default_currency: "TWD",
        status: "active",
      }).id,
    ).toBe("g1");

    expect(
      inviteAcceptResultSchema.parse({
        group_id: "g1",
        group_name: "Household",
        role: "member",
        joined_at: "2026-07-29T00:00:00.000Z",
      }).group_id,
    ).toBe("g1");
  });

  it("enforces twelve URL-safe invite codes in invite creation responses", () => {
    const invite = {
      expires_at: "2026-07-30T00:00:00.000Z",
      invite_code: "abcDEF123_-4",
      invite_id: "invite_1",
      invited_email: null,
      status: "ACTIVE",
    };

    expect(inviteCreatedSchema.parse(invite).invite_code).toBe("abcDEF123_-4");
    expect(() =>
      inviteCreatedSchema.parse({ ...invite, invite_code: "bad code!" }),
    ).toThrow();
    expect(() =>
      inviteCreatedSchema.parse({ ...invite, invite_code: "ABCD1234XYZ" }),
    ).toThrow();
  });
});
