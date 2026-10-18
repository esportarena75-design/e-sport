import { disputeSchema, reportMatchSchema } from "@/schemas/match";

describe("reportMatchSchema", () => {
  it("accepts valid numeric scores as strings", () => {
    expect(reportMatchSchema.safeParse({ myScore: "4", opponentScore: "2" }).success).toBe(true);
  });

  it("rejects an empty score", () => {
    expect(reportMatchSchema.safeParse({ myScore: "", opponentScore: "2" }).success).toBe(false);
  });

  it("rejects a non-numeric score", () => {
    expect(reportMatchSchema.safeParse({ myScore: "four", opponentScore: "2" }).success).toBe(
      false,
    );
  });

  it("rejects a negative score", () => {
    expect(reportMatchSchema.safeParse({ myScore: "-1", opponentScore: "2" }).success).toBe(false);
  });

  it("accepts an optional comment", () => {
    const result = reportMatchSchema.safeParse({
      myScore: "4",
      opponentScore: "2",
      comment: "GG",
    });
    expect(result.success).toBe(true);
  });
});

describe("disputeSchema", () => {
  it("accepts a known reason", () => {
    expect(disputeSchema.safeParse({ reason: "OPPONENT_ABSENT" }).success).toBe(true);
  });

  it("rejects an unknown reason", () => {
    expect(disputeSchema.safeParse({ reason: "NOT_A_REAL_REASON" }).success).toBe(false);
  });
});
