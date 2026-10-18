import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { ColorValue } from "react-native";

import { colors } from "@/constants/colors";

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_SIZE = 26;
const ICON_OFFSET = 10;

function TabIcon({
  name,
  outlineName,
  color,
  focused,
}: {
  name: IconName;
  outlineName: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  return <Ionicons name={focused ? name : outlineName} color={color as string} size={ICON_SIZE} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          marginHorizontal: 16,
          marginBottom: 22,
          height: 72,
          paddingBottom: 0,
          borderRadius: 28,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderWidth: 2,
          borderColor: colors.border,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        tabBarItemStyle: { paddingTop: ICON_OFFSET },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" outlineName="home-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          title: "Tournois",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="trophy"
              outlineName="trophy-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Mes matchs",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="game-controller"
              outlineName="game-controller-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ranking"
        options={{
          title: "Classement",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="podium"
              outlineName="podium-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="person"
              outlineName="person-outline"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}
