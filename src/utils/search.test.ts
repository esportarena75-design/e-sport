import { toLikePattern } from "@/utils/search";

describe("toLikePattern", () => {
  it("wraps the text in wildcards", () => {
    expect(toLikePattern("  cup ")).toBe("%cup%");
  });

  it("escapes LIKE wildcards typed by the user", () => {
    expect(toLikePattern("100%_")).toBe("%100\\%\\_%");
  });

  it("removes characters that break filter syntax", () => {
    expect(toLikePattern("a,b(c)")).toBe("%a b c %");
  });
});
