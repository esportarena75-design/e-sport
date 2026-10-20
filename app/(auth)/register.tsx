import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { DateField } from "@/components/DateField";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { signUp } from "@/features/auth/api";
import { toFriendlyErrorMessage } from "@/features/auth/errors";
import { RegisterInput, registerSchema } from "@/schemas/auth";

export default function RegisterScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      username: "",
      termsAccepted: false,
      privacyAccepted: false,
      rulesAccepted: false,
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const { emailConfirmationRequired } = await signUp(values);
      if (emailConfirmationRequired) {
        setConfirmationSent(true);
      }
    } catch (error) {
      setServerError(toFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmationSent) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-xl font-semibold text-text">Vérifiez votre boîte mail</Text>
          <Text className="text-center text-muted">
            Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre
            compte, puis connectez-vous.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable className="mt-2 items-center py-2">
              <Text className="text-primary">Aller à la connexion</Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-4 py-6" keyboardShouldPersistTaps="handled">
        <Text className="text-2xl font-bold text-text">Créer un compte</Text>

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <Input
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="username"
          render={({ field }) => (
            <Input
              label="Pseudo"
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.username?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <DateField
              label="Date de naissance"
              value={field.value}
              onChange={field.onChange}
              maximumDate={new Date()}
              error={errors.birthDate?.message}
            />
          )}
        />

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">Pays</Text>
          <View className="rounded-2xl border border-border bg-surface px-4 py-3">
            <Text className="text-text">France</Text>
          </View>
        </View>

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              label="Mot de passe"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <Input
              label="Confirmer le mot de passe"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="termsAccepted"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              label="J'accepte les conditions générales d'utilisation"
              readHref="/legal/terms"
              error={errors.termsAccepted?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="privacyAccepted"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              label="J'accepte la politique de confidentialité"
              readHref="/legal/privacy"
              error={errors.privacyAccepted?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="rulesAccepted"
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              label="J'accepte le règlement des tournois"
              readHref="/legal/rules"
              error={errors.rulesAccepted?.message}
            />
          )}
        />

        {serverError ? <Text className="text-sm text-error">{serverError}</Text> : null}

        <Button title="Créer mon compte" loading={submitting} onPress={handleSubmit(onSubmit)} />

        <Link href="/(auth)/login" asChild>
          <Pressable className="items-center py-2">
            <Text className="text-sm text-muted">
              Déjà un compte ? <Text className="text-primary">Se connecter</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </Screen>
  );
}
