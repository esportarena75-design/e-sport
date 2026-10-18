import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { StatusBadge } from "@/components/StatusBadge";
import { gradients } from "@/constants/colors";
import type { TournamentPublic } from "@/types/database";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TournamentCard({ tournament }: { tournament: TournamentPublic }) {
  return (
    <Pressable
      onPress={() => router.push(`/tournament/${tournament.id}`)}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center justify-between px-4 py-3"
      >
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-white/15">
            <Ionicons name="game-controller" size={16} color="#FFFFFF" />
          </View>
          <Text className="text-xs font-medium text-white/80">
            {tournament.game_name} · {tournament.platform_name}
          </Text>
        </View>
        <StatusBadge status={tournament.status} />
      </LinearGradient>

      <View className="gap-2 p-4">
        <Text className="text-lg font-semibold text-text">{tournament.name}</Text>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="people" size={14} color="#9C93C0" />
            <Text className="text-muted">
              {tournament.participant_count} / {tournament.max_players}
            </Text>
          </View>
          <Text className="text-muted">{formatDate(tournament.start_date)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
