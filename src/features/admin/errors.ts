// Traduit les erreurs levées par les fonctions SQL admin (generate_bracket, resolve_dispute,
// admin_forfeit_match...) en messages lisibles. Les messages SQL restent en anglais côté base.
export function toFriendlyAdminError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Not authorized")) {
    return "Action réservée aux administrateurs.";
  }
  if (message.includes("Not enough participants")) {
    return "Il faut au moins 2 joueurs inscrits pour générer le bracket.";
  }
  if (message.includes("Too many participants")) {
    return "Il y a plus d'inscrits que de places dans ce tournoi.";
  }
  if (message.includes("Bracket already generated")) {
    return "Le bracket de ce tournoi a déjà été généré.";
  }
  if (message.includes("not ready for bracket generation")) {
    return "Le tournoi n'est pas dans un état permettant de générer le bracket.";
  }
  if (message.includes("Dispute is already closed")) {
    return "Ce litige a déjà été traité.";
  }
  if (message.includes("A winner is required")) {
    return "Choisissez un vainqueur pour résoudre ce litige.";
  }
  if (message.includes("Winner must be one of the match players")) {
    return "Le vainqueur choisi ne fait pas partie de ce match.";
  }
  if (message.includes("already closed")) {
    return "Ce match est déjà terminé.";
  }
  return "Une erreur est survenue. Réessayez.";
}
