
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Screen } from "@/components/Screen";
import { useAuthStore } from "@/features/auth/store";
import { useMyMatches } from "@/features/matches/hooks";
import type { MatchPublic } from "@/types/database";

export default function MatchesScreen() {
  const session = useAuthStore((state) => state.session);
  const { data: matches, isLoading, isError, refetch } = useMyMatches(session?.user.id);

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
        <ErrorState message="Impossible de charger vos matchs." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen edges={["top"]}>
      <Text className="py-4 font-bold text-text text-3xl">Mes matchs</Text>
      <FlatList
        data={matches ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 pb-28"
        renderItem={({ item }) => <MatchRow match={item} myId={session?.user.id} />}
        ListEmptyComponent={<EmptyState message="Aucun match pour le moment." />}
      />
    </Screen>
  );
}

function MatchRow({ match, myId }: { match: MatchPublic; myId: string | undefined }) {
  const opponentName =
    myId === match.player_1_id ? match.player_2_username : match.player_1_username;
  const myScore = myId === match.player_1_id ? match.player_1_score : match.player_2_score;
  const opponentScore = myId === match.player_1_id ? match.player_2_score : match.player_1_score;
  const isWinner = !!match.winner_id && match.winner_id === myId;

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="gap-1 bg-surface p-4 border border-border rounded-2xl"
      accessibilityRole="button"
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-text">vs {opponentName ?? "À déterminer"}</Text>
        <MatchStatusBadge status={match.status} />
      </View>
      {myScore !== null && opponentScore !== null ? (
        <Text className={isWinner ? "text-success" : "text-muted"}>
          {myScore} - {opponentScore}
          {match.status === "COMPLETED" ? (isWinner ? " · Victoire" : " · Défaite") : ""}
        </Text>
      ) : null}
    </Pressable>
  );
}
