import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { CircularProgress } from "@/components/CircularProgress";
import { Screen } from "@/components/Screen";
import { colors, gradients } from "@/constants/colors";
import { deleteOwnAccount, signOut } from "@/features/auth/api";
import { useProfile } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useDeleteGameAccount, useGameAccounts } from "@/features/game-accounts/hooks";
import { usePlayerStats } from "@/features/stats/hooks";

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const { data: profile, isLoading } = useProfile(session?.user.id);
  const { data: gameAccounts } = useGameAccounts(session?.user.id);
  const { data: stats } = usePlayerStats(session?.user.id);
  const deleteGameAccount = useDeleteGameAccount(session?.user.id);
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    await signOut();
    setBusy(false);
  };

  const handleDelete = () => {
    Alert.alert("Supprimer le compte", "Cette action est irréversible. Confirmer ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          if (!session) return;
          setBusy(true);
          await deleteOwnAccount(session.user.id);
          setBusy(false);
        },
      },
    ]);
  };

  if (isLoading || !profile) {
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
      <ScrollView contentContainerClassName="gap-6 py-6">
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-white">
              {profile.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-bold text-text">{profile.username}</Text>
            <Text className="text-muted">
              Membre depuis le {new Date(profile.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        {stats && stats.matches_played > 0 ? (
          <LinearGradient
            colors={gradients.card}
            className="flex-row items-center gap-4 rounded-2xl border border-border p-4"
          >
            <CircularProgress
              progress={stats.win_rate}
              value={`${stats.win_rate}%`}
              label="Win rate"
            />
            <View className="flex-1 gap-2">
              <StatBlock label="Matchs joués" value={stats.matches_played} />
              <StatBlock label="Victoires" value={stats.matches_won} />
              <StatBlock label="Tournois gagnés" value={stats.tournaments_won} />
            </View>
          </LinearGradient>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-text">Comptes gaming</Text>
            <Pressable onPress={() => router.push("/game-account/add")} hitSlop={8}>
              <Text className="text-primary">+ Ajouter</Text>
            </Pressable>
          </View>

          {gameAccounts && gameAccounts.length > 0 ? (
            gameAccounts.map((account) => (
              <View
                key={account.id}
                className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <View>
                  <Text className="text-text">
                    {account.game.name} · {account.platform.name}
                  </Text>
                  <Text className="text-muted">{account.player_identifier}</Text>
                </View>
                <Pressable
                  onPress={() => deleteGameAccount.mutate(account.id)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Supprimer le compte ${account.game.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            ))
          ) : (
            <Text className="text-muted">Aucun compte gaming ajouté.</Text>
          )}
        </View>

        <View className="gap-3">
          <Button title="Se déconnecter" variant="secondary" loading={busy} onPress={handleLogout} />
          <Button
            title="Supprimer mon compte"
            variant="secondary"
            loading={busy}
            onPress={handleDelete}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="font-semibold text-text">{value}</Text>
    </View>
  );
}
