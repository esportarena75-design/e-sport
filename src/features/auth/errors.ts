export function toFriendlyErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("duplicate key") && message.includes("username")) {
    return "Ce pseudo est déjà utilisé.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("Email not confirmed")) {
    return "Merci de confirmer votre email avant de vous connecter.";
  }
  return "Une erreur est survenue. Réessayez.";
}
