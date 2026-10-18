import { ReactNode } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useProfile } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";

export function AdminGuard({ children }: { children: ReactNode }) {
  const session = useAuthStore((state) => state.session);
  const { data: profile, isLoading } = useProfile(session?.user.id);

  if (isLoading || !profile) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN") {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Accès réservé aux administrateurs.</Text>
        </View>
      </Screen>
    );
  }

  return <>{children}</>;
}
