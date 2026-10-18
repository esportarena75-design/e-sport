import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { View, ViewProps } from "react-native";
import { Edge, SafeAreaView } from "react-native-safe-area-context";

import { gradients } from "@/constants/colors";

type ScreenProps = ViewProps & {
  children: ReactNode;
  edges?: Edge[];
};

export function Screen({ children, edges = ["top", "bottom"], className, ...props }: ScreenProps) {
  return (
    <View className="flex-1">
      <LinearGradient
        colors={gradients.background}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={edges} className="flex-1">
        <View className={`flex-1 px-4 ${className ?? ""}`} {...props}>
          {children}
        </View>
      </SafeAreaView>
    </View>
  );
}
