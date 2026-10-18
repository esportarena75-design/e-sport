import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { useMarkNotificationRead, useNotifications } from "@/features/notifications/hooks";
import type { NotificationRow } from "@/types/database";
import { timeAgo } from "@/utils/time";

export default function NotificationsScreen() {
  const session = useAuthStore((state) => state.session);
  const { data: notifications, isLoading } = useNotifications(session?.user.id);
  const markRead = useMarkNotificationRead(session?.user.id);

  const handlePress = (notification: NotificationRow) => {
    if (!notification.read) {
      markRead.mutate(notification.id);
    }
    const matchId = (notification.data as { match_id?: string } | null)?.match_id;
    const tournamentId = (notification.data as { tournament_id?: string } | null)?.tournament_id;
    if (matchId) {
      router.push(`/match/${matchId}`);
    } else if (tournamentId) {
      router.push(`/tournament/${tournamentId}`);
    }
  };

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
    <Screen edges={["bottom"]}>
      <FlatList
        data={notifications ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 py-4"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            className={`gap-1 rounded-2xl border p-4 ${
              item.read ? "border-border bg-surface" : "border-primary bg-surface"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-text">{item.title}</Text>
              <Text className="text-xs text-muted">{timeAgo(item.created_at)}</Text>
            </View>
            <Text className="text-muted">{item.body}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-muted">Aucune notification.</Text>
        }
      />
    </Screen>
  );
}
