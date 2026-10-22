import { zodResolver } from "@hookform/resolvers/zod";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useUpdateTournament } from "@/features/admin/hooks";
import { useTournament } from "@/features/tournaments/hooks";
import { EditTournamentInput, editTournamentSchema } from "@/schemas/tournament";
import type { TournamentPublic } from "@/types/database";

const MAX_PLAYERS_OPTIONS = ["8", "16", "32", "64"].map((v) => ({ value: v, label: v }));

export default function EditTournamentScreen() {
  return (
    <AdminGuard>
      <EditTournamentLoader />
    </AdminGuard>
  );
}

function EditTournamentLoader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tournament, isLoading } = useTournament(id);

  if (isLoading || !tournament) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  return <EditTournamentForm tournament={tournament} />;
}

function EditTournamentForm({ tournament }: { tournament: TournamentPublic }) {
  const update = useUpdateTournament(tournament.id);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditTournamentInput>({
    resolver: zodResolver(editTournamentSchema),
    defaultValues: {
      name: tournament.name,
      description: tournament.description ?? "",
      rules: tournament.rules ?? "",
      maxPlayers: String(tournament.max_players),
      registrationEnd: new Date(tournament.registration_end),
      startDate: new Date(tournament.start_date),
    },
  });

  const onSubmit = async (values: EditTournamentInput) => {
    setServerError(null);
    try {
      await update.mutateAsync({
        tournamentId: tournament.id,
        name: values.name,
        description: values.description ?? "",
        rules: values.rules ?? "",
        maxPlayers: Number(values.maxPlayers),
        registrationEnd: values.registrationEnd,
        startDate: values.startDate,
      });
      router.back();
    } catch (error) {
      setServerError(toFriendlyAdminError(error));
    }
  };

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted">
          Le jeu et la plateforme ne peuvent plus être changés. Les inscrits sont prévenus si les
          dates changent.
        </Text>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input label="Nom" value={field.value} onChangeText={field.onChange} error={errors.name?.message} />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              label="Description (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              error={errors.description?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="maxPlayers"
          render={({ field }) => (
            <ChipSelect
              label="Nombre de joueurs"
              options={MAX_PLAYERS_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={errors.maxPlayers?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="registrationEnd"
          render={({ field }) => (
            <DateField
              label="Fin des inscriptions"
              mode="datetime"
              value={field.value}
              onChange={field.onChange}
              error={errors.registrationEnd?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="startDate"
          render={({ field }) => (
            <DateField
              label="Début du tournoi"
              mode="datetime"
              value={field.value}
              onChange={field.onChange}
              error={errors.startDate?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="rules"
          render={({ field }) => (
            <Input
              label="Règlement (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              error={errors.rules?.message}
            />
          )}
        />

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Enregistrer" loading={update.isPending} onPress={handleSubmit(onSubmit)} />
      </ScrollView>
    </Screen>
  );
}
