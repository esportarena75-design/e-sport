import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";

type PlaceholderScreenProps = {
  title: string;
  phase: string;
};

export function PlaceholderScreen({ title, phase }: PlaceholderScreenProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-xl font-semibold text-text">{title}</Text>
        <Text className="text-muted">Écran à implémenter — {phase}</Text>
      </View>
    </Screen>
  );
}
