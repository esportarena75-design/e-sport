import { z } from "zod";

export const gameAccountSchema = z.object({
  gameId: z.string().min(1, { error: "Choisissez un jeu" }),
  platformId: z.string().min(1, { error: "Choisissez une plateforme" }),
  playerIdentifier: z
    .string()
    .min(2, { error: "2 caractères minimum" })
    .max(40, { error: "40 caractères maximum" }),
});

export type GameAccountInput = z.infer<typeof gameAccountSchema>;
