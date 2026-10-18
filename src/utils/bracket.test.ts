import { roundLabel } from "@/utils/bracket";

describe("roundLabel", () => {
  it("labels the last round as the final", () => {
    expect(roundLabel(3, 3)).toBe("Finale");
  });

  it("labels the second-to-last round as semi-finals", () => {
    expect(roundLabel(2, 3)).toBe("Demi-finales");
  });

  it("labels the third-to-last round as quarter-finals", () => {
    expect(roundLabel(2, 4)).toBe("Quarts de finale");
  });

  it("falls back to a generic round number further from the final", () => {
    expect(roundLabel(1, 4)).toBe("Tour 1");
  });

  it("labels a single-round (2-player) bracket as the final", () => {
    expect(roundLabel(1, 1)).toBe("Finale");
  });
});
