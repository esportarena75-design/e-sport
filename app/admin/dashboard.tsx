import { Link, router } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/constants/colors";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useAdminTournaments, useOpenDisputes, useUpdateTournamentStatus } from "@/features/admin/hooks";
import { useGenerateBracket } from "@/features/bracket/hooks";
import type { TournamentPublic } from "@/types/database";

export default function AdminDashboardScreen() {
  return (
    <AdminGuard>
      <AdminDashboardContent />
    </AdminGuard>
  );
}

function AdminDashboardContent() {
  const { data: tournaments, isLoading } = useAdminTournaments();
  const { data: disputes } = useOpenDisputes();

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
      <View className="gap-3 py-4">
        <Link href="/admin/tournament/create" asChild>
          <Pressable className="items-center rounded-2xl bg-primary px-4 py-3">
            <Text className="font-semibold text-white">+ Créer un tournoi</Text>
          </Pressable>
        </Link>

        <Link href="/admin/disputes" asChild>
          <Pressable className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
            <Text className="text-text">Litiges à traiter</Text>
            <Text className="text-warning">{disputes?.length ?? 0}</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={tournaments ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 pb-6"
        renderItem={({ item }) => <TournamentAdminRow tournament={item} />}
        ListEmptyComponent={<Text className="mt-8 text-center text-muted">Aucun tournoi.</Text>}
      />
    </Screen>
  );
}

function TournamentAdminRow({ tournament }: { tournament: TournamentPublic }) {
  const updateStatus = useUpdateTournamentStatus();
  const generateBracket = useGenerateBracket(tournament.id);

  const showError = (error: unknown) => Alert.alert("Erreur", toFriendlyAdminError(error));

  const handleCloseRegistration = () => {
    updateStatus.mutate({ id: tournament.id, status: "REGISTRATION_CLOSED" }, { onError: showError });
  };

  const handleCancel = () => {
    Alert.alert("Annuler le tournoi", "Confirmer l'annulation ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Annuler le tournoi",
        style: "destructive",
        onPress: () =>
          updateStatus.mutate({ id: tournament.id, status: "CANCELLED" }, { onError: showError }),
      },
    ]);
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
        <StatusBadge status={tournament.status} />
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
        {tournament.status !== "CANCELLED" && tournament.status !== "COMPLETED" ? (
          <Button title="Annuler" variant="secondary" onPress={handleCancel} />
        ) : null}
      </View>
    </Pressable>
  );
}
