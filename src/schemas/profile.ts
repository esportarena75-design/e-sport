import { z } from "zod";

// Mêmes règles que la table `profiles` (username_format, profiles_bio_length).
export const editProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { error: "3 caractères minimum" })
    .max(20, { error: "20 caractères maximum" })
    .regex(/^[a-zA-Z0-9_]+$/, { error: "Lettres, chiffres et _ uniquement" }),
  bio: z.string().max(160, { error: "160 caractères maximum" }),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
