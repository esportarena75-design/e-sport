import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useTournament } from "@/features/tournaments/hooks";

export default function TournamentRulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tournament, isLoading } = useTournament(id);

  if (isLoading || !tournament) {
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
      <ScrollView contentContainerClassName="gap-4 py-6">
        <Text className="text-2xl font-bold text-text">Règlement</Text>
        <Text className="text-lg text-text">{tournament.name}</Text>
        <Text className="leading-6 text-muted">
          {tournament.rules ?? "Aucun règlement spécifique n'a été renseigné pour ce tournoi."}
        </Text>
      </ScrollView>
    </Screen>
  );
}
