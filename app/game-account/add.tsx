import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useAuthStore } from "@/features/auth/store";
import { useAddGameAccount, useGames, usePlatforms } from "@/features/game-accounts/hooks";
import { GameAccountInput, gameAccountSchema } from "@/schemas/gameAccount";

export default function AddGameAccountScreen() {
  const session = useAuthStore((state) => state.session);
  const { data: games, isLoading: loadingGames } = useGames();
  const { data: platforms, isLoading: loadingPlatforms } = usePlatforms();
  const addGameAccount = useAddGameAccount(session?.user.id);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<GameAccountInput>({
    resolver: zodResolver(gameAccountSchema),
    defaultValues: { gameId: "", platformId: "", playerIdentifier: "" },
  });

  const onSubmit = async (values: GameAccountInput) => {
    setServerError(null);
    try {
      await addGameAccount.mutateAsync(values);
      router.back();
    } catch (error) {
      setServerError(
        error instanceof Error && error.message.includes("duplicate key")
          ? "Vous avez déjà un identifiant pour ce jeu sur cette plateforme."
          : "Une erreur est survenue. Réessayez.",
      );
    }
  };

  if (loadingGames || loadingPlatforms) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 gap-4 py-6">
        <Text className="text-2xl font-bold text-text">Ajouter un identifiant</Text>

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
          name="playerIdentifier"
          render={({ field }) => (
            <Input
              label="Identifiant (pseudo PSN, Xbox, etc.)"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.playerIdentifier?.message}
            />
          )}
        />

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Ajouter" loading={addGameAccount.isPending} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
