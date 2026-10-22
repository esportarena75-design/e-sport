import { z } from "zod";

const httpsUrl = z
  .string()
  .trim()
  .regex(/^https:\/\/\S+$/, { error: "Lien https:// valide requis" });

export const createNewsSchema = z.object({
  title: z.string().trim().min(3, { error: "3 caractères minimum" }).max(120, { error: "120 caractères maximum" }),
  summary: z.string().trim().min(3, { error: "3 caractères minimum" }).max(280, { error: "280 caractères maximum" }),
  tag: z.string().trim().max(24, { error: "24 caractères maximum" }).optional(),
  sourceName: z.string().trim().min(2, { error: "Nom de la source requis" }).max(60),
  sourceUrl: httpsUrl,
  imageUrl: z.union([httpsUrl, z.literal("")]).optional(),
});

export type CreateNewsInput = z.infer<typeof createNewsSchema>;
