import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { signIn } from "@/features/auth/api";
import { toFriendlyErrorMessage } from "@/features/auth/errors";
import { APP_NAME } from "@/constants/config";
import { LoginInput, loginSchema } from "@/schemas/auth";
 

export default function LoginScreen() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await signIn(values);
    } catch (error) {
      setServerError(toFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="mb-4 font-bold text-text text-3xl">{APP_NAME}</Text>

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

        {serverError ? <Text className="text-error text-sm">{serverError}</Text> : null}

        <Button title="Se connecter" loading={submitting} onPress={handleSubmit(onSubmit)} />

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable className="items-center py-2">
            <Text className="text-muted text-sm">Mot de passe oublié ?</Text>
          </Pressable>
        </Link>

        <Link href="/(auth)/register" asChild>
          <Pressable className="items-center py-2">
            <Text className="text-muted text-sm">
              Pas encore de compte ? <Text className="text-primary">Créer un compte</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
