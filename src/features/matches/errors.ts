export function toFriendlyMatchError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Not a participant")) {
    return "Vous ne participez pas à ce match.";
  }
  if (message.includes("cannot be reported")) {
    return "Ce match ne peut pas être déclaré actuellement.";
  }
  if (message.includes("negative")) {
    return "Les scores doivent être positifs.";
  }
  if (message.includes("cannot confirm your own")) {
    return "Vous ne pouvez pas confirmer votre propre déclaration.";
  }
  if (message.includes("no result awaiting confirmation")) {
    return "Aucun résultat à confirmer pour ce match.";
  }
  if (message.includes("drawn score")) {
    return "Un match nul n'est pas possible dans ce format.";
  }
  if (message.includes("already closed")) {
    return "Ce match est déjà terminé.";
  }
  return "Une erreur est survenue. Réessayez.";
}
