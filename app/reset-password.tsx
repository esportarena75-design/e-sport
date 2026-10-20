import { zodResolver } from "@hookform/resolvers/zod";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { startRecoverySession, updatePassword } from "@/features/auth/api";
import { parseAuthRedirect } from "@/features/auth/redirect";
import { ResetPasswordInput, resetPasswordSchema } from "@/schemas/auth";

type SessionState = "pending" | "ok" | "failed";

// Écran ouvert par le lien du mail « mot de passe oublié ». Il est volontairement placé hors des
// groupes protégés : la session de récupération rend l'utilisateur « connecté » le temps du changement.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const url = Linking.useURL();
  const [sessionState, setSessionState] = useState<SessionState>("pending");
  const [timedOut, setTimedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const parsed = useMemo(() => parseAuthRedirect(url), [url]);
  const tokens = parsed?.kind === "tokens" ? parsed : null;
  const accessToken = tokens?.accessToken;
  const refreshToken = tokens?.refreshToken;

  useEffect(() => {
    if (!accessToken || !refreshToken) return;
    let cancelled = false;
    startRecoverySession(accessToken, refreshToken)
      .then(() => !cancelled && setSessionState("ok"))
      .catch(() => !cancelled && setSessionState("failed"));
    return () => {
      cancelled = true;
    };
  }, [accessToken, refreshToken]);

  // Sans URL après un court délai, l'écran a été ouvert sans passer par le mail.
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  let linkState: "waiting" | "ready" | "invalid";
  if (url && !tokens) linkState = "invalid";
  else if (tokens) linkState = sessionState === "ok" ? "ready" : sessionState === "failed" ? "invalid" : "waiting";
  else linkState = timedOut ? "invalid" : "waiting";

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ResetPasswordInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      await updatePassword(values.password);
      router.replace("/");
    } catch {
      setFormError("Impossible de modifier le mot de passe. Le lien a peut-être expiré.");
    } finally {
      setSubmitting(false);
    }
  };

  if (linkState === "waiting") {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (linkState === "invalid") {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <Text className="text-xl font-semibold text-text">Lien invalide ou expiré</Text>
          <Text className="text-center text-muted">
            Demandez un nouveau lien de réinitialisation depuis l&apos;écran de connexion.
          </Text>
          <Pressable className="mt-2 items-center py-2" onPress={() => router.replace("/")}>
            <Text className="text-primary">Retour</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 justify-center gap-4">
        <Text className="text-2xl font-bold text-text">Nouveau mot de passe</Text>

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <Input
              label="Nouveau mot de passe"
              secureTextEntry
              autoCapitalize="none"
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
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        {formError ? <Text className="text-sm text-error">{formError}</Text> : null}

        <Button title="Enregistrer" loading={submitting} onPress={handleSubmit(onSubmit)} />
      </View>
    </Screen>
  );
}
