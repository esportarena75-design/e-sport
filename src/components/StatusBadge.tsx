import { Text, View } from "react-native";

import type { TournamentStatus } from "@/types/database";

const STATUS_META: Record<TournamentStatus, { label: string; bg: string }> = {
  DRAFT: { label: "Brouillon", bg: "bg-surface-alt" },
  REGISTRATION_OPEN: { label: "Inscriptions ouvertes", bg: "bg-success" },
  REGISTRATION_CLOSED: { label: "Inscriptions fermées", bg: "bg-warning" },
  IN_PROGRESS: { label: "En cours", bg: "bg-live" },
  COMPLETED: { label: "Terminé", bg: "bg-surface-alt" },
  CANCELLED: { label: "Annulé", bg: "bg-error" },
};

export function StatusBadge({ status }: { status: TournamentStatus }) {
  const meta = STATUS_META[status];
  return (
    <View className={`rounded-full px-3 py-1 ${meta.bg}`}>
      <Text className="text-xs font-semibold text-white">{meta.label}</Text>
    </View>
  );
}
