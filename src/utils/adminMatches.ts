// Filtres de l'écran « Matchs » de l'espace admin.
export type AdminMatchFilter = "schedule" | "confirm" | "dispute" | "open" | "all";

export const ADMIN_MATCH_FILTERS: { value: AdminMatchFilter; label: string }[] = [
  { value: "schedule", label: "À planifier" },
  { value: "confirm", label: "À confirmer" },
  { value: "dispute", label: "En litige" },
  { value: "open", label: "En cours" },
  { value: "all", label: "Tous" },
];

export const OPEN_ADMIN_STATUSES = ["READY", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"] as const;

type FilterableMatch = {
  status: string;
  player_1_id: string | null;
  player_2_id: string | null;
  scheduled_at: string | null;
};

// Même logique que la requête serveur : utile pour vérifier qu'un match appartient à un filtre.
export function matchesAdminFilter(match: FilterableMatch, filter: AdminMatchFilter): boolean {
  switch (filter) {
    case "schedule":
      return (
        (match.status === "SCHEDULED" || match.status === "READY") &&
        !!match.player_1_id &&
        !!match.player_2_id &&
        match.scheduled_at === null
      );
    case "confirm":
      return match.status === "AWAITING_CONFIRMATION";
    case "dispute":
      return match.status === "DISPUTED";
    case "open":
      return (OPEN_ADMIN_STATUSES as readonly string[]).includes(match.status);
    default:
      return true;
  }
}
