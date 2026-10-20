import { isLegalDocId, LEGAL_DOCS } from "@/constants/legal";

describe("legal docs", () => {
  it("accepts only known ids", () => {
    expect(isLegalDocId("terms")).toBe(true);
    expect(isLegalDocId("privacy")).toBe(true);
    expect(isLegalDocId("rules")).toBe(true);
    expect(isLegalDocId("toString")).toBe(false);
    expect(isLegalDocId(undefined)).toBe(false);
  });

  it("has content for every document", () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });
});
