import { parseAuthRedirect } from "@/features/auth/redirect";

describe("parseAuthRedirect", () => {
  it("reads recovery tokens from the fragment", () => {
    const result = parseAuthRedirect(
      "esportapp://reset-password#access_token=AAA&refresh_token=BBB&expires_in=3600&type=recovery",
    );
    expect(result).toEqual({ kind: "tokens", accessToken: "AAA", refreshToken: "BBB", type: "recovery" });
  });

  it("reads tokens passed in the query string (Expo Go)", () => {
    const result = parseAuthRedirect("exp://192.168.1.2:8081/--/reset-password?access_token=A&refresh_token=B");
    expect(result).toEqual({ kind: "tokens", accessToken: "A", refreshToken: "B", type: null });
  });

  it("reports an expired link", () => {
    const result = parseAuthRedirect(
      "esportapp://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
    );
    expect(result).toEqual({ kind: "error", code: "otp_expired", description: "Email link is invalid or has expired" });
  });

  it("returns null when there is nothing to read", () => {
    expect(parseAuthRedirect("esportapp://reset-password")).toBe(null);
    expect(parseAuthRedirect(null)).toBe(null);
  });
});
