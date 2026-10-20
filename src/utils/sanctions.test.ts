import { suspensionEndDate } from "@/utils/sanctions";

describe("suspensionEndDate", () => {
  const now = new Date("2026-10-21T12:00:00Z");

  it("adds the chosen number of days", () => {
    expect(suspensionEndDate("3", now)?.toISOString()).toBe("2026-10-24T12:00:00.000Z");
    expect(suspensionEndDate("30", now)?.toISOString()).toBe("2026-11-20T12:00:00.000Z");
  });

  it("returns null for an open-ended suspension", () => {
    expect(suspensionEndDate("forever", now)).toBeNull();
  });
});
