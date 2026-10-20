import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { isLegalDocId, LEGAL_DOCS, LEGAL_DRAFT_NOTICE } from "@/constants/legal";

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const legal = isLegalDocId(doc) ? LEGAL_DOCS[doc] : null;

  return (
    <Screen edges={["bottom"]}>
      <Stack.Screen options={{ title: legal?.title ?? "Document introuvable" }} />
      {legal ? (
        <ScrollView contentContainerClassName="gap-4 py-4">
          <View className="rounded-lg border border-border bg-surface p-3">
            <Text className="text-xs text-muted">{LEGAL_DRAFT_NOTICE}</Text>
          </View>
          {legal.sections.map((section) => (
            <View key={section.title} className="gap-1">
              <Text className="text-base font-semibold text-text">{section.title}</Text>
              <Text className="text-sm leading-5 text-muted">{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">Ce document n&apos;existe pas.</Text>
        </View>
      )}
    </Screen>
  );
}
