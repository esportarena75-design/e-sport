import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { useCreateTournament } from "@/features/admin/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useGames, usePlatforms } from "@/features/game-accounts/hooks";
import { CreateTournamentInput, createTournamentSchema } from "@/schemas/tournament";

const MAX_PLAYERS_OPTIONS = [
  { value: "8", label: "8" },
  { value: "16", label: "16" },
  { value: "32", label: "32" },
  { value: "64", label: "64" },
];

export default function CreateTournamentScreen() {
  return (
    <AdminGuard>
      <CreateTournamentContent />
    </AdminGuard>
  );
}

function CreateTournamentContent() {
  const session = useAuthStore((state) => state.session);
  const { data: games } = useGames();
  const { data: platforms } = usePlatforms();
  const createTournament = useCreateTournament();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTournamentInput>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      gameId: "",
      platformId: "",
      maxPlayers: "8",
      rules: "",
    },
  });

  const onSubmit = async (values: CreateTournamentInput) => {
    if (!session) return;
    setServerError(null);
    try {
      const tournament = await createTournament.mutateAsync({
        name: values.name,
        description: values.description || undefined,
        gameId: values.gameId,
        platformId: values.platformId,
        maxPlayers: Number(values.maxPlayers),
        registrationStart: values.registrationStart.toISOString(),
        registrationEnd: values.registrationEnd.toISOString(),
        startDate: values.startDate.toISOString(),
        rules: values.rules || undefined,
        createdBy: session.user.id,
      });
      router.replace(`/tournament/${tournament.id}`);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 py-6">
        <Text className="text-2xl font-bold text-text">Créer un tournoi</Text>

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <Input
              label="Nom"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.name?.message}
            />
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
          name="gameId"
          render={({ field }) => (
            <ChipSelect
              label="Jeu"
              options={(games ?? []).map((g) => ({ value: g.id, label: g.name }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.gameId?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="platformId"
          render={({ field }) => (
            <ChipSelect
              label="Plateforme"
              options={(platforms ?? []).map((p) => ({ value: p.id, label: p.name }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.platformId?.message}
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
          name="registrationStart"
          render={({ field }) => (
            <DateField
              label="Début des inscriptions"
              mode="datetime"
              value={field.value}
              onChange={field.onChange}
              error={errors.registrationStart?.message}
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

        <Button
          title="Créer le tournoi"
          loading={createTournament.isPending}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </Screen>
  );
}
