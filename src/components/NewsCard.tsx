import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Alert, Image, Linking, Pressable, Text, View } from "react-native";

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
  // Une image distante peut être supprimée ou bloquée : on retombe alors sur le visuel de
  // secours plutôt que de laisser un trou dans la carte.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = !!news.image_url && !imageFailed;

  return (
    <Pressable
      onPress={() => openSource(news.source_url)}
      className="w-72 overflow-hidden rounded-2xl border border-border bg-surface"
      accessibilityRole="link"
      accessibilityLabel={`${news.title}, source ${news.source_name}`}
      accessibilityHint="Ouvre l'article dans le navigateur"
    >
      {/* Visuel : environ la moitié de la hauteur de la carte */}
      <View className="h-36 w-full bg-surface-alt">
        {showImage ? (
          <Image
            source={{ uri: news.image_url! }}
            className="h-full w-full"
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={gradients.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-full w-full items-center justify-center"
          >
            <Ionicons name="newspaper-outline" size={40} color="rgba(255,255,255,0.45)" />
          </LinearGradient>
        )}

        {/* Dégradé sombre en bas pour que la pastille et la source restent lisibles */}
        <LinearGradient
          colors={["rgba(18,16,31,0)", "rgba(18,16,31,0.85)"]}
          className="absolute inset-x-0 bottom-0 h-16"
          pointerEvents="none"
        />
        <View className="absolute inset-x-3 bottom-2 flex-row items-center justify-between">
          {news.tag ? (
            <View className="rounded-full bg-primary px-2.5 py-0.5">
              <Text className="text-xs font-semibold text-white">{news.tag}</Text>
            </View>
          ) : (
            <View />
          )}
          <Text className="max-w-[55%] text-xs text-white/80" numberOfLines={1}>
            {news.source_name}
          </Text>
        </View>
      </View>

      <View className="gap-2 p-4" style={{ minHeight: 112 }}>
        <Text className="text-base font-semibold text-text" numberOfLines={2}>
          {news.title}
        </Text>
        <Text className="text-sm leading-5 text-muted" numberOfLines={2}>
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
