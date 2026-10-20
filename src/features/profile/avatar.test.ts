import { avatarPath, isAllowedAvatarType } from "@/features/profile/avatar";

describe("avatar helpers", () => {
  it("accepts jpeg, png and webp only", () => {
    expect(isAllowedAvatarType("image/png")).toBe(true);
    expect(isAllowedAvatarType("image/gif")).toBe(false);
    expect(isAllowedAvatarType("image/heic")).toBe(false);
  });

  it("builds a path inside the user's folder with the right extension", () => {
    expect(avatarPath("u1", "image/png", 123)).toBe("u1/avatar-123.png");
    expect(avatarPath("u1", "image/webp", 123)).toBe("u1/avatar-123.webp");
  });
});
