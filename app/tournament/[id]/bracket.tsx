import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useMatches } from "@/features/bracket/hooks";
import type { MatchPublic } from "@/types/database";
import { isBye, roundLabel } from "@/utils/bracket";

export default function TournamentBracketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: matches, isLoading } = useMatches(id);

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-muted">
            Le bracket n&apos;a pas encore été généré pour ce tournoi.
          </Text>
        </View>
      </Screen>
    );
  }

  const totalRounds = Math.max(...matches.map((m) => m.round));
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <Screen edges={["top", "bottom"]}>
      <Text className="pb-2 pt-4 text-2xl font-bold text-text">Bracket</Text>
      <ScrollView horizontal contentContainerClassName="gap-4 px-4 pb-28 pt-2">
        {rounds.map((round) => (
          <View key={round} className="w-60 gap-3">
            <View className="self-center rounded-full bg-surface-alt px-4 py-1.5">
              <Text className="text-center text-sm font-semibold text-text">
                {roundLabel(round, totalRounds)}
              </Text>
            </View>
            {matches
              .filter((m) => m.round === round)
              .map((match) => (
                <MatchNode key={match.id} match={match} />
              ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

function MatchNode({ match }: { match: MatchPublic }) {
  const isDone = !!match.winner_id;
  const bye = isBye(match);
  return (
    <Pressable
      onPress={bye ? undefined : () => router.push(`/match/${match.id}`)}
      disabled={bye}
      className="flex-row overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <View className={`w-1 ${isDone ? "bg-primary" : "bg-border"}`} />
      <View className="flex-1 gap-2 p-3">
        <PlayerRow
          name={match.player_1_username}
          emptyLabel={bye ? "Exempt" : "À déterminer"}
          score={match.player_1_score}
          isWinner={isDone && match.winner_id === match.player_1_id}
        />
        <View className="h-px bg-border" />
        <PlayerRow
          name={match.player_2_username}
          emptyLabel={bye ? "Exempt" : "À déterminer"}
          score={match.player_2_score}
          isWinner={isDone && match.winner_id === match.player_2_id}
        />
      </View>
    </Pressable>
  );
}

function PlayerRow({
  name,
  emptyLabel,
  score,
  isWinner,
}: {
  name: string | null;
  emptyLabel: string;
  score: number | null;
  isWinner: boolean;
}) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="flex-1 flex-row items-center gap-2">
        <View
          className={`h-6 w-6 items-center justify-center rounded-full ${
            isWinner ? "bg-primary" : "bg-surface-alt"
          }`}
        >
          <Text className="text-xs font-bold text-white">{initial}</Text>
        </View>
        <Text
          className={isWinner ? "flex-1 font-semibold text-text" : "flex-1 text-muted"}
          numberOfLines={1}
        >
          {name ?? emptyLabel}
        </Text>
      </View>
      {score !== null ? (
        <View className={`rounded-full px-2.5 py-0.5 ${isWinner ? "bg-primary" : "bg-surface-alt"}`}>
          <Text className="text-xs font-bold text-white">{score}</Text>
        </View>
      ) : null}
    </View>
  );
}
