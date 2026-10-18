import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { useAuthStore } from "@/features/auth/store";
import { useRankings } from "@/features/stats/hooks";
import type { RankingEntry } from "@/types/database";

export default function RankingScreen() {
  const session = useAuthStore((state) => state.session);
  const { data: rankings, isLoading, isError, refetch } = useRankings();

  if (isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState message="Impossible de charger le classement." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <Text className="py-4 text-2xl font-bold text-text">Classement</Text>
      <FlatList
        data={rankings ?? []}
        keyExtractor={(item) => item.user_id}
        contentContainerClassName="gap-2 pb-6"
        renderItem={({ item, index }) => (
          <RankingRow entry={item} rank={index + 1} isMe={item.user_id === session?.user.id} />
        )}
        ListEmptyComponent={<EmptyState message="Aucun joueur classé pour le moment." />}
      />
    </Screen>
  );
}

function RankingRow({
  entry,
  rank,
  isMe,
}: {
  entry: RankingEntry;
  rank: number;
  isMe: boolean;
}) {
  const medalBg = rank === 1 ? "bg-warning" : rank === 2 ? "bg-muted" : rank === 3 ? "bg-accent" : "bg-surface-alt";

  return (
    <Pressable
      onPress={() => router.push(`/player/${entry.user_id}`)}
      accessibilityRole="button"
      className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
        isMe ? "border-primary bg-surface" : "border-border bg-surface"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <View className={`h-6 w-6 items-center justify-center rounded-full ${medalBg}`}>
          <Text className="text-xs font-bold text-white">{rank}</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
          <Text className="font-bold text-white">{entry.username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text className="text-text">
          {entry.username}
          {isMe ? " (vous)" : ""}
        </Text>
      </View>
      <View className="items-end gap-0.5">
        <Text className="font-bold text-text">{entry.score} pts</Text>
        <Text className="text-xs text-muted">
          {entry.matches_won}V / {entry.matches_lost}D
        </Text>
      </View>
    </Pressable>
  );
}
