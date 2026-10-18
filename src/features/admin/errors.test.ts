import { toFriendlyAdminError } from "@/features/admin/errors";

describe("toFriendlyAdminError", () => {
  it("explains the power-of-two bracket constraint", () => {
    const error = new Error("Participant count must be a power of two (byes are not supported yet)");
    expect(toFriendlyAdminError(error)).toContain("2, 4, 8, 16, 32 ou 64");
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
