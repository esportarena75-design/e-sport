import { toFriendlyAdminError } from "@/features/admin/errors";

describe("toFriendlyAdminError", () => {
  it("maps an overfull tournament", () => {
    expect(toFriendlyAdminError(new Error("Too many participants for this tournament's bracket size"))).toBe(
      "Il y a plus d'inscrits que de places dans ce tournoi.",
    );
  });

  it("maps sanction hierarchy errors", () => {
    expect(toFriendlyAdminError(new Error("You cannot sanction yourself"))).toContain("vous-même");
    expect(toFriendlyAdminError(new Error("Insufficient privileges to sanction this user"))).toContain("rang");
  });

  it("maps an already-handled dispute", () => {
    expect(toFriendlyAdminError(new Error("Dispute is already closed"))).toBe(
      "Ce litige a déjà été traité.",
    );
  });

  it("maps a closed match without confusing it with a closed dispute", () => {
    expect(toFriendlyAdminError(new Error("This match is already closed"))).toBe(
      "Ce match est déjà terminé.",
    );
  });

  it("falls back to a generic message", () => {
    expect(toFriendlyAdminError("boom")).toBe("Une erreur est survenue. Réessayez.");
  });
});
