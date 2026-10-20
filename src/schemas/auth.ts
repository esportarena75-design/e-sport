import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.email({ error: "Email invalide" }),
    password: z.string().min(8, { error: "8 caractères minimum" }),
    confirmPassword: z.string(),
    username: z
      .string()
      .min(3, { error: "3 caractères minimum" })
      .max(20, { error: "20 caractères maximum" })
      .regex(/^[a-zA-Z0-9_]+$/, { error: "Lettres, chiffres et _ uniquement" }),
    birthDate: z.date({ error: "Date de naissance requise" }),
    termsAccepted: z.boolean().refine((v) => v === true, {
      error: "Vous devez accepter les CGU",
    }),
    privacyAccepted: z.boolean().refine((v) => v === true, {
      error: "Vous devez accepter la politique de confidentialité",
    }),
    rulesAccepted: z.boolean().refine((v) => v === true, {
      error: "Vous devez accepter le règlement",
    }),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Les mots de passe ne correspondent pas",
        path: ["confirmPassword"],
      });
    }

    const minBirthDate = new Date();
    minBirthDate.setFullYear(minBirthDate.getFullYear() - 18);
    if (data.birthDate > minBirthDate) {
      ctx.addIssue({
        code: "custom",
        message: "Vous devez avoir au moins 18 ans",
        path: ["birthDate"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email({ error: "Email invalide" }),
  password: z.string().min(1, { error: "Mot de passe requis" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: "Email invalide" }),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, { error: "8 caractères minimum" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
