import { toFriendlyAccountError, toFriendlyErrorMessage } from "@/features/auth/errors";

describe("toFriendlyAccountError", () => {
  it("explains why an administrator cannot delete their account", () => {
    expect(toFriendlyAccountError(new Error("Administrators cannot delete their account"))).toContain(
      "administrateur",
    );
  });

  it("maps an already deleted account", () => {
    expect(toFriendlyAccountError(new Error("Account already deleted"))).toBe("Ce compte est déjà supprimé.");
  });

  it("falls back to a generic message", () => {
    expect(toFriendlyAccountError(new Error("boom"))).toBe("Une erreur est survenue. Réessayez.");
  });
});

describe("toFriendlyErrorMessage", () => {
  it("maps wrong credentials", () => {
    expect(toFriendlyErrorMessage(new Error("Invalid login credentials"))).toBe("Email ou mot de passe incorrect.");
  });
});
