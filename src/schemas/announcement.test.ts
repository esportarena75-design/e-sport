import { announcementSchema } from "@/schemas/announcement";

describe("announcementSchema", () => {
  const valid = { title: "Changement d'heure", body: "Le tournoi démarre à 21h.", audience: "all" };

  it("accepts a valid announcement", () => {
    expect(announcementSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects short or too long text", () => {
    expect(announcementSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(announcementSchema.safeParse({ ...valid, body: "x".repeat(501) }).success).toBe(false);
  });

  it("requires an audience", () => {
    expect(announcementSchema.safeParse({ ...valid, audience: "" }).success).toBe(false);
  });
});
