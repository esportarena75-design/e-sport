import { formatCountdown, getMatchStart, splitMyMatches } from "@/utils/matches";

const base = {
  scheduled_at: null,
  round: 1,
  tournament_start_date: "2026-11-01T18:00:00Z",
  status: "READY",
  completed_at: null,
  created_at: "2026-10-01T10:00:00Z",
};

describe("getMatchStart", () => {
  it("prefers the scheduled date", () => {
    expect(getMatchStart({ ...base, scheduled_at: "2026-11-02T20:00:00Z" })).toBe("2026-11-02T20:00:00Z");
  });

  it("falls back to the tournament start for round 1 only", () => {
    expect(getMatchStart(base)).toBe("2026-11-01T18:00:00Z");
    expect(getMatchStart({ ...base, round: 2 })).toBe(null);
  });
});

describe("splitMyMatches", () => {
  it("sorts upcoming by date (undated last) and history most recent first", () => {
    const a = { ...base, id: "a", scheduled_at: "2026-11-03T10:00:00Z" };
    const b = { ...base, id: "b", scheduled_at: "2026-11-02T10:00:00Z" };
    const c = { ...base, id: "c", round: 2, tournament_start_date: null };
    const old = { ...base, id: "old", status: "COMPLETED", completed_at: "2026-10-05T10:00:00Z" };
    const recent = { ...base, id: "recent", status: "FORFEIT", completed_at: "2026-10-10T10:00:00Z" };

    const { upcoming, history } = splitMyMatches([a, c, b, old, recent]);
    expect(upcoming.map((m) => m.id).join()).toBe("b,a,c");
    expect(history.map((m) => m.id).join()).toBe("recent,old");
  });
});

describe("formatCountdown", () => {
  const now = new Date("2026-10-18T12:00:00Z").getTime();

  it("shows days, hours and minutes beyond 24 h", () => {
    expect(formatCountdown("2026-10-20T16:12:30Z", now)).toBe("2 j 04 h 12 min");
  });

  it("shows hh:mm:ss under 24 h", () => {
    expect(formatCountdown("2026-10-18T15:12:45Z", now)).toBe("03:12:45");
  });

  it("says now once the date has passed", () => {
    expect(formatCountdown("2026-10-18T11:59:00Z", now)).toBe("Maintenant");
  });
});
