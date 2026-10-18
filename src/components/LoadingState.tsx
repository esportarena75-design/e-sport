import { ActivityIndicator, View } from "react-native";

import { colors } from "@/constants/colors";

export function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
