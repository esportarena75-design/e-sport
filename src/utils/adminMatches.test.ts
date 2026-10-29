import { matchesAdminFilter } from "@/utils/adminMatches";

const base = { status: "READY", player_1_id: "a", player_2_id: "b", scheduled_at: null };

describe("matchesAdminFilter", () => {
  it("lists ready matches without a date and with two players as 'schedule'", () => {
    expect(matchesAdminFilter(base, "schedule")).toBe(true);
    expect(matchesAdminFilter({ ...base, scheduled_at: "2026-10-30T10:00:00Z" }, "schedule")).toBe(false);
    expect(matchesAdminFilter({ ...base, player_2_id: null }, "schedule")).toBe(false);
  });

  it("filters by status", () => {
    expect(matchesAdminFilter({ ...base, status: "AWAITING_CONFIRMATION" }, "confirm")).toBe(true);
    expect(matchesAdminFilter({ ...base, status: "DISPUTED" }, "dispute")).toBe(true);
    expect(matchesAdminFilter({ ...base, status: "COMPLETED" }, "open")).toBe(false);
    expect(matchesAdminFilter({ ...base, status: "COMPLETED" }, "all")).toBe(true);
  });
});
