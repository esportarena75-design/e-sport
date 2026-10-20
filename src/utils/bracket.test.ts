import { isBye, roundLabel } from "@/utils/bracket";

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

describe("isBye", () => {
  const base = { status: "FORFEIT", player_1_id: "a", player_2_id: null, winner_id: "a" };

  it("detects a bye (single player, closed by forfeit)", () => {
    expect(isBye(base)).toBe(true);
    expect(isBye({ ...base, player_1_id: null, player_2_id: "b", winner_id: "b" })).toBe(true);
  });

  it("ignores a real forfeit between two players", () => {
    expect(isBye({ ...base, player_2_id: "b" })).toBe(false);
  });

  it("ignores matches still to play", () => {
    expect(isBye({ ...base, status: "READY", winner_id: null })).toBe(false);
  });
});
