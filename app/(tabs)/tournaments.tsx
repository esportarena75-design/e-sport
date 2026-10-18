import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { ChipSelect } from "@/components/ChipSelect";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Input } from "@/components/Input";
import { LoadingState } from "@/components/LoadingState";
import { Screen } from "@/components/Screen";
import { TournamentCard } from "@/components/TournamentCard";
import { colors } from "@/constants/colors";
import { useGames, usePlatforms } from "@/features/game-accounts/hooks";
import { useTournaments } from "@/features/tournaments/hooks";
import type { TournamentStatus } from "@/types/database";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tous" },
  { value: "REGISTRATION_OPEN", label: "Inscriptions ouvertes" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminés" },
];

export default function TournamentsScreen() {
  const [search, setSearch] = useState("");
  const [gameId, setGameId] = useState("");
  const [platformId, setPlatformId] = useState("");
  const [status, setStatus] = useState("");

  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();

  const filters = useMemo(
    () => ({
      search: search || undefined,
      gameId: gameId || undefined,
      platformId: platformId || undefined,
      status: (status || undefined) as TournamentStatus | undefined,
    }),
    [search, gameId, platformId, status],
  );

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTournaments(filters);
  const tournaments = data?.pages.flat() ?? [];

  const gameOptions = useMemo(
    () => [{ value: "", label: "Tous" }, ...(games ?? []).map((g) => ({ value: g.id, label: g.name }))],
    [games],
  );
  const platformOptions = useMemo(
    () => [
      { value: "", label: "Toutes" },
      ...(platforms ?? []).map((p) => ({ value: p.id, label: p.name })),
    ],
    [platforms],
  );

  return (
    <Screen edges={["top"]}>
      <View className="gap-3 pb-3 pt-4">
        <Text className="text-2xl font-bold text-text">Tournois</Text>
        <Input placeholder="Rechercher un tournoi" value={search} onChangeText={setSearch} />
        <ChipSelect label="Jeu" options={gameOptions} value={gameId} onChange={setGameId} />
        <ChipSelect
          label="Plateforme"
          options={platformOptions}
          value={platformId}
          onChange={setPlatformId}
        />
        <ChipSelect label="Statut" options={STATUS_OPTIONS} value={status} onChange={setStatus} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message="Impossible de charger les tournois." onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 pb-6"
          renderItem={({ item }) => <TournamentCard tournament={item} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<EmptyState message="Aucun tournoi trouvé." />}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
          }
        />
      )}
    </Screen>
  );
}
