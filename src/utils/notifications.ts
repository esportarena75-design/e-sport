import type { Ionicons } from "@expo/vector-icons";

type NotificationData = Record<string, unknown> | null | undefined;
type IconName = keyof typeof Ionicons.glyphMap;

// Où mène une notification quand on la touche (dans la liste ou depuis la barre de notifications).
// Retourne null quand elle n'a pas de destination (annonce générale, par exemple).
export function notificationTarget(type: string, data: NotificationData): string | null {
  if (data?.admin === true && typeof data.dispute_id === "string") return "/admin/disputes";
  if (typeof data?.match_id === "string") return `/match/${data.match_id}`;
  if (typeof data?.tournament_id === "string") return `/tournament/${data.tournament_id}`;
  if (type === "sanction_applied" || type === "sanction_lifted" || type === "suspension_lifted") return null;
  return null;
}

const ICONS: Record<string, IconName> = {
  registration_confirmed: "checkmark-circle-outline",
  tournament_started: "play-circle-outline",
  tournament_completed: "trophy-outline",
  tournament_reminder: "alarm-outline",
  tournament_updated: "calendar-outline",
  tournament_cancelled: "close-circle-outline",
  match_scheduled: "calendar-outline",
  match_reminder: "alarm-outline",
  next_round_ready: "arrow-forward-circle-outline",
  bye_round_1: "arrow-forward-circle-outline",
  result_submitted: "document-text-outline",
  victory_confirmed: "trophy-outline",
  dispute_opened: "warning-outline",
  dispute_resolved: "hammer-outline",
  admin_dispute_opened: "warning-outline",
  sanction_applied: "alert-circle-outline",
  sanction_lifted: "shield-checkmark-outline",
  suspension_lifted: "shield-checkmark-outline",
  announcement: "megaphone-outline",
};

export function notificationIcon(type: string): IconName {
  return ICONS[type] ?? "notifications-outline";
}
