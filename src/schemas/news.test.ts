import { createNewsSchema } from "@/schemas/news";

const valid = {
  title: "LOUD champion",
  summary: "LOUD remporte la finale.",
  sourceName: "Actu-Lan",
  sourceUrl: "https://example.com/article",
};

describe("createNewsSchema", () => {
  it("accepts a minimal valid article", () => {
    expect(createNewsSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an empty optional image", () => {
    expect(createNewsSchema.safeParse({ ...valid, imageUrl: "" }).success).toBe(true);
  });

  it("rejects non-https links", () => {
    expect(createNewsSchema.safeParse({ ...valid, sourceUrl: "http://example.com" }).success).toBe(false);
    expect(createNewsSchema.safeParse({ ...valid, imageUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects a too long summary", () => {
    expect(createNewsSchema.safeParse({ ...valid, summary: "x".repeat(281) }).success).toBe(false);
  });
});
