import { useState } from "react";
import { Image, Text, View } from "react-native";

// Photo de profil, ou initiale du pseudo si elle manque ou ne se charge pas.
export function Avatar({
  uri,
  name,
  size = 64,
}: {
  uri?: string | null;
  name: string;
  size?: number;
}) {
  // On retient l'URL qui a échoué plutôt qu'un booléen : une nouvelle photo est retentée d'elle-même.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri === uri;

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-primary"
      style={{ width: size, height: size }}
    >
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailedUri(uri ?? null)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="font-bold text-white" style={{ fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
