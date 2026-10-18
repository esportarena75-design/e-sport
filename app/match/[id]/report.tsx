import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Image, Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ScoreInput } from "@/components/ScoreInput";
import { Screen } from "@/components/Screen";
import { useAuthStore } from "@/features/auth/store";
import { uploadMatchEvidence } from "@/features/matches/api";
import { toFriendlyMatchError } from "@/features/matches/errors";
import { useMatch, useReportMatchResult } from "@/features/matches/hooks";
import { ReportMatchInput, reportMatchSchema } from "@/schemas/match";

export default function MatchReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((state) => state.session);
  const { data: match } = useMatch(id);
  const reportResult = useReportMatchResult(id ?? "");
  const [serverError, setServerError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReportMatchInput>({
    resolver: zodResolver(reportMatchSchema),
    defaultValues: {
      myScore: "",
      opponentScore: "",
      comment: "",
    },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (values: ReportMatchInput) => {
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

      await reportResult.mutateAsync({
        myScore: Number(values.myScore),
        opponentScore: Number(values.opponentScore),
        comment: values.comment || undefined,
        evidencePath,
      });
      router.back();
    } catch (error) {
      setServerError(toFriendlyMatchError(error));
    } finally {
      setUploading(false);
    }
  };

  const busy = uploading || reportResult.isPending;

  return (
    <Screen>
      <View className="flex-1 gap-4 py-6">
        <Text className="text-2xl font-bold text-text">Déclarer le résultat</Text>
        <Text className="text-muted">Renseignez le score final du match.</Text>

        <View className="flex-row items-start gap-3">
          <Controller
            control={control}
            name="myScore"
            render={({ field }) => (
              <ScoreInput
                label="Mon score"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.myScore?.message}
              />
            )}
          />
          <Text className="pt-8 text-xl text-muted">-</Text>
          <Controller
            control={control}
            name="opponentScore"
            render={({ field }) => (
              <ScoreInput
                label="Score adversaire"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.opponentScore?.message}
              />
            )}
          />
        </View>

        <Controller
          control={control}
          name="comment"
          render={({ field }) => (
            <Input
              label="Commentaire (optionnel)"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              error={errors.comment?.message}
            />
          )}
        />

        <Pressable
          onPress={pickImage}
          className="items-center rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <Text className="text-text">
            {imageUri ? "Changer la preuve (capture d'écran)" : "Ajouter une preuve (optionnel)"}
          </Text>
        </Pressable>

        {imageUri ? (
          <Image source={{ uri: imageUri }} className="h-40 w-full rounded-2xl" resizeMode="cover" />
        ) : null}

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Valider" loading={busy} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
