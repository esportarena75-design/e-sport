import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { useRankings } from "@/features/stats/hooks";
import type { RankingEntry } from "@/types/database";

const TOP_COUNT = 20;

export function RankingSection() {
  const session = useAuthStore((state) => state.session);
  const myId = session?.user.id;
  const { data: rankings, isLoading, isError, refetch } = useRankings();

  if (isLoading) return <ActivityIndicator color={colors.primary} />;

  if (isError) {
    return (
      <Pressable onPress={() => refetch()} accessibilityRole="button">
        <Text className="text-muted">
          Impossible de charger le classement. <Text className="text-primary">Réessayer</Text>
        </Text>
      </Pressable>
    );
  }

  const all = rankings ?? [];
  if (all.length === 0) return <Text className="text-muted">Aucun joueur classé pour le moment.</Text>;

  const top = all.slice(0, TOP_COUNT);
  const myIndex = all.findIndex((entry) => entry.user_id === myId);
  const myEntryOutsideTop = myIndex >= TOP_COUNT ? all[myIndex] : null;

  return (
    <View className="gap-2">
      {myIndex >= 0 ? (
        <Text className="pb-1 text-sm text-muted">
          Vous êtes {myIndex + 1}
          {myIndex === 0 ? "er" : "e"} sur {all.length}
        </Text>
      ) : null}

      {top.map((entry, index) => (
        <RankingRow key={entry.user_id} entry={entry} rank={index + 1} isMe={entry.user_id === myId} />
      ))}

      {myEntryOutsideTop ? (
        <>
          <Text className="text-center text-muted">···</Text>
          <RankingRow entry={myEntryOutsideTop} rank={myIndex + 1} isMe />
        </>
      ) : null}
    </View>
  );
}

function RankingRow({ entry, rank, isMe }: { entry: RankingEntry; rank: number; isMe: boolean }) {
  const medalBg =
    rank === 1 ? "bg-warning" : rank === 2 ? "bg-muted" : rank === 3 ? "bg-accent" : "bg-surface-alt";

  return (
    <Pressable
      onPress={() => router.push(`/player/${entry.user_id}`)}
      accessibilityRole="button"
      className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
        isMe ? "border-primary bg-surface" : "border-border bg-surface"
      }`}
    >
      <View className="flex-1 flex-row items-center gap-3 pr-2">
        <View className={`h-6 w-6 items-center justify-center rounded-full ${medalBg}`}>
          <Text className="text-xs font-bold text-white">{rank}</Text>
        </View>
        <Avatar uri={entry.avatar_url} name={entry.username} size={36} />
        <Text className="flex-1 text-text" numberOfLines={1}>
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
