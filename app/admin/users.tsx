import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useSearchUsers } from "@/features/admin/hooks";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export default function AdminUsersScreen() {
  return (
    <AdminGuard>
      <AdminUsersContent />
    </AdminGuard>
  );
}

function AdminUsersContent() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim());
  const { data, isLoading, isError } = useSearchUsers(debounced);

  return (
    <Screen edges={["bottom"]}>
      <View className="py-4">
        <Input
          placeholder="Rechercher un joueur par pseudo"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {debounced.length < 2 ? (
        <Text className="mt-4 text-center text-muted">Saisissez au moins 2 caractères.</Text>
      ) : isLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : isError ? (
        <Text className="mt-4 text-center text-error">Recherche impossible.</Text>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-2 pb-6"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/admin/user/${item.id}`)}
              className="flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <Text className="font-semibold text-text">{item.username}</Text>
              <Text
                className={`text-sm ${item.status === "ACTIVE" ? "text-muted" : "text-error"}`}
              >
                {item.role !== "USER" ? `${item.role} · ` : ""}
                {item.status}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text className="mt-4 text-center text-muted">Aucun joueur trouvé.</Text>}
        />
      )}
    </Screen>
  );
}
