import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useCreateNews } from "@/features/admin/hooks";
import { useAuthStore } from "@/features/auth/store";
import { CreateNewsInput, createNewsSchema } from "@/schemas/news";

export default function CreateNewsScreen() {
  return (
    <AdminGuard>
      <CreateNewsContent />
    </AdminGuard>
  );
}

function CreateNewsContent() {
  const session = useAuthStore((state) => state.session);
  const createNews = useCreateNews();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateNewsInput>({
    resolver: zodResolver(createNewsSchema),
    defaultValues: { title: "", summary: "", tag: "", sourceName: "", sourceUrl: "", imageUrl: "" },
  });

  const onSubmit = async (values: CreateNewsInput) => {
    if (!session) return;
    setServerError(null);
    try {
      await createNews.mutateAsync({ ...values, createdBy: session.user.id });
      router.back();
    } catch (error) {
      setServerError(toFriendlyAdminError(error));
    }
  };

  const field = (
    name: keyof CreateNewsInput,
    label: string,
    extra: { multiline?: boolean; url?: boolean } = {},
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field: f }) => (
        <Input
          label={label}
          value={f.value ?? ""}
          onChangeText={f.onChange}
          multiline={extra.multiline}
          autoCapitalize={extra.url ? "none" : undefined}
          keyboardType={extra.url ? "url" : undefined}
          error={errors[name]?.message}
        />
      )}
    />
  );

  return (
    <Screen edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted">
          Titre, court résumé et lien vers l&apos;article d&apos;origine : n&apos;y recopiez pas l&apos;article.
        </Text>
        {field("title", "Titre")}
        {field("summary", "Résumé (280 caractères max)", { multiline: true })}
        {field("tag", "Jeu / étiquette (optionnel)")}
        {field("sourceName", "Nom de la source")}
        {field("sourceUrl", "Lien de l'article (https://…)", { url: true })}
        {field("imageUrl", "Image (https://…, optionnel)", { url: true })}

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Publier" loading={createNews.isPending} onPress={handleSubmit(onSubmit)} />
      </ScrollView>
    </Screen>
  );
}
