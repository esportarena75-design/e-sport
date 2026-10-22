// Libellés lisibles des actions du journal admin (colonne `action` de admin_logs).
const ACTION_LABELS: Record<string, string> = {
  apply_sanction: "Sanction appliquée",
  lift_sanction: "Sanction levée",
  admin_forfeit_match: "Forfait déclaré",
  disqualify_participant: "Joueur disqualifié",
  schedule_match: "Match planifié",
  cancel_tournament: "Tournoi annulé",
  resolve_dispute: "Litige résolu",
};

export function adminActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, " ");
}

type LogDetails = Record<string, unknown> | null;

// Résumé d'une ligne de journal à partir de son JSON de détails (motif, type de sanction…).
export function adminLogSummary(details: LogDetails): string {
  if (!details) return "";
  const parts: string[] = [];
  if (typeof details.type === "string") parts.push(details.type);
  if (typeof details.reason === "string" && details.reason) parts.push(`« ${details.reason} »`);
  if (typeof details.end_date === "string") {
    parts.push(`jusqu'au ${new Date(details.end_date).toLocaleDateString("fr-FR")}`);
  }
  return parts.join(" · ");
}
