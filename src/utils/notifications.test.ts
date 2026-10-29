import { notificationIcon, notificationTarget } from "@/utils/notifications";

describe("notificationTarget", () => {
  it("opens the match when there is one", () => {
    expect(notificationTarget("tournament_started", { tournament_id: "t1", match_id: "m1" })).toBe("/match/m1");
  });

  it("opens the tournament otherwise", () => {
    expect(notificationTarget("announcement", { tournament_id: "t1" })).toBe("/tournament/t1");
  });

  it("sends admins to the disputes screen", () => {
    expect(notificationTarget("admin_dispute_opened", { admin: true, dispute_id: "d1" })).toBe("/admin/disputes");
  });

  it("has no target for a general announcement or missing data", () => {
    expect(notificationTarget("announcement", { announcement_id: "a1" })).toBeNull();
    expect(notificationTarget("sanction_applied", null)).toBeNull();
  });
});

describe("notificationIcon", () => {
  it("falls back to a bell for unknown types", () => {
    expect(notificationIcon("unknown")).toBe("notifications-outline");
    expect(notificationIcon("announcement")).toBe("megaphone-outline");
  });
});
