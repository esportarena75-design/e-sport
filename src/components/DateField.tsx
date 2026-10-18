import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

type DateFieldProps = {
  label: string;
  value: Date | undefined;
  onChange: (date: Date) => void;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  mode?: "date" | "datetime";
};

// Android's native picker has no combined "datetime" mode (only "date" or "time"), so
// for mode="datetime" there we chain a date picker into a time picker and merge the
// result. iOS supports "datetime" natively, so it gets a single picker there.
export function DateField({
  label,
  value,
  onChange,
  error,
  maximumDate,
  minimumDate,
  mode = "date",
}: DateFieldProps) {
  const [step, setStep] = useState<"closed" | "date" | "time" | "datetime">("closed");
  const [pendingDate, setPendingDate] = useState<Date | undefined>(undefined);

  const open = () => {
    setStep(mode === "datetime" && Platform.OS === "ios" ? "datetime" : "date");
  };

  const handlePrimaryChange = (_event: unknown, selectedDate?: Date) => {
    if (!selectedDate) {
      setStep("closed");
      return;
    }
    if (mode === "datetime" && Platform.OS === "android") {
      setPendingDate(selectedDate);
      setStep("time");
      return;
    }
    setStep("closed");
    onChange(selectedDate);
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    setStep("closed");
    if (!selectedTime || !pendingDate) return;
    const combined = new Date(pendingDate);
    combined.setHours(selectedTime.getHours(), selectedTime.getMinutes());
    onChange(combined);
  };

  const displayValue = value
    ? mode === "datetime"
      ? value.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      : value.toLocaleDateString("fr-FR")
    : mode === "datetime"
      ? "JJ/MM/AAAA HH:MM"
      : "JJ/MM/AAAA";

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-muted">{label}</Text>
      <Pressable
        onPress={open}
        className={`rounded-2xl border bg-surface px-4 py-3 ${
          error ? "border-error" : "border-border"
        }`}
      >
        <Text className={value ? "text-text" : "text-muted"}>{displayValue}</Text>
      </Pressable>
      {error ? <Text className="text-sm text-error">{error}</Text> : null}
      {step === "date" || step === "datetime" ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={step === "datetime" ? "datetime" : "date"}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handlePrimaryChange}
        />
      ) : null}
      {step === "time" ? (
        <DateTimePicker
          value={pendingDate ?? new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      ) : null}
    </View>
  );
}
