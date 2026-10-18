import { loginSchema, registerSchema } from "@/schemas/auth";

function eighteenYearsAgo(offsetDays = 0): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function validRegisterInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    email: "player@example.com",
    password: "password123",
    confirmPassword: "password123",
    username: "Shadow92",
    birthDate: eighteenYearsAgo(-1),
    termsAccepted: true,
    privacyAccepted: true,
    rulesAccepted: true,
    ...overrides,
  };
}

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse(validRegisterInput());
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse(
      validRegisterInput({ confirmPassword: "different123" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("confirmPassword"))).toBe(
        true,
      );
    }
  });

  it("rejects a user who is exactly one day short of 18", () => {
    const result = registerSchema.safeParse(
      validRegisterInput({ birthDate: eighteenYearsAgo(1) }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("birthDate"))).toBe(true);
    }
  });

  it("accepts a user who turns 18 today", () => {
    const result = registerSchema.safeParse(validRegisterInput({ birthDate: eighteenYearsAgo(0) }));
    expect(result.success).toBe(true);
  });

  it("rejects an unaccepted consent checkbox", () => {
    const result = registerSchema.safeParse(validRegisterInput({ termsAccepted: false }));
    expect(result.success).toBe(false);
  });

  it("rejects a username with invalid characters", () => {
    const result = registerSchema.safeParse(validRegisterInput({ username: "shadow 92!" }));
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse(
      validRegisterInput({ password: "short", confirmPassword: "short" }),
    );
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
