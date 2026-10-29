import { Link, router } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { AdminTile } from "@/components/AdminTile";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/colors";
import { toFriendlyAdminError } from "@/features/admin/errors";
import {
  useAdminOverview,
  useAdminTournaments,
  useCancelTournament,
  useUpdateTournamentStatus,
} from "@/features/admin/hooks";
import { useGenerateBracket } from "@/features/bracket/hooks";
import type { TournamentPublic } from "@/types/database";
import { displayStatus } from "@/utils/time";

export default function AdminDashboardScreen() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}

function AdminDashboardContent() {
  const { data: tournaments, isLoading } = useAdminTournaments();
  const { data: overview } = useAdminOverview();

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
        data={tournaments ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 pb-6"
        ListHeaderComponent={
          <View className="gap-4 py-4">
            <Link href="/admin/tournament/create" asChild>
              <Pressable className="items-center rounded-2xl bg-primary px-4 py-3">
                <Text className="font-semibold text-white">+ Créer un tournoi</Text>
              </Pressable>
            </Link>

            <View className="flex-row flex-wrap gap-3">
              <AdminTile
                label="Litiges"
                icon="warning-outline"
                href="/admin/disputes"
                count={overview?.open_disputes}
                alert
                caption="À traiter"
              />
              <AdminTile
                label="Matchs"
                icon="game-controller-outline"
                href="/admin/matches"
                count={(overview?.matches_to_schedule ?? 0) + (overview?.matches_awaiting_confirmation ?? 0)}
                alert
                caption="À planifier ou confirmer"
              />
              <AdminTile
                label="Annonces"
                icon="megaphone-outline"
                href="/admin/announcements"
                caption={`${overview?.players ?? 0} joueurs actifs`}
              />
              <AdminTile
                label="Joueurs"
                icon="people-outline"
                href="/admin/users"
                count={overview?.sanctioned_users}
                caption="Sanctions en cours"
              />
              <AdminTile label="Actus" icon="newspaper-outline" href="/admin/news" caption="Accueil de l'appli" />
              <AdminTile label="Journal" icon="list-outline" href="/admin/logs" caption="Actions des admins" />
            </View>

            <Text className="text-lg font-semibold text-text">
              Tournois · {overview?.tournaments_open ?? 0} ouverts · {overview?.tournaments_in_progress ?? 0} en cours
            </Text>
          </View>
        }
        renderItem={({ item }) => <TournamentAdminRow tournament={item} />}
        ListEmptyComponent={<Text className="mt-8 text-center text-muted">Aucun tournoi.</Text>}
      />
    </Screen>
  );
}

function TournamentAdminRow({ tournament }: { tournament: TournamentPublic }) {
  const updateStatus = useUpdateTournamentStatus();
  const cancelTournament = useCancelTournament();
  const generateBracket = useGenerateBracket(tournament.id);

  const showError = (error: unknown) => Alert.alert("Erreur", toFriendlyAdminError(error));

  const handleCloseRegistration = () => {
    updateStatus.mutate({ id: tournament.id, status: "REGISTRATION_CLOSED" }, { onError: showError });
  };

  const handleCancel = () => {
    Alert.alert(
      "Annuler le tournoi",
      "Les matchs en cours seront annulés et les inscrits prévenus. Confirmer ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Annuler le tournoi",
          style: "destructive",
          onPress: () =>
            cancelTournament.mutate({ tournamentId: tournament.id }, { onError: showError }),
        },
      ],
    );
  };

  const handleGenerateBracket = async () => {
    try {
      await generateBracket.mutateAsync();
    } catch (error) {
      showError(error);
    }
  };

  return (
    <Pressable
      onPress={() => router.push(`/tournament/${tournament.id}`)}
      className="gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 font-semibold text-text">{tournament.name}</Text>
        <StatusBadge status={displayStatus(tournament)} />
      </View>
      <Text className="text-muted">
        {tournament.participant_count} / {tournament.max_players} joueurs
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {tournament.status === "REGISTRATION_OPEN" ? (
          <Button title="Fermer les inscriptions" variant="secondary" onPress={handleCloseRegistration} />
        ) : null}
        {(tournament.status === "REGISTRATION_OPEN" || tournament.status === "REGISTRATION_CLOSED") ? (
          <Button
            title="Générer le bracket"
            variant="secondary"
            loading={generateBracket.isPending}
            onPress={handleGenerateBracket}
          />
        ) : null}
        {["DRAFT", "REGISTRATION_OPEN", "REGISTRATION_CLOSED"].includes(tournament.status) ? (
          <Button
            title="Modifier"
            variant="secondary"
            onPress={() => router.push(`/admin/tournament/${tournament.id}/edit`)}
          />
        ) : null}
        <Button
          title="Annoncer"
          variant="secondary"
          onPress={() => router.push(`/admin/announcements?tournamentId=${tournament.id}`)}
        />
        <Button
          title="Gérer"
          variant="secondary"
          onPress={() => router.push(`/admin/tournament/${tournament.id}/manage`)}
        />
        {tournament.status !== "CANCELLED" && tournament.status !== "COMPLETED" ? (
          <Button
            title="Annuler"
            variant="secondary"
            loading={cancelTournament.isPending}
            onPress={handleCancel}
          />
        ) : null}
      </View>
    </Pressable>
  );
}
