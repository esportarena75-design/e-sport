import { Pressable, Text, View } from "react-native";

type ChipOption = {
  value: string;
  label: string;
};

type ChipSelectProps = {
  label: string;
  options: ChipOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
};

export function ChipSelect({ label, options, value, onChange, error }: ChipSelectProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-muted">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2 ${
                selected ? "border-primary bg-primary" : "border-border bg-surface"
              }`}
            >
              <Text className={selected ? "font-medium text-white" : "text-text"}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
    </View>
  );
}
