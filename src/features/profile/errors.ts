export function toFriendlyProfileError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("profiles_username_lower_idx") || message.includes("duplicate key")) {
    return "Ce pseudo est déjà pris.";
  }
  if (message.includes("every 14 days")) {
    return "Vous ne pouvez changer de pseudo qu'une fois tous les 14 jours.";
  }
  if (message === "AVATAR_TYPE" || message.includes("mime type")) {
    return "Format non accepté : choisissez une image JPEG, PNG ou WebP.";
  }
  if (message === "AVATAR_TOO_LARGE" || message.includes("exceeded the maximum")) {
    return "Image trop lourde (2 Mo maximum).";
  }
  return "Une erreur est survenue. Réessayez.";
}
