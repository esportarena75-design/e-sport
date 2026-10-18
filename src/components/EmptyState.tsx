import { Text, View } from "react-native";

export function EmptyState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-12">
      <Text className="text-center text-muted">{message}</Text>
    </View>
  );
}
