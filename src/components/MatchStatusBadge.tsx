import { Text, View } from "react-native";

import type { MatchStatus } from "@/types/database";

const STATUS_META: Record<MatchStatus, { label: string; bg: string }> = {
  SCHEDULED: { label: "Programmé", bg: "bg-surface-alt" },
  READY: { label: "Prêt", bg: "bg-primary" },
  IN_PROGRESS: { label: "En cours", bg: "bg-live" },
  AWAITING_CONFIRMATION: { label: "À confirmer", bg: "bg-warning" },
  DISPUTED: { label: "Litige", bg: "bg-error" },
  COMPLETED: { label: "Terminé", bg: "bg-success" },
  FORFEIT: { label: "Forfait", bg: "bg-surface-alt" },
  CANCELLED: { label: "Annulé", bg: "bg-error" },
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const meta = STATUS_META[status];
  return (
    <View className={`rounded-full px-3 py-1 ${meta.bg}`}>
      <Text className="text-xs font-semibold text-white">{meta.label}</Text>
    </View>
  );
}
