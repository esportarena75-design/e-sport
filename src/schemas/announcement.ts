import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().trim().min(3, { error: "3 caractères minimum" }).max(80, { error: "80 caractères maximum" }),
  body: z.string().trim().min(3, { error: "3 caractères minimum" }).max(500, { error: "500 caractères maximum" }),
  // "all" = tous les joueurs, sinon l'identifiant d'un tournoi.
  audience: z.string().min(1, { error: "Choisissez les destinataires" }),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
