import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Avatar } from "@/components/Avatar";
import { CircularProgress } from "@/components/CircularProgress";
import { Screen } from "@/components/Screen";
import { colors, gradients } from "@/constants/colors";
import { usePlayerStats, usePublicProfile } from "@/features/stats/hooks";

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: profile, isLoading } = usePublicProfile(id);
  const { data: stats } = usePlayerStats(id);

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
          <Avatar uri={profile.avatar_url} name={profile.username} size={64} />
          <View className="flex-1 gap-1">
            <Text className="text-2xl font-bold text-text">{profile.username}</Text>
            <Text className="text-muted">
              Membre depuis le {new Date(profile.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
        </View>

        {profile.bio ? <Text className="text-text">{profile.bio}</Text> : null}

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
              <StatRow label="Matchs joués" value={stats.matches_played} />
              <StatRow label="Victoires" value={stats.matches_won} />
              <StatRow label="Défaites" value={stats.matches_lost} />
              <StatRow label="Tournois gagnés" value={stats.tournaments_won} />
            </View>
          </LinearGradient>
        ) : (
          <Text className="text-muted">Ce joueur n&apos;a pas encore de statistiques.</Text>
        )}
      </ScrollView>
    </Screen>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="font-semibold text-text">{value}</Text>
    </View>
  );
}
