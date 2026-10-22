import { createTournamentSchema, editTournamentSchema } from "@/schemas/tournament";

function validInput(overrides: Partial<Record<string, unknown>> = {}) {
  const registrationStart = new Date("2026-06-01T10:00:00Z");
  const registrationEnd = new Date("2026-06-05T10:00:00Z");
  const startDate = new Date("2026-06-06T20:00:00Z");
  return {
    name: "FC Friday Cup",
    gameId: "game-1",
    platformId: "platform-1",
    maxPlayers: "8",
    registrationStart,
    registrationEnd,
    startDate,
    ...overrides,
  };
}

describe("createTournamentSchema", () => {
  it("accepts a well-ordered set of dates", () => {
    expect(createTournamentSchema.safeParse(validInput()).success).toBe(true);
  });

  it("rejects registration ending before it starts", () => {
    const result = createTournamentSchema.safeParse(
      validInput({
        registrationStart: new Date("2026-06-05T10:00:00Z"),
        registrationEnd: new Date("2026-06-01T10:00:00Z"),
      }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("registrationEnd"))).toBe(
        true,
      );
    }
  });

  it("rejects a tournament starting before registration closes", () => {
    const result = createTournamentSchema.safeParse(
      validInput({ startDate: new Date("2026-06-02T10:00:00Z") }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("startDate"))).toBe(true);
    }
  });

  it("rejects a name that is too short", () => {
    expect(createTournamentSchema.safeParse(validInput({ name: "FC" })).success).toBe(false);
  });
});

describe("editTournamentSchema", () => {
  const base = {
    name: "FC Friday Cup",
    maxPlayers: "16",
    registrationEnd: new Date("2026-06-05T10:00:00Z"),
    startDate: new Date("2026-06-06T20:00:00Z"),
  };

  it("accepts valid edits", () => {
    expect(editTournamentSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a start before the end of registration", () => {
    const result = editTournamentSchema.safeParse({ ...base, startDate: new Date("2026-06-04T10:00:00Z") });
    expect(result.success).toBe(false);
  });

  it("rejects a too short name", () => {
    expect(editTournamentSchema.safeParse({ ...base, name: "ab" }).success).toBe(false);
  });
});
