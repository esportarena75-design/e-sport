import { Ionicons } from "@expo/vector-icons";
import { Href, Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

type CheckboxProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  error?: string;
  // Lien « Lire » vers le texte (CGU, confidentialité, règlement).
  readHref?: Href;
};

export function Checkbox({ checked, onChange, label, error, readHref }: CheckboxProps) {
  return (
    <View className="gap-1">
      <Pressable onPress={() => onChange(!checked)} className="flex-row items-center gap-3" hitSlop={8}>
        <View
          className={`h-6 w-6 items-center justify-center rounded border ${
            checked ? "border-primary bg-primary" : "border-border bg-surface"
          }`}
        >
          {checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </View>
        <Text className="flex-1 text-sm text-muted">{label}</Text>
      </Pressable>
      {readHref ? (
        <Link href={readHref} asChild>
          <Pressable className="ml-9" hitSlop={8} accessibilityRole="link">
            <Text className="text-sm text-primary">Lire le document</Text>
          </Pressable>
        </Link>
      ) : null}
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
