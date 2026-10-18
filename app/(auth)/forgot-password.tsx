import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { resetPassword } from "@/features/auth/api";
import { ForgotPasswordInput, forgotPasswordSchema } from "@/schemas/auth";

export default function ForgotPasswordScreen() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordInput) => {
    setSubmitting(true);
    try {
      await resetPassword(values.email);
    } finally {
      // Always show the same confirmation, whether or not the email exists,
      // so this screen can't be used to check if an address is registered.
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-xl font-semibold text-text">Email envoyé</Text>
          <Text className="text-center text-muted">
            Si un compte existe avec cet email, vous recevrez un lien pour réinitialiser votre
            mot de passe.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable className="mt-2 items-center py-2">
              <Text className="text-primary">Retour à la connexion</Text>
            </Pressable>
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-2xl font-bold text-text">Mot de passe oublié</Text>
        <Text className="text-muted">
          Indiquez votre email, nous vous enverrons un lien de réinitialisation.
        </Text>

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

        <Button title="Envoyer le lien" loading={submitting} onPress={handleSubmit(onSubmit)} />

        <Link href="/(auth)/login" asChild>
          <Pressable className="items-center py-2">
            <Text className="text-sm text-muted">Retour à la connexion</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
