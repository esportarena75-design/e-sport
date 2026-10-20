import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { useMyMatches } from "@/features/matches/hooks";
import { useNow } from "@/hooks/useNow";
import type { MatchPublic } from "@/types/database";
import { isBye } from "@/utils/bracket";
import { formatCountdown, formatMatchDate, getMatchStart, splitMyMatches } from "@/utils/matches";

export function MatchesSection() {
  const session = useAuthStore((state) => state.session);
  const myId = session?.user.id;
  const { data: matches, isLoading, isError, refetch } = useMyMatches(myId);
  const now = useNow(1000);

  if (isLoading) return <ActivityIndicator color={colors.primary} />;

  if (isError) {
    return (
      <Pressable onPress={() => refetch()} accessibilityRole="button">
        <Text className="text-muted">
          Impossible de charger vos matchs. <Text className="text-primary">Réessayer</Text>
        </Text>
      </Pressable>
    );
  }

  const { upcoming, history } = splitMyMatches(matches ?? []);

  return (
    <View className="gap-6">
      <View className="gap-3">
        <Text className="text-lg font-semibold text-text">À venir</Text>
        {upcoming.length === 0 ? (
          <Text className="text-muted">Aucun match à venir.</Text>
        ) : (
          upcoming.map((match) => <UpcomingMatchCard key={match.id} match={match} myId={myId} now={now} />)
        )}
      </View>

      <View className="gap-3">
        <Text className="text-lg font-semibold text-text">Historique</Text>
        {history.length === 0 ? (
          <Text className="text-muted">Aucun match terminé pour le moment.</Text>
        ) : (
          history.map((match) => <HistoryRow key={match.id} match={match} myId={myId} />)
        )}
      </View>
    </View>
  );
}

function opponentOf(match: MatchPublic, myId: string | undefined) {
  return myId === match.player_1_id ? match.player_2_username : match.player_1_username;
}

function UpcomingMatchCard({ match, myId, now }: { match: MatchPublic; myId?: string; now: number }) {
  const start = getMatchStart(match);
  const opponent = opponentOf(match, myId);

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      accessibilityRole="button"
      className="gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs text-muted" numberOfLines={1}>
          {match.tournament_name ?? "Tournoi"} · Tour {match.round}
        </Text>
        <MatchStatusBadge status={match.status} />
      </View>

      <Text className="text-xl font-bold text-text" numberOfLines={1}>
        vs {opponent ?? "À déterminer"}
      </Text>

      <View className="flex-row items-center justify-between border-t border-border pt-3">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <Text className="text-sm text-muted">{start ? formatMatchDate(start) : "Date à définir"}</Text>
        </View>
        {start ? (
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text className="text-sm font-semibold text-primary">{formatCountdown(start, now)}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function HistoryRow({ match, myId }: { match: MatchPublic; myId?: string }) {
  const bye = isBye(match);
  const isMe1 = myId === match.player_1_id;
  const myScore = isMe1 ? match.player_1_score : match.player_2_score;
  const opponentScore = isMe1 ? match.player_2_score : match.player_1_score;
  const won = !!match.winner_id && match.winner_id === myId;
  const cancelled = match.status === "CANCELLED";

  let result = "";
  let resultColor = "text-muted";
  if (bye) {
    result = "Exempt · qualifié d'office";
  } else if (cancelled) {
    result = "Annulé";
  } else if (match.winner_id) {
    result = won ? "Victoire" : "Défaite";
    resultColor = won ? "text-success" : "text-error";
    if (match.status === "FORFEIT") result += " (forfait)";
  }

  const date = match.completed_at ?? match.created_at;

  return (
    <Pressable
      onPress={bye ? undefined : () => router.push(`/match/${match.id}`)}
      disabled={bye}
      accessibilityRole="button"
      className="gap-1 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-text" numberOfLines={1}>
          {bye ? (match.tournament_name ?? "Tournoi") : `vs ${opponentOf(match, myId) ?? "—"}`}
        </Text>
        {myScore !== null && opponentScore !== null ? (
          <Text className="font-bold text-text">
            {myScore} - {opponentScore}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center justify-between">
        <Text className={`text-sm font-medium ${resultColor}`}>{result}</Text>
        <Text className="text-xs text-muted">
          {match.tournament_name ? `${match.tournament_name} · ` : ""}
          {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </Text>
      </View>
    </Pressable>
  );
}
