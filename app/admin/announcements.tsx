import { zodResolver } from "@hookform/resolvers/zod";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, ScrollView, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useAdminOverview, useAdminTournaments } from "@/features/admin/hooks";
import { useRecentAnnouncements, useSendAnnouncement } from "@/features/announcements/hooks";
import { AnnouncementInput, announcementSchema } from "@/schemas/announcement";
import { timeAgo } from "@/utils/time";

export default function AdminAnnouncementsScreen() {
  return (
    <AdminGuard>
      <AnnouncementsContent />
    </AdminGuard>
  );
}

function AnnouncementsContent() {
  const { tournamentId } = useLocalSearchParams<{ tournamentId?: string }>();
  const { data: tournaments } = useAdminTournaments();
  const { data: overview } = useAdminOverview();
  const { data: history } = useRecentAnnouncements();
  const send = useSendAnnouncement();
  const [serverError, setServerError] = useState<string | null>(null);

  const activeTournaments = (tournaments ?? []).filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "DRAFT",
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", body: "", audience: tournamentId ?? "all" },
  });

  const submit = (values: AnnouncementInput) => {
    const target = activeTournaments.find((t) => t.id === values.audience);
    const recipients = target ? target.participant_count : (overview?.players ?? 0);
    const where = target ? `les ${recipients} inscrits de « ${target.name} »` : `tous les joueurs (${recipients})`;

    Alert.alert("Envoyer l'annonce", `Une notification sera envoyée à ${where}. Confirmer ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Envoyer",
        onPress: async () => {
          setServerError(null);
          try {
            await send.mutateAsync({
              tournamentId: target ? target.id : null,
              title: values.title,
              body: values.body,
            });
            reset({ title: "", body: "", audience: values.audience });
            Alert.alert("Annonce envoyée", "Les joueurs concernés ont été notifiés.");
          } catch (error) {
            setServerError(toFriendlyAdminError(error));
          }
        },
      },
    ]);
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 py-6 pb-10" keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="audience"
          render={({ field }) => (
            <ChipSelect
              label="Destinataires"
              options={[
                { value: "all", label: "Tous les joueurs" },
                ...activeTournaments.map((t) => ({ value: t.id, label: t.name })),
              ]}
              value={field.value}
              onChange={field.onChange}
              error={errors.audience?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="title"
          render={({ field }) => (
            <Input
              label="Titre"
              value={field.value}
              onChangeText={field.onChange}
              maxLength={80}
              error={errors.title?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <Input
              label={`Message (${field.value.length}/500)`}
              value={field.value}
              onChangeText={field.onChange}
              multiline
              maxLength={500}
              error={errors.body?.message}
            />
          )}
        />

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Envoyer l'annonce" loading={send.isPending} onPress={handleSubmit(submit)} />

        <View className="gap-2 pt-4">
          <Text className="text-lg font-semibold text-text">Dernières annonces</Text>
          {(history ?? []).length === 0 ? (
            <Text className="text-muted">Aucune annonce envoyée.</Text>
          ) : (
            (history ?? []).map((a) => {
              const t = (tournaments ?? []).find((x) => x.id === a.tournament_id);
              return (
                <View key={a.id} className="gap-1 rounded-2xl border border-border bg-surface p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="flex-1 font-semibold text-text">{a.title}</Text>
                    <Text className="text-xs text-muted">{timeAgo(a.created_at)}</Text>
                  </View>
                  <Text className="text-xs text-primary">{t ? t.name : a.tournament_id ? "Tournoi" : "Tous les joueurs"}</Text>
                  <Text className="text-muted">{a.body}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
