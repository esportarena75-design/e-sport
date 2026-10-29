import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/colors";
import { useTournamentAnnouncements } from "@/features/announcements/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useMyMatches } from "@/features/matches/hooks";
import { useSetTournamentMuted, useTournamentMuted } from "@/features/notifications/hooks";
import { toFriendlyTournamentError } from "@/features/tournaments/errors";
import {
  useJoinTournament,
  useLeaveTournament,
  useTournament,
  useTournamentParticipants,
} from "@/features/tournaments/hooks";
import { useNow } from "@/hooks/useNow";
import { formatCountdown, formatMatchDate, getMatchStart, splitMyMatches } from "@/utils/matches";
import { displayStatus, isRegistrationOpen, timeAgo } from "@/utils/time";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((state) => state.session);
  const { data: tournament, isLoading } = useTournament(id);
  const { data: participants } = useTournamentParticipants(id);
  const joinTournament = useJoinTournament(id);
  const leaveTournament = useLeaveTournament(id, session?.user.id);
  const [actionError, setActionError] = useState<string | null>(null);
  const myId = session?.user.id;
  const now = useNow(1000);
  const { data: muted } = useTournamentMuted(myId, id);
  const setMuted = useSetTournamentMuted(myId, id);
  const { data: announcements } = useTournamentAnnouncements(id);
  const { data: myMatches } = useMyMatches(myId);

  if (isLoading || !tournament) {
    return (
      <Screen>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const myParticipation = participants?.find((p) => p.user_id === session?.user.id);
  const isFull = tournament.participant_count >= tournament.max_players;
  const registrationOpen = isRegistrationOpen(tournament);
  const canJoin = registrationOpen && !myParticipation && !isFull;
  const canLeave = registrationOpen && !!myParticipation;
  const beforeStart =
    (tournament.status === "REGISTRATION_OPEN" || tournament.status === "REGISTRATION_CLOSED") &&
    new Date(tournament.start_date).getTime() > now;
  const nextMatch = splitMyMatches(
    (myMatches ?? []).filter((m) => m.tournament_id === tournament.id),
  ).upcoming.find((m) => m.player_1_id && m.player_2_id);

  const handleJoin = async () => {
    setActionError(null);
    try {
      await joinTournament.mutateAsync();
    } catch (error) {
      setActionError(toFriendlyTournamentError(error));
    }
  };

  const handleLeave = () => {
    Alert.alert("Se désinscrire", "Confirmer votre désinscription de ce tournoi ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se désinscrire",
        style: "destructive",
        onPress: async () => {
          setActionError(null);
          try {
            await leaveTournament.mutateAsync();
          } catch (error) {
            setActionError(toFriendlyTournamentError(error));
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 py-6">
        <View className="flex-row justify-between items-start gap-2">
          <Text className="flex-1 font-bold text-text text-2xl">{tournament.name}</Text>
          <StatusBadge status={displayStatus(tournament)} />
        </View>

        <Text className="text-muted">
          {tournament.game_name} · {tournament.platform_name} · {tournament.format}
        </Text>

        {beforeStart ? (
          <View className="items-center gap-1 bg-surface p-4 border border-border rounded-2xl">
            <Text className="text-muted text-sm">Début du tournoi dans</Text>
            <Text className="font-bold text-text text-2xl">
              {formatCountdown(tournament.start_date, now)}
            </Text>
          </View>
        ) : null}

        {myParticipation && nextMatch ? (
          <Link href={`/match/${nextMatch.id}`} asChild>
            <Pressable className="gap-1 bg-surface p-4 border border-primary rounded-2xl">
              <Text className="text-muted text-sm">Votre prochain match</Text>
              <Text className="font-semibold text-text">
                vs{" "}
                {(myId === nextMatch.player_1_id
                  ? nextMatch.player_2_username
                  : nextMatch.player_1_username) ?? "?"}
              </Text>
              <Text className="text-primary text-sm">
                {(() => {
                  const start = getMatchStart(nextMatch);
                  return start
                    ? `${formatMatchDate(start)} · ${formatCountdown(start, now)}`
                    : "Date à définir : vous serez prévenu";
                })()}
              </Text>
            </Pressable>
          </Link>
        ) : null}

        {tournament.description ? (
          <Text className="text-text">{tournament.description}</Text>
        ) : null}

        <View className="gap-2 bg-surface p-4 border border-border rounded-2xl">
          <Row label="Début" value={formatDateTime(tournament.start_date)} />
          <Row
            label="Joueurs"
            value={`${tournament.participant_count} / ${tournament.max_players}`}
          />
          <Row
            label="Inscriptions jusqu'au"
            value={formatDateTime(tournament.registration_end)}
          />
          <Row label="Format" value={tournament.format} />
        </View>

        <Link href={`/tournament/${tournament.id}/participants`} asChild>
          <Pressable className="flex-row justify-between items-center bg-surface px-4 py-3 border border-border rounded-2xl">
            <Text className="text-text">Voir les participants</Text>
            <Text className="text-muted">{tournament.participant_count}</Text>
          </Pressable>
        </Link>

        <Link href={`/tournament/${tournament.id}/rules`} asChild>
          <Pressable className="flex-row justify-between items-center bg-surface px-4 py-3 border border-border rounded-2xl">
            <Text className="text-text">Voir le règlement</Text>
          </Pressable>
        </Link>

        {tournament.status !== "REGISTRATION_OPEN" ? (
          <Link href={`/tournament/${tournament.id}/bracket`} asChild>
            <Pressable className="flex-row justify-between items-center bg-surface px-4 py-3 border border-border rounded-2xl">
              <Text className="text-text">Voir le bracket</Text>
            </Pressable>
          </Link>
        ) : null}

        {announcements && announcements.length > 0 ? (
          <View className="gap-2">
            <Text className="font-semibold text-text text-lg">Annonces</Text>
            {announcements.map((a) => (
              <View key={a.id} className="gap-1 bg-surface p-4 border border-border rounded-2xl">
                <View className="flex-row justify-between items-center gap-2">
                  <Text className="flex-1 font-semibold text-text">{a.title}</Text>
                  <Text className="text-muted text-xs">{timeAgo(a.created_at)}</Text>
                </View>
                <Text className="text-muted">{a.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {actionError ? <Text className="text-error text-sm">{actionError}</Text> : null}

        {myParticipation ? (
          <View className="gap-3 bg-surface p-4 border border-border rounded-2xl">
            <Text className="font-semibold text-success">Vous êtes inscrit à ce tournoi</Text>
            <View className="flex-row justify-between items-center gap-3">
              <View className="flex-1 gap-0.5">
                <Text className="text-text">Notifications du tournoi</Text>
                <Text className="text-muted text-xs">
                  Début et adversaire, rappels, résultats, annonces des organisateurs.
                </Text>
              </View>
              <Switch
                value={!muted}
                disabled={setMuted.isPending}
                onValueChange={(on) => setMuted.mutate(!on)}
                trackColor={{ true: colors.primary }}
                accessibilityLabel="Notifications du tournoi"
              />
            </View>
          </View>
        ) : null}

        {canJoin ? (
          <Button title="Participer" loading={joinTournament.isPending} onPress={handleJoin} />
        ) : null}

        {canLeave ? (
          <Button
            title="Se désinscrire"
            variant="secondary"
            loading={leaveTournament.isPending}
            onPress={handleLeave}
          />
        ) : null}

        {!myParticipation && isFull && registrationOpen ? (
          <Text className="text-muted text-center">Ce tournoi est complet.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-muted">{label}</Text>
      <Text className="text-text">{value}</Text>
    </View>
  );
}
