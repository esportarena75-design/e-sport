import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";

import { colors } from "@/constants/colors";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, secureTextEntry, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-muted">{label}</Text> : null}
      <View className="relative justify-center">
        <TextInput
          key={isPassword ? String(visible) : undefined}
          ref={ref}
          placeholderTextColor={colors.muted}
          secureTextEntry={isPassword && !visible}
          className={`rounded-2xl border bg-surface px-4 py-3 text-base text-text ${
            isPassword ? "pr-12" : ""
          } ${error ? "border-error" : "border-border"}`}
          {...props}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            className="absolute right-3"
            accessibilityRole="button"
            accessibilityLabel={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            <Ionicons
              name={visible ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
});
