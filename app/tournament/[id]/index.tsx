import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { toFriendlyTournamentError } from "@/features/tournaments/errors";
import {
  useJoinTournament,
  useLeaveTournament,
  useTournament,
  useTournamentParticipants,
} from "@/features/tournaments/hooks";
import { displayStatus, isRegistrationOpen } from "@/utils/time";

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

        {actionError ? <Text className="text-error text-sm">{actionError}</Text> : null}

        {myParticipation ? (
          <Text className="text-success text-center">Vous êtes inscrit à ce tournoi</Text>
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
