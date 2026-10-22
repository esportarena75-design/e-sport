import { adminActionLabel, adminLogSummary } from "@/utils/adminLogs";

describe("adminLogs", () => {
  it("labels known actions and falls back for unknown ones", () => {
    expect(adminActionLabel("lift_sanction")).toBe("Sanction levée");
    expect(adminActionLabel("some_new_action")).toBe("some new action");
  });

  it("summarises details", () => {
    expect(adminLogSummary({ type: "BAN", reason: "triche" })).toBe("BAN · « triche »");
    expect(adminLogSummary(null)).toBe("");
    expect(adminLogSummary({ type: "SUSPENSION", end_date: "2026-10-24T12:00:00Z" })).toContain("jusqu'au");
  });
});
