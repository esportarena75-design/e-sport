import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { ChipSelect } from "@/components/ChipSelect";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { useAuthStore } from "@/features/auth/store";
import { uploadMatchEvidence } from "@/features/matches/api";
import { toFriendlyMatchError } from "@/features/matches/errors";
import { useMatch, useOpenDispute } from "@/features/matches/hooks";
import { DisputeInput, disputeSchema } from "@/schemas/match";
import type { DisputeReason } from "@/types/database";

const REASON_OPTIONS: { value: DisputeReason; label: string }[] = [
  { value: "RESULT_CONTESTED", label: "Résultat contesté" },
  { value: "OPPONENT_ABSENT", label: "Adversaire absent" },
  { value: "DISCONNECTION", label: "Déconnexion" },
  { value: "GAME_SERVER_DOWN", label: "Serveur du jeu indisponible" },
  { value: "CONNECTION_ISSUE", label: "Problème de connexion" },
  { value: "WRONG_IDENTIFIER", label: "Mauvais identifiant" },
  { value: "ABUSIVE_BEHAVIOR", label: "Comportement abusif" },
  { value: "CHEATING_SUSPICION", label: "Suspicion de triche" },
  { value: "OTHER", label: "Autre" },
];

export default function MatchDisputeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((state) => state.session);
  const { data: match } = useMatch(id);
  const openDispute = useOpenDispute(id ?? "");
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DisputeInput>({
    resolver: zodResolver(disputeSchema),
    defaultValues: { reason: undefined as unknown as DisputeInput["reason"], description: "" },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (values: DisputeInput) => {
    if (!match || !session) return;
    setServerError(null);
    setUploading(true);
    try {
      let evidencePath: string | undefined;
      if (imageUri) {
        evidencePath = await uploadMatchEvidence({
          tournamentId: match.tournament_id,
          matchId: match.id,
          userId: session.user.id,
          fileUri: imageUri,
          contentType: "image/jpeg",
        });
      }

      await openDispute.mutateAsync({
        reason: values.reason,
        description: values.description || undefined,
        evidencePath,
      });
      router.back();
    } catch (error) {
      setServerError(toFriendlyMatchError(error));
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || openDispute.isPending;

  return (
    <Screen>
      <View className="flex-1 gap-4 py-6">
        <Text className="text-2xl font-bold text-text">Signaler un problème</Text>

        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <ChipSelect
              label="Motif"
              options={REASON_OPTIONS}
              value={field.value}
              onChange={(value) => field.onChange(value as DisputeInput["reason"])}
              error={errors.reason?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Input
              label="Explication (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              error={errors.description?.message}
            />
          )}
        />

        <Pressable
          onPress={pickImage}
          className="items-center rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <Text className="text-text">
            {imageUri ? "Changer la preuve" : "Ajouter une preuve (optionnel)"}
          </Text>
        </Pressable>

        {imageUri ? (
          <Image source={{ uri: imageUri }} className="h-40 w-full rounded-2xl" resizeMode="cover" />
        ) : null}

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Envoyer" loading={busy} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
