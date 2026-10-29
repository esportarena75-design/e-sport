import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { DateField } from "@/components/DateField";
import { ErrorState } from "@/components/ErrorState";
import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useAdminMatches, useScheduleMatch } from "@/features/admin/hooks";
import type { MatchPublic } from "@/types/database";
import { ADMIN_MATCH_FILTERS, type AdminMatchFilter } from "@/utils/adminMatches";
import { isBye } from "@/utils/bracket";
import { formatMatchDate } from "@/utils/matches";

export default function AdminMatchesScreen() {
  return (
    <AdminGuard>
      <AdminMatchesContent />
    </AdminGuard>
  );
}

function AdminMatchesContent() {
  const [filter, setFilter] = useState<AdminMatchFilter>("schedule");
  const { data, isLoading, isError, refetch } = useAdminMatches(filter);
  const matches = (data ?? []).filter((m) => !isBye(m));

  return (
    <Screen edges={["bottom"]}>
      <View className="py-4">
        <ChipSelect
          label="Afficher"
          options={ADMIN_MATCH_FILTERS}
          value={filter}
          onChange={(v) => setFilter(v as AdminMatchFilter)}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isError ? (
        <ErrorState message="Impossible de charger les matchs." onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 pb-6"
          renderItem={({ item }) => <AdminMatchRow match={item} />}
          ListEmptyComponent={<Text className="mt-8 text-center text-muted">Aucun match dans cette liste.</Text>}
        />
      )}
    </Screen>
  );
}

function AdminMatchRow({ match }: { match: MatchPublic }) {
  const schedule = useScheduleMatch(match.tournament_id);
  const canSchedule =
    (match.status === "SCHEDULED" || match.status === "READY") && !!match.player_1_id && !!match.player_2_id;

  const handleSchedule = (date: Date) =>
    Alert.alert(
      "Planifier le match",
      `Fixer le match au ${date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })} ? Les deux joueurs seront prévenus.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Planifier",
          onPress: () =>
            schedule.mutate(
              { matchId: match.id, scheduledAt: date },
              { onError: (error) => Alert.alert("Erreur", toFriendlyAdminError(error)) },
            ),
        },
      ],
    );

  return (
    <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-semibold text-text">{match.tournament_name ?? "Tournoi"}</Text>
        <MatchStatusBadge status={match.status} />
      </View>
      <Text className="text-muted">
        Tour {match.round} · match {match.match_number}
      </Text>
      <Text className="text-text">
        {match.player_1_username ?? "?"} vs {match.player_2_username ?? "?"}
        {match.player_1_score !== null ? ` (${match.player_1_score} - ${match.player_2_score ?? "-"})` : ""}
      </Text>
      {match.scheduled_at ? (
        <Text className="text-sm text-primary">Prévu le {formatMatchDate(match.scheduled_at)}</Text>
      ) : null}

      {canSchedule ? (
        <DateField
          label={match.scheduled_at ? "Modifier la date" : "Planifier"}
          mode="datetime"
          value={match.scheduled_at ? new Date(match.scheduled_at) : undefined}
          minimumDate={new Date()}
          onChange={handleSchedule}
        />
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        <Button title="Ouvrir le match" variant="secondary" onPress={() => router.push(`/match/${match.id}`)} />
        <Pressable
          onPress={() => router.push(`/admin/tournament/${match.tournament_id}/manage`)}
          className="justify-center px-2"
          accessibilityRole="button"
        >
          <Text className="text-primary">Gérer le tournoi</Text>
        </Pressable>
      </View>
    </View>
  );
}
