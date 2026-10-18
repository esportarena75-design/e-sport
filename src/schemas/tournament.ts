import { z } from "zod";

export const createTournamentSchema = z
  .object({
    name: z.string().min(3, { error: "3 caractères minimum" }).max(80, { error: "80 caractères maximum" }),
    description: z.string().max(500, { error: "500 caractères maximum" }).optional(),
    gameId: z.string().min(1, { error: "Choisissez un jeu" }),
    platformId: z.string().min(1, { error: "Choisissez une plateforme" }),
    maxPlayers: z.string().min(1, { error: "Choisissez une taille" }),
    registrationStart: z.date({ error: "Date requise" }),
    registrationEnd: z.date({ error: "Date requise" }),
    startDate: z.date({ error: "Date requise" }),
    rules: z.string().max(2000, { error: "2000 caractères maximum" }).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.registrationStart >= data.registrationEnd) {
      ctx.addIssue({
        code: "custom",
        message: "La fin des inscriptions doit être après le début",
        path: ["registrationEnd"],
      });
    }
    if (data.registrationEnd > data.startDate) {
      ctx.addIssue({
        code: "custom",
        message: "Le tournoi doit démarrer après la fin des inscriptions",
        path: ["startDate"],
      });
    }
  });

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
