import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import type { SanctionType } from "@/features/admin/api";
import { toFriendlyAdminError } from "@/features/admin/errors";
import {
  useApplySanction,
  useDisqualifyParticipant,
  useForfeitMatch,
} from "@/features/admin/hooks";
import { useMatches } from "@/features/bracket/hooks";
import { useTournament, useTournamentParticipants } from "@/features/tournaments/hooks";
import type { MatchPublic, TournamentParticipantPublic } from "@/types/database";
import { isBye } from "@/utils/bracket";

const OPEN_MATCH_STATUSES = ["READY", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"];

const SANCTION_LABELS: Record<SanctionType, string> = {
  WARNING: "Avertir",
  SUSPENSION: "Suspendre",
  BAN: "Bannir",
};

export default function ManageTournamentScreen() {
  return (
    <AdminGuard>
      <ManageTournamentContent />
    </AdminGuard>
  );
}

function ManageTournamentContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tournament, isLoading } = useTournament(id);
  const { data: participants } = useTournamentParticipants(id);
  const { data: matches } = useMatches(id);
  const forfeit = useForfeitMatch(id);
  const disqualify = useDisqualifyParticipant(id);
  const sanction = useApplySanction();
  // Le motif est commun à toutes les actions de l'écran : il est journalisé et envoyé au joueur.
  const [reason, setReason] = useState("");

  if (isLoading || !tournament) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  const showError = (error: unknown) => Alert.alert("Erreur", toFriendlyAdminError(error));
  const trimmedReason = reason.trim();

  // Toute action sanctionnante exige un motif et une confirmation explicite.
  const confirm = (title: string, message: string, onConfirm: () => void) => {
    if (trimmedReason.length < 3) {
      Alert.alert("Motif requis", "Saisissez un motif (3 caractères minimum) avant d'agir.");
      return;
    }
    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", style: "destructive", onPress: onConfirm },
    ]);
  };

  const handleForfeit = (match: MatchPublic, absentId: string, absentName: string) =>
    confirm("Déclarer un forfait", `${absentName} perd le match par forfait.`, () =>
      forfeit.mutate({ matchId: match.id, absentPlayerId: absentId, reason: trimmedReason }, { onError: showError }),
    );

  const handleDisqualify = (p: TournamentParticipantPublic) =>
    confirm("Disqualifier", `${p.username} est exclu du tournoi et perd son match en cours.`, () =>
      disqualify.mutate(
        { tournamentId: id, userId: p.user_id, reason: trimmedReason },
        { onError: showError },
      ),
    );

  const handleSanction = (p: TournamentParticipantPublic, type: SanctionType) =>
    confirm(SANCTION_LABELS[type], `${p.username} recevra une sanction (${type}).`, () =>
      sanction.mutate(
        { userId: p.user_id, type, reason: trimmedReason },
        {
          onSuccess: () => Alert.alert("Sanction appliquée", `${p.username} a été prévenu.`),
          onError: showError,
        },
      ),
    );

  const openMatches = (matches ?? []).filter(
    (m) => OPEN_MATCH_STATUSES.includes(m.status) && !isBye(m),
  );

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-6 py-4 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-text">{tournament.name}</Text>

        <Input
          label="Motif (obligatoire)"
          value={reason}
          onChangeText={setReason}
          placeholder="Ex. absent après 15 min d'attente"
          maxLength={200}
        />

        <View className="gap-3">
          <Text className="text-lg font-semibold text-text">Matchs en cours</Text>
          {openMatches.length === 0 ? (
            <Text className="text-muted">Aucun match à gérer.</Text>
          ) : (
            openMatches.map((match) => (
              <View key={match.id} className="gap-3 rounded-2xl border border-border bg-surface p-4">
                <Text className="font-semibold text-text">
                  Tour {match.round} · match {match.match_number}
                </Text>
                <Text className="text-muted">
                  {match.player_1_username ?? "?"} vs {match.player_2_username ?? "?"} · {match.status}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {match.player_1_id && match.player_2_id ? (
                    <>
                      <Button
                        title={`Forfait ${match.player_1_username ?? "J1"}`}
                        variant="secondary"
                        loading={forfeit.isPending}
                        onPress={() =>
                          handleForfeit(match, match.player_1_id!, match.player_1_username ?? "Joueur 1")
                        }
                      />
                      <Button
                        title={`Forfait ${match.player_2_username ?? "J2"}`}
                        variant="secondary"
                        loading={forfeit.isPending}
                        onPress={() =>
                          handleForfeit(match, match.player_2_id!, match.player_2_username ?? "Joueur 2")
                        }
                      />
                    </>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-text">Participants</Text>
          {(participants ?? []).map((p) => (
            <View key={p.id} className="gap-3 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-text">{p.username}</Text>
                <Text className="text-sm text-muted">{p.status}</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {p.status !== "DISQUALIFIED" ? (
                  <Button
                    title="Disqualifier"
                    variant="secondary"
                    loading={disqualify.isPending}
                    onPress={() => handleDisqualify(p)}
                  />
                ) : null}
                {(["WARNING", "SUSPENSION", "BAN"] as const).map((type) => (
                  <Button
                    key={type}
                    title={SANCTION_LABELS[type]}
                    variant="secondary"
                    loading={sanction.isPending}
                    onPress={() => handleSanction(p, type)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
