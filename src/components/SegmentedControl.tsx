import { Pressable, Text, View } from "react-native";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-full border border-border bg-surface p-1" accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-full py-2.5 ${selected ? "bg-primary" : ""}`}
          >
            <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-muted"}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
