import { z } from "zod";

export const reportMatchSchema = z.object({
  myScore: z
    .string()
    .min(1, { error: "Score requis" })
    .regex(/^\d+$/, { error: "Nombre entier positif requis" }),
  opponentScore: z
    .string()
    .min(1, { error: "Score requis" })
    .regex(/^\d+$/, { error: "Nombre entier positif requis" }),
  comment: z.string().max(280, { error: "280 caractères maximum" }).optional(),
});

export type ReportMatchInput = z.infer<typeof reportMatchSchema>;

export const disputeSchema = z.object({
  reason: z.enum(
    [
      "RESULT_CONTESTED",
      "OPPONENT_ABSENT",
      "DISCONNECTION",
      "GAME_SERVER_DOWN",
      "CONNECTION_ISSUE",
      "WRONG_IDENTIFIER",
      "ABUSIVE_BEHAVIOR",
      "CHEATING_SUSPICION",
      "OTHER",
    ],
    { error: "Choisissez un motif" },
  ),
  description: z.string().max(500, { error: "500 caractères maximum" }).optional(),
});

export type DisputeInput = z.infer<typeof disputeSchema>;
