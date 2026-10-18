import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { ReactNode, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";

import { MatchStatusBadge } from "@/components/MatchStatusBadge";
import { NewsCard } from "@/components/NewsCard";
import { Screen } from "@/components/Screen";
import { TournamentCard } from "@/components/TournamentCard";
import { colors } from "@/constants/colors";
import { useProfile } from "@/features/auth/hooks";
import { useAuthStore } from "@/features/auth/store";
import { useGames } from "@/features/game-accounts/hooks";
import { useMyMatches } from "@/features/matches/hooks";
import { useLatestNews } from "@/features/news/hooks";
import { useTournaments } from "@/features/tournaments/hooks";
import type { Game, MatchPublic } from "@/types/database";

const ACTIVE_MATCH_STATUSES = ["READY", "IN_PROGRESS", "AWAITING_CONFIRMATION"];

export default function HomeScreen() {
  const session = useAuthStore((state) => state.session);
  const myId = session?.user.id;
  const { data: profile } = useProfile(myId);
  const { data: games } = useGames();
  const { data: myMatches, isLoading: loadingMatches } = useMyMatches(myId);
  const { data: newsPages, isLoading: loadingNews } = useTournaments({
    status: "REGISTRATION_OPEN",
  });
  const {
    data: esportNews,
    isLoading: loadingEsportNews,
    isError: esportNewsError,
    refetch: refetchEsportNews,
  } = useLatestNews();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const todaysMatches = (myMatches ?? []).filter((m) => ACTIVE_MATCH_STATUSES.includes(m.status));
  const news = (newsPages?.pages.flat() ?? []).slice(0, 6);

  return (
    <Screen>
      <ScrollView contentContainerClassName="gap-6 py-6">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.push("/(tabs)/tournaments")}
            hitSlop={8}
            className="justify-center items-center bg-surface p-2.5 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Rechercher un tournoi"
          >
            <Ionicons name="search" size={20} color={colors.text} />
          </Pressable>
          <Text className="flex-1 font-bold text-text text-3xl">Popular Games</Text>
          <Pressable
            onPress={() => router.push("/notifications")}
            hitSlop={8}
            className="justify-center items-center bg-surface p-2.5 rounded-full"
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        {games && games.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
            <View className="flex-row gap-4">
              {games.map((game) => (
                <GameCircle
                  key={game.id}
                  game={game}
                  selected={selectedGameId === game.id}
                  onPress={() =>
                    setSelectedGameId((current) => (current === game.id ? null : game.id))
                  }
                />
              ))}
            </View>
          </ScrollView>
        ) : null}

        {profile && (profile.role === "ADMIN" || profile.role === "SUPER_ADMIN") ? (
          <Link href="/admin/dashboard" asChild>
            <Pressable className="items-center bg-surface px-4 py-3 border border-primary rounded-2xl">
              <Text className="text-primary">Administration</Text>
            </Pressable>
          </Link>
        ) : null}

        <Section title="Today's Matches">
          {loadingMatches ? (
            <ActivityIndicator color={colors.primary} />
          ) : todaysMatches.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <View className="flex-row gap-3">
                {todaysMatches.map((match) => (
                  <MatchCarouselCard key={match.id} match={match} myId={myId} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className="text-muted">Aucun match en cours.</Text>
          )}
        </Section>

        <Section title="News">
          {loadingNews ? (
            <ActivityIndicator color={colors.primary} />
          ) : news.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <View className="flex-row gap-3">
                {news.map((tournament) => (
                  <View key={tournament.id} className="w-72">
                    <TournamentCard tournament={tournament} />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className="text-muted">Aucun tournoi disponible pour le moment.</Text>
          )}

          {loadingEsportNews ? (
            <ActivityIndicator color={colors.primary} />
          ) : esportNewsError ? (
            <Pressable onPress={() => refetchEsportNews()} accessibilityRole="button">
              <Text className="text-muted">
                Impossible de charger les actus. <Text className="text-primary">Réessayer</Text>
              </Text>
            </Pressable>
          ) : esportNews && esportNews.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <View className="flex-row gap-3">
                {esportNews.map((item) => (
                  <NewsCard key={item.id} news={item} />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text className="text-muted">Aucune actu pour le moment.</Text>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function GameCircle({
  game,
  selected,
  onPress,
}: {
  game: Game;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center gap-1.5">
      <View
        className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-surface-alt ${
          selected ? "border-primary" : "border-border"
        }`}
      >
        {game.logo_url ? (
          <Image source={{ uri: game.logo_url }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Ionicons
            name="game-controller"
            size={26}
            color={selected ? colors.primary : colors.muted}
          />
        )}
      </View>
      <Text
        className={`max-w-[70px] text-center text-xs ${selected ? "text-text" : "text-muted"}`}
        numberOfLines={1}
      >
        {game.name}
      </Text>
    </Pressable>
  );
}

function MatchCarouselCard({
  match,
  myId,
}: {
  match: MatchPublic;
  myId: string | undefined;
}) {
  const opponentName =
    myId === match.player_1_id ? match.player_2_username : match.player_1_username;

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      className="gap-3 bg-surface p-4 border border-border rounded-2xl w-56"
    >
      <View className="flex-row justify-between items-center">
        <Text className="font-medium text-muted text-xs">Round {match.round}</Text>
        <MatchStatusBadge status={match.status} />
      </View>
      <Text className="font-semibold text-text" numberOfLines={1}>
        vs {opponentName ?? "À déterminer"}
      </Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text className="font-semibold text-text text-lg">{title}</Text>
      {children}
    </View>
  );
}
