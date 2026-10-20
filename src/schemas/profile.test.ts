import { editProfileSchema } from "@/schemas/profile";

describe("editProfileSchema", () => {
  it("accepts a valid username and an empty bio", () => {
    expect(editProfileSchema.safeParse({ username: "Joueur_01", bio: "" }).success).toBe(true);
  });

  it("trims the username", () => {
    const result = editProfileSchema.safeParse({ username: "  abc  ", bio: "" });
    expect(result.success && result.data.username).toBe("abc");
  });

  it("rejects a short username, forbidden characters and a long bio", () => {
    expect(editProfileSchema.safeParse({ username: "ab", bio: "" }).success).toBe(false);
    expect(editProfileSchema.safeParse({ username: "mon pseudo", bio: "" }).success).toBe(false);
    expect(editProfileSchema.safeParse({ username: "abc", bio: "x".repeat(161) }).success).toBe(false);
  });
});
