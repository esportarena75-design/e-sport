import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { useUnreadCount } from "@/features/notifications/hooks";

// Cloche de l'accueil avec pastille du nombre de notifications non lues.
export function NotificationBell() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const { data: unread = 0 } = useUnreadCount(userId);

  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      hitSlop={8}
      className="justify-center items-center bg-surface p-2.5 rounded-full"
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} non lues` : "Notifications"}
    >
      <Ionicons name="notifications-outline" size={20} color={colors.text} />
      {unread > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[18px] items-center justify-center rounded-full bg-error px-1">
          <Text className="text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
