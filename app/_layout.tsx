import "../global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/constants/colors";
import { signOut } from "@/features/auth/api";
import { useProfile } from "@/features/auth/hooks";
import { initAuthListener, useAuthStore } from "@/features/auth/store";
import { usePushRegistration } from "@/features/notifications/usePushRegistration";
import { queryClient } from "@/lib/queryClient";

function RootNavigator() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const { data: profile } = useProfile(session?.user.id);

  useEffect(() => {
    initAuthListener();
  }, []);

  usePushRegistration(session?.user.id);

  useEffect(() => {
    if (profile && profile.status !== "ACTIVE") {
      signOut();
    }
  }, [profile]);

  if (status === "loading") {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Ouvert par le lien du mail de réinitialisation : accessible connecté ou non. */}
      <Stack.Screen name="reset-password" />
      <Stack.Protected guard={status === "authenticated"}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game-account/add"
          options={{
            headerShown: true,
            title: "Ajouter un identifiant",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{
            headerShown: true,
            title: "Modifier le profil",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: true,
            title: "Notifications",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="admin/dashboard"
          options={{
            headerShown: true,
            title: "Administration",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="admin/tournament/create"
          options={{
            headerShown: true,
            title: "Créer un tournoi",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="admin/tournament/[id]/manage"
          options={{
            headerShown: true,
            title: "Gérer le tournoi",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
        <Stack.Screen
          name="admin/disputes"
          options={{
            headerShown: true,
            title: "Litiges",
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={status === "unauthenticated"}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
