import { Link } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import type { AdminNews } from "@/features/admin/api";
import { toFriendlyAdminError } from "@/features/admin/errors";
import { useAdminNews, useDeleteNews, useSetNewsPublished } from "@/features/admin/hooks";
import { formatNewsDate } from "@/utils/time";

export default function AdminNewsScreen() {
  return (
    <AdminGuard>
      <AdminNewsContent />
    </AdminGuard>
  );
}

function AdminNewsContent() {
  const { data, isLoading, isError, refetch } = useAdminNews();

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message="Impossible de charger les actus." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <View className="py-4">
        <Link href="/admin/news/create" asChild>
          <Pressable className="items-center rounded-2xl bg-primary px-4 py-3">
            <Text className="font-semibold text-white">+ Ajouter une actu</Text>
          </Pressable>
        </Link>
      </View>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 pb-6"
        renderItem={({ item }) => <NewsAdminRow item={item} />}
        ListEmptyComponent={<Text className="mt-8 text-center text-muted">Aucune actu.</Text>}
      />
    </Screen>
  );
}

function NewsAdminRow({ item }: { item: AdminNews }) {
  const setPublished = useSetNewsPublished();
  const remove = useDeleteNews();
  const showError = (error: unknown) => Alert.alert("Erreur", toFriendlyAdminError(error));

  const handleDelete = () =>
    Alert.alert("Supprimer l'actu", "Cette action est définitive. Pour la masquer seulement, utilisez « Masquer ».", [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(item.id, { onError: showError }) },
    ]);

  return (
    <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-semibold text-text">{item.title}</Text>
      <Text className="text-sm text-muted">
        {item.source_name} · {formatNewsDate(item.published_at)}
        {item.tag ? ` · ${item.tag}` : ""}
        {item.is_auto ? " · auto" : ""}
        {item.is_published ? "" : " · MASQUÉE"}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <Button
          title={item.is_published ? "Masquer" : "Publier"}
          variant="secondary"
          loading={setPublished.isPending}
          onPress={() =>
            setPublished.mutate({ id: item.id, published: !item.is_published }, { onError: showError })
          }
        />
        <Button title="Supprimer" variant="secondary" loading={remove.isPending} onPress={handleDelete} />
      </View>
    </View>
  );
}
