import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";

type AdminTileProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  // Compteur affiché en pastille (ex. litiges à traiter) ; masqué à 0 ou si absent.
  count?: number;
  // Pastille en couleur d'alerte (travail en attente) plutôt qu'en simple information.
  alert?: boolean;
  caption?: string;
};

export function AdminTile({ label, icon, href, count, alert, caption }: AdminTileProps) {
  return (
    <Pressable
      onPress={() => router.push(href as never)}
      accessibilityRole="button"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      className="min-w-[46%] flex-1 gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <View className="flex-row items-center justify-between">
        <Ionicons name={icon} size={22} color={colors.primary} />
        {count ? (
          <View className={`min-w-[24px] items-center rounded-full px-2 py-0.5 ${alert ? "bg-warning" : "bg-surface-alt"}`}>
            <Text className="text-xs font-bold text-white">{count}</Text>
          </View>
        ) : null}
      </View>
      <Text className="font-semibold text-text">{label}</Text>
      {caption ? <Text className="text-xs text-muted">{caption}</Text> : null}
    </Pressable>
  );
}
