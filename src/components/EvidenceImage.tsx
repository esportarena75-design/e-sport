import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Image, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { getMatchEvidenceUrl } from "@/features/matches/api";

// Capture d'écran déposée comme preuve (bucket privé : on demande une URL signée d'une heure).
export function EvidenceImage({ path, label }: { path: string; label?: string }) {
  const { data: url, isLoading, isError } = useQuery({
    queryKey: ["evidence-url", path],
    queryFn: () => getMatchEvidenceUrl(path),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <View className="gap-1">
      {label ? <Text className="text-xs text-muted">{label}</Text> : null}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isError || !url ? (
        <Text className="text-sm text-error">Preuve illisible.</Text>
      ) : (
        <Image
          source={{ uri: url }}
          resizeMode="contain"
          className="h-56 w-full rounded-xl bg-background"
          accessibilityLabel={label ?? "Preuve du match"}
        />
      )}
    </View>
  );
}
