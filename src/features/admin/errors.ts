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
  if (message.includes("You cannot sanction yourself")) {
    return "Vous ne pouvez pas vous sanctionner vous-même.";
  }
  if (message.includes("Insufficient privileges to sanction")) {
    return "Vous ne pouvez pas sanctionner un administrateur de rang égal ou supérieur.";
  }
  if (message.includes("Tournament is already finished")) {
    return "Ce tournoi est déjà terminé ou annulé.";
  }
  if (message.includes("That player is not in this match")) {
    return "Ce joueur ne participe pas à ce match.";
  }
  if (message.includes("The other slot has no player")) {
    return "Il n'y a pas d'adversaire à faire avancer sur ce match.";
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
  if (message.includes("Scheduled date must be in the future")) {
    return "Choisissez une date et une heure dans le futur.";
  }
  if (message.includes("Match can no longer be scheduled")) {
    return "Ce match ne peut plus être planifié (déjà commencé ou terminé).";
  }
  if (message.includes("Invalid end date")) {
    return "La date de fin de suspension est invalide.";
  }
  if (message.includes("Tournament can no longer be edited")) {
    return "Ce tournoi ne peut plus être modifié (bracket généré, terminé ou annulé).";
  }
  if (message.includes("below the number of registered players")) {
    return "Il y a déjà plus d'inscrits que cette taille de tournoi.";
  }
  if (message.includes("Tournament must start after registration ends")) {
    return "Le tournoi doit démarrer après la fin des inscriptions.";
  }
  if (message.includes("Registration end must be after registration start")) {
    return "La fin des inscriptions doit être après leur début.";
  }
  if (message.includes("Invalid tournament name")) {
    return "Le nom doit faire entre 3 et 80 caractères.";
  }
  if (message.includes("A reason is required")) {
    return "Saisissez un motif (3 caractères minimum).";
  }
  if (message.includes("User has no active sanction")) {
    return "Ce joueur n'a aucune suspension ni aucun bannissement en cours.";
  }
  if (message.includes("User not found")) {
    return "Joueur introuvable.";
  }
  if (message.includes("already closed")) {
    return "Ce match est déjà terminé.";
  }
  return "Une erreur est survenue. Réessayez.";
}
