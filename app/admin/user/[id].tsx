import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import type { SanctionType } from "@/features/admin/api";
import { toFriendlyAdminError } from "@/features/admin/errors";
import {
  useAdminUser,
  useApplySanctionToUser,
  useLiftSanction,
  useUserSanctions,
} from "@/features/admin/hooks";
import {
  SUSPENSION_DURATIONS,
  suspensionEndDate,
  type SuspensionDurationValue,
} from "@/utils/sanctions";

const TYPE_LABELS: Record<SanctionType, string> = {
  WARNING: "Avertissement",
  SUSPENSION: "Suspension",
  BAN: "Bannissement",
};

export default function AdminUserScreen() {
  return (
    <AdminGuard>
      <AdminUserContent />
    </AdminGuard>
  );
}

function AdminUserContent() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading } = useAdminUser(id);
  const { data: sanctions } = useUserSanctions(id);
  const apply = useApplySanctionToUser(id);
  const lift = useLiftSanction(id);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<SuspensionDurationValue>("7");

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (!user) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Joueur introuvable.</Text>
        </View>
      </Screen>
    );
  }

  const trimmed = reason.trim();
  const showError = (error: unknown) => Alert.alert("Erreur", toFriendlyAdminError(error));
  const requireReason = (): boolean => {
    if (trimmed.length < 3) {
      Alert.alert("Motif requis", "Saisissez un motif (3 caractères minimum) avant d'agir.");
      return false;
    }
    return true;
  };

  const handleApply = (type: SanctionType) => {
    if (!requireReason()) return;
    Alert.alert(TYPE_LABELS[type], `${user.username} : confirmer ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Confirmer",
        style: "destructive",
        onPress: () =>
          apply.mutate(
            {
              userId: user.id,
              type,
              reason: trimmed,
              endDate: type === "SUSPENSION" ? suspensionEndDate(duration) : null,
            },
            { onSuccess: () => setReason(""), onError: showError },
          ),
      },
    ]);
  };

  const handleLift = () => {
    if (!requireReason()) return;
    Alert.alert("Lever la sanction", `${user.username} redeviendra actif.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Lever",
        onPress: () =>
          lift.mutate(
            { userId: user.id, reason: trimmed },
            { onSuccess: () => setReason(""), onError: showError },
          ),
      },
    ]);
  };

  const sanctioned = user.status === "SUSPENDED" || user.status === "BANNED";

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: user.username }} />
      <ScrollView contentContainerClassName="gap-5 py-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="gap-1">
          <Text className="text-2xl font-bold text-text">{user.username}</Text>
          <Text className={sanctioned ? "text-error" : "text-muted"}>
            {user.role} · {user.status} · inscrit le{" "}
            {new Date(user.created_at).toLocaleDateString("fr-FR")}
          </Text>
        </View>

        <Input
          label="Motif (obligatoire)"
          value={reason}
          onChangeText={setReason}
          placeholder="Ex. propos injurieux en match"
          maxLength={200}
        />

        <ChipSelect
          label="Durée d'une suspension"
          options={SUSPENSION_DURATIONS.map((d) => ({ value: d.value, label: d.label }))}
          value={duration}
          onChange={(value) => setDuration(value as SuspensionDurationValue)}
        />

        <View className="flex-row flex-wrap gap-2">
          {(["WARNING", "SUSPENSION", "BAN"] as const).map((type) => (
            <Button
              key={type}
              title={TYPE_LABELS[type]}
              variant="secondary"
              loading={apply.isPending}
              onPress={() => handleApply(type)}
            />
          ))}
          {sanctioned ? (
            <Button title="Lever la sanction" loading={lift.isPending} onPress={handleLift} />
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-lg font-semibold text-text">Historique</Text>
          {(sanctions ?? []).length === 0 ? (
            <Text className="text-muted">Aucune sanction.</Text>
          ) : (
            (sanctions ?? []).map((s) => (
              <View key={s.id} className="gap-1 rounded-2xl border border-border bg-surface p-4">
                <Text className="font-semibold text-text">
                  {TYPE_LABELS[s.type]} · {new Date(s.start_date).toLocaleDateString("fr-FR")}
                  {s.end_date ? ` → ${new Date(s.end_date).toLocaleDateString("fr-FR")}` : ""}
                </Text>
                <Text className="text-muted">{s.reason}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
