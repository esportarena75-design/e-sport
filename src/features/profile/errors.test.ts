import { toFriendlyProfileError } from "@/features/profile/errors";

describe("toFriendlyProfileError", () => {
  it("maps a taken username", () => {
    expect(
      toFriendlyProfileError(new Error('duplicate key value violates unique constraint "profiles_username_lower_idx"')),
    ).toBe("Ce pseudo est déjà pris.");
  });

  it("maps the username change rate limit", () => {
    expect(toFriendlyProfileError(new Error("Username can only be changed every 14 days"))).toContain("14 jours");
  });

  it("maps avatar errors", () => {
    expect(toFriendlyProfileError(new Error("AVATAR_TYPE"))).toContain("JPEG");
    expect(toFriendlyProfileError(new Error("AVATAR_TOO_LARGE"))).toContain("2 Mo");
  });

  it("falls back to a generic message", () => {
    expect(toFriendlyProfileError(new Error("boom"))).toBe("Une erreur est survenue. Réessayez.");
  });
});
