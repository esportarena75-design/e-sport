import { Text, TextInput, View } from "react-native";

type ScoreInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
};

export function ScoreInput({ label, value, onChangeText, error }: ScoreInputProps) {
  return (
    <View className="flex-1 gap-1.5">
      <Text className="text-center text-sm font-medium text-muted">{label}</Text>
      <TextInput
        keyboardType="number-pad"
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ""))}
        maxLength={2}
        className={`rounded-2xl border bg-surface px-4 py-3 text-center text-2xl font-bold text-text ${
          error ? "border-error" : "border-border"
        }`}
      />
      {error ? <Text className="text-center text-sm text-error">{error}</Text> : null}
    </View>
  );
}
