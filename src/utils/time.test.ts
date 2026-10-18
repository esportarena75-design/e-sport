import { formatNewsDate, timeAgo } from "@/utils/time";

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

describe("formatNewsDate", () => {
  const now = new Date("2026-10-18T12:00:00.000Z").getTime();

  it("uses a relative date during the first week", () => {
    const iso = new Date(now - 2 * 86_400_000).toISOString();
    expect(formatNewsDate(iso, now)).toBe("il y a 2 j");
  });

  it("switches to a short calendar date after a week", () => {
    expect(formatNewsDate("2026-08-24T10:00:00.000Z", now)).toMatch(/24 ao[uû]t/);
  });

  it("adds the year for an older year", () => {
    expect(formatNewsDate("2025-08-24T10:00:00.000Z", now)).toMatch(/2025/);
  });
});
