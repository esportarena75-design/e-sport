import { timeAgo } from "@/utils/time";

describe("timeAgo", () => {
  const now = new Date("2026-01-01T12:00:00.000Z").getTime();

  it("returns 'à l'instant' for less than a minute ago", () => {
    const iso = new Date(now - 30_000).toISOString();
    expect(timeAgo(iso, now)).toBe("à l'instant");
  });

  it("returns minutes for less than an hour ago", () => {
    const iso = new Date(now - 5 * 60_000).toISOString();
    expect(timeAgo(iso, now)).toBe("il y a 5 min");
  });

  it("returns hours for less than a day ago", () => {
    const iso = new Date(now - 3 * 60 * 60_000).toISOString();
    expect(timeAgo(iso, now)).toBe("il y a 3 h");
  });

  it("returns days for a week ago", () => {
    const iso = new Date(now - 7 * 24 * 60 * 60_000).toISOString();
    expect(timeAgo(iso, now)).toBe("il y a 7 j");
  });
});
