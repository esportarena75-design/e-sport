import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Alert, Linking, Pressable, Text, View } from "react-native";

import { colors, gradients } from "@/constants/colors";
import type { NewsItem } from "@/types/database";
import { formatNewsDate } from "@/utils/time";

async function openSource(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Lien indisponible", "Impossible d'ouvrir l'article pour le moment.");
  }
}

export function NewsCard({ news }: { news: NewsItem }) {
  return (
    <Pressable
      onPress={() => openSource(news.source_url)}
      className="w-72 overflow-hidden rounded-2xl border border-border bg-surface"
      accessibilityRole="link"
      accessibilityLabel={`${news.title}, source ${news.source_name}`}
      accessibilityHint="Ouvre l'article dans le navigateur"
    >
      <LinearGradient
        colors={gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-row items-center justify-between px-4 py-2.5"
      >
        {news.tag ? (
          <View className="rounded-full bg-primary/20 px-2.5 py-0.5">
            <Text className="text-xs font-semibold text-primary">{news.tag}</Text>
          </View>
        ) : (
          <View />
        )}
        <Text className="text-xs text-muted" numberOfLines={1}>
          {news.source_name}
        </Text>
      </LinearGradient>

      <View className="flex-1 gap-2 p-4">
        <Text className="text-base font-semibold text-text" numberOfLines={2}>
          {news.title}
        </Text>
        <Text className="text-sm leading-5 text-muted" numberOfLines={3}>
          {news.summary}
        </Text>
      </View>

      <View className="flex-row items-center justify-between border-t border-border px-4 py-2.5">
        <Text className="text-xs text-muted">{formatNewsDate(news.published_at)}</Text>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-medium text-primary">Lire</Text>
          <Ionicons name="open-outline" size={12} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
}
