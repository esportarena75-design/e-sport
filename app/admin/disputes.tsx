import { ActivityIndicator, Alert, FlatList, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { EvidenceImage } from "@/components/EvidenceImage";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useOpenDisputes, useResolveDispute } from "@/features/admin/hooks";
import { useMatch, useMatchReports } from "@/features/matches/hooks";
import type { Dispute } from "@/types/database";

const REASON_LABELS: Record<string, string> = {
  RESULT_CONTESTED: "Résultat contesté",
  OPPONENT_ABSENT: "Adversaire absent",
  DISCONNECTION: "Déconnexion",
  GAME_SERVER_DOWN: "Serveur du jeu indisponible",
  CONNECTION_ISSUE: "Problème de connexion",
  WRONG_IDENTIFIER: "Mauvais identifiant",
  ABUSIVE_BEHAVIOR: "Comportement abusif",
  CHEATING_SUSPICION: "Suspicion de triche",
  OTHER: "Autre",
};

export default function AdminDisputesScreen() {
  return (
    <AdminGuard>
      <AdminDisputesContent />
    </AdminGuard>
  );
}

function AdminDisputesContent() {
  const { data: disputes, isLoading } = useOpenDisputes();

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={disputes ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 py-4"
        renderItem={({ item }) => <DisputeRow dispute={item} />}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-muted">Aucun litige en attente.</Text>
        }
      />
    </Screen>
  );
}

function DisputeRow({ dispute }: { dispute: Dispute }) {
  const { data: match } = useMatch(dispute.match_id);
  const { data: reports } = useMatchReports(dispute.match_id);
  const resolveDispute = useResolveDispute();

  const handleResolve = (winnerId: string | undefined, decision: string) => {
    Alert.alert("Résoudre le litige", `Confirmer : ${decision} ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        onPress: () =>
          resolveDispute.mutate(
            {
              disputeId: dispute.id,
              decision,
              winnerId,
              newStatus: winnerId ? "RESOLVED" : "DISMISSED",
            },
            { onError: (error) => Alert.alert("Erreur", toFriendlyAdminError(error)) },
          ),
      },
    ]);
  };

  return (
    <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-semibold text-text">{REASON_LABELS[dispute.reason] ?? dispute.reason}</Text>
      {dispute.description ? <Text className="text-muted">{dispute.description}</Text> : null}

      {match ? (
        <Text className="text-text">
          {match.player_1_username ?? "?"} vs {match.player_2_username ?? "?"} (
          {match.player_1_score ?? "-"} - {match.player_2_score ?? "-"})
        </Text>
      ) : null}

      {(reports ?? []).map((report) => {
        const reporter =
          report.reported_by === match?.player_1_id
            ? match?.player_1_username
            : report.reported_by === match?.player_2_id
              ? match?.player_2_username
              : null;
        return (
          <View key={report.id} className="gap-1 rounded-xl border border-border p-3">
            <Text className="text-sm text-text">
              Score saisi par {reporter ?? "un joueur"} : {report.player_1_score} - {report.player_2_score}
            </Text>
            {report.comment ? <Text className="text-sm text-muted">{report.comment}</Text> : null}
            {report.evidence_path ? (
              <EvidenceImage path={report.evidence_path} label="Preuve jointe au score" />
            ) : null}
          </View>
        );
      })}

      {dispute.evidence_path ? (
        <EvidenceImage path={dispute.evidence_path} label="Preuve jointe au litige" />
      ) : null}

      <View className="flex-row flex-wrap gap-2">
        {match?.player_1_id ? (
          <Button
            title={`${match.player_1_username} gagne`}
            variant="secondary"
            onPress={() => handleResolve(match.player_1_id!, `${match.player_1_username} gagne`)}
          />
        ) : null}
        {match?.player_2_id ? (
          <Button
            title={`${match.player_2_username} gagne`}
            variant="secondary"
            onPress={() => handleResolve(match.player_2_id!, `${match.player_2_username} gagne`)}
          />
        ) : null}
        <Button
          title="Rejeter le litige"
          variant="secondary"
          onPress={() => handleResolve(undefined, "Litige rejeté")}
        />
      </View>
    </View>
  );
}
