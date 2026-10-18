import { Pressable, Text, View } from "react-native";

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({ message = "Une erreur est survenue.", onRetry }: ErrorStateProps) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6 py-12">
      <Text className="text-center text-error">{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" hitSlop={8}>
          <Text className="text-primary">Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
