import { ActivityIndicator, FlatList, Text, View } from "react-native";

import { AdminGuard } from "@/components/AdminGuard";
import { ErrorState } from "@/components/ErrorState";
import { Screen } from "@/components/Screen";
import { colors } from "@/constants/colors";
import { useAdminLogs } from "@/features/admin/hooks";
import { adminActionLabel, adminLogSummary } from "@/utils/adminLogs";

export default function AdminLogsScreen() {
  return (
    <AdminGuard>
      <AdminLogsContent />
    </AdminGuard>
  );
}

function AdminLogsContent() {
  const { data, isLoading, isError, refetch } = useAdminLogs();

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
        <ErrorState message="Impossible de charger le journal." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen edges={["bottom"]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-2 py-4"
        renderItem={({ item }) => {
          const summary = adminLogSummary(item.details);
          return (
            <View className="gap-1 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="flex-1 font-semibold text-text">{adminActionLabel(item.action)}</Text>
                <Text className="text-xs text-muted">
                  {new Date(item.created_at).toLocaleString("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
              <Text className="text-sm text-muted">par {item.admin_username ?? "admin supprimé"}</Text>
              {summary ? <Text className="text-sm text-muted">{summary}</Text> : null}
            </View>
          );
        }}
        ListEmptyComponent={<Text className="mt-8 text-center text-muted">Journal vide.</Text>}
      />
    </Screen>
  );
}
