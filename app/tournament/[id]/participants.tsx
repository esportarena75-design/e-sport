import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useTournamentParticipants } from "@/features/tournaments/hooks";
import type { TournamentParticipantPublic } from "@/types/database";

export default function TournamentParticipantsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: participants, isLoading } = useTournamentParticipants(id);

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
    <Screen>
      <Text className="py-4 text-2xl font-bold text-text">
        Participants ({participants?.length ?? 0})
      </Text>
      <FlatList
        data={participants ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 pb-6"
        renderItem={({ item, index }) => <ParticipantRow participant={item} index={index} />}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-muted">Aucun participant pour le moment.</Text>
        }
      />
    </Screen>
  );
}

function ParticipantRow({
  participant,
  index,
}: {
  participant: TournamentParticipantPublic;
  index: number;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Text className="w-6 text-muted">{index + 1}</Text>
        <Text className="text-text">{participant.username}</Text>
      </View>
      {participant.status !== "REGISTERED" ? (
        <Text className="text-sm text-muted">{participant.status}</Text>
      ) : null}
    </View>
  );
}
