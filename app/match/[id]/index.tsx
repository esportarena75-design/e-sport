import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { toFriendlyMatchError } from "@/features/matches/errors";
import { useConfirmMatchResult, useMatch, useMatchReports } from "@/features/matches/hooks";

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((state) => state.session);
  const myId = session?.user.id;
  const { data: match, isLoading } = useMatch(id);
  const { data: reports } = useMatchReports(id);
  const confirmResult = useConfirmMatchResult(id ?? "");
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading || !match) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const isParticipant = myId === match.player_1_id || myId === match.player_2_id;
  const lastReport = reports?.[0];
  const isLastReporter = lastReport?.reported_by === myId;
  const isFinished = match.status === "COMPLETED" || match.status === "FORFEIT";

  const handleConfirm = async () => {
    setActionError(null);
    try {
      await confirmResult.mutateAsync();
    } catch (error) {
      setActionError(toFriendlyMatchError(error));
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 py-6">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="flex-1 text-xl font-bold text-text">Round {match.round}</Text>
          <MatchStatusBadge status={match.status} />
        </View>

        <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
          <PlayerLine
            name={match.player_1_username}
            score={match.player_1_score}
            isMe={myId === match.player_1_id}
            isWinner={!!match.winner_id && match.winner_id === match.player_1_id}
          />
          <View className="h-px bg-border" />
          <PlayerLine
            name={match.player_2_username}
            score={match.player_2_score}
            isMe={myId === match.player_2_id}
            isWinner={!!match.winner_id && match.winner_id === match.player_2_id}
          />
        </View>

        {actionError ? <Text className="text-sm text-error">{actionError}</Text> : null}

        {!isParticipant ? (
          <Text className="text-center text-muted">
            Vous ne participez pas à ce match — affichage lecture seule.
          </Text>
        ) : null}

        {isParticipant && (match.status === "READY" || match.status === "IN_PROGRESS") ? (
          <Button title="Déclarer le résultat" onPress={() => router.push(`/match/${match.id}/report`)} />
        ) : null}

        {isParticipant && match.status === "AWAITING_CONFIRMATION" ? (
          isLastReporter ? (
            <Text className="text-center text-warning">
              Résultat déclaré, en attente de confirmation de votre adversaire.
            </Text>
          ) : (
            <View className="gap-3">
              <Text className="text-center text-text">
                Votre adversaire déclare {match.player_1_score} - {match.player_2_score}.
              </Text>
              <Button
                title="Confirmer"
                loading={confirmResult.isPending}
                onPress={handleConfirm}
              />
            </View>
          )
        ) : null}

        {isParticipant && match.status === "DISPUTED" ? (
          <Text className="text-center text-error">
            Un litige est en cours sur ce match. Un administrateur va trancher.
          </Text>
        ) : null}

        {isFinished ? (
          <Text className="text-center text-success">
            {match.winner_id === myId ? "Victoire confirmée !" : "Match terminé."}
          </Text>
        ) : null}

        {isParticipant && !isFinished && match.status !== "CANCELLED" ? (
          <Link href={`/match/${match.id}/dispute`} asChild>
            <Pressable className="items-center rounded-2xl border border-border bg-surface px-4 py-3">
              <Text className="text-muted">Signaler un problème</Text>
            </Pressable>
          </Link>
        ) : null}

        <Link href={`/tournament/${match.tournament_id}/bracket`} asChild>
          <Pressable className="items-center rounded-2xl border border-border bg-surface px-4 py-3">
            <Text className="text-text">Voir le bracket</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  );
}

function PlayerLine({
  name,
  score,
  isMe,
  isWinner,
}: {
  name: string | null;
  score: number | null;
  isMe: boolean;
  isWinner: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className={isWinner ? "font-semibold text-success" : "text-text"}>
        {name ?? "À déterminer"}
        {isMe ? " (vous)" : ""}
      </Text>
      {score !== null ? <Text className="text-lg text-text">{score}</Text> : null}
    </View>
  );
}
