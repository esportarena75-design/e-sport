export function toFriendlyTournamentError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Account is not active")) {
    return "Votre compte ne peut pas s'inscrire à un tournoi actuellement.";
  }
  if (message.includes("Registration is not open")) {
    return "Les inscriptions sont fermées pour ce tournoi.";
  }
  if (message.includes("Already registered")) {
    return "Vous êtes déjà inscrit à ce tournoi.";
  }
  if (message.includes("Tournament is full")) {
    return "Ce tournoi est complet.";
  }
  if (message.includes("No matching game account")) {
    return "Ajoutez un identifiant gaming pour ce jeu et cette plateforme avant de vous inscrire.";
  }
  if (message.includes("Unregistration was blocked")) {
    return "Impossible de vous désinscrire (les inscriptions sont peut-être déjà fermées).";
  }
  return "Une erreur est survenue. Réessayez.";
}
