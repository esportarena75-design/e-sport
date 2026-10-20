import { zodResolver } from "@hookform/resolvers/zod";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useProfile } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { toFriendlyProfileError } from "@/features/profile/errors";
import { useRemoveAvatar, useUpdateProfile, useUploadAvatar } from "@/features/profile/hooks";
import { EditProfileInput, editProfileSchema } from "@/schemas/profile";

export default function EditProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id;
  const { data: profile, isLoading } = useProfile(userId);

  if (isLoading || !profile) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return <EditProfileForm userId={userId!} profile={profile} />;
}

function EditProfileForm({
  userId,
  profile,
}: {
  userId: string;
  profile: { username: string; bio: string | null; avatar_url: string | null };
}) {
  const updateProfile = useUpdateProfile(userId);
  const uploadAvatar = useUploadAvatar(userId);
  const removeAvatar = useRemoveAvatar(userId);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { username: profile.username, bio: profile.bio ?? "" },
  });

  const pickAvatar = async () => {
    setServerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès refusé", "Autorisez l'accès à vos photos dans les réglages de l'appareil.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    try {
      await uploadAvatar.mutateAsync({ fileUri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
    } catch (error) {
      setServerError(toFriendlyProfileError(error));
    }
  };

  const confirmRemoveAvatar = () => {
    Alert.alert("Supprimer la photo", "Revenir à l'initiale de votre pseudo ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () =>
          removeAvatar.mutate(undefined, { onError: (e) => setServerError(toFriendlyProfileError(e)) }),
      },
    ]);
  };

  const onSubmit = async (values: EditProfileInput) => {
    setServerError(null);
    try {
      await updateProfile.mutateAsync(values);
      router.back();
    } catch (error) {
      setServerError(toFriendlyProfileError(error));
    }
  };

  const photoBusy = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-6 py-6" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-4">
          <Avatar uri={profile.avatar_url} name={profile.username} size={112} />
          <View className="flex-row gap-2">
            <Button
              title={profile.avatar_url ? "Changer la photo" : "Ajouter une photo"}
              variant="secondary"
              loading={uploadAvatar.isPending}
              disabled={photoBusy}
              onPress={pickAvatar}
            />
            {profile.avatar_url ? (
              <Button
                title="Supprimer"
                variant="secondary"
                loading={removeAvatar.isPending}
                disabled={photoBusy}
                onPress={confirmRemoveAvatar}
              />
            ) : null}
          </View>
          <Text className="text-center text-xs text-muted">JPEG, PNG ou WebP · 2 Mo maximum</Text>
        </View>

        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Input
              label="Pseudo"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              error={errors.username?.message}
            />
          )}
        />
        <Text className="-mt-4 text-xs text-muted">Modifiable une fois tous les 14 jours.</Text>

        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <Input
              label="Bio"
              value={field.value}
              onChangeText={field.onChange}
              multiline
              maxLength={160}
              placeholder="Quelques mots sur vous (160 caractères max)"
              error={errors.bio?.message}
            />
          )}
        />

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button
          title="Enregistrer"
          loading={updateProfile.isPending}
          disabled={photoBusy}
          onPress={handleSubmit(onSubmit)}
        />
      </ScrollView>
    </Screen>
  );
}
