import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, PressableProps, Text } from "react-native";

import { colors, gradients } from "@/constants/colors";

type ButtonProps = PressableProps & {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function Button({
  title,
  loading,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  if (isPrimary) {
    return (
      <Pressable disabled={isDisabled} className={isDisabled ? "opacity-50" : ""} {...props}>
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center justify-center rounded-full px-5 py-3.5"
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">{title}</Text>
          )}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={isDisabled}
      className={`items-center justify-center rounded-full border border-border bg-surface px-5 py-3.5 ${
        isDisabled ? "opacity-50" : ""
      }`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text className="text-base font-semibold text-text">{title}</Text>
      )}
    </Pressable>
  );
}
