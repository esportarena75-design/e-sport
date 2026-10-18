import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { registerDevice } from "@/features/notifications/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Registers this device's Expo push token so the server can target it. Remote push
// tokens require a development build on Android since SDK 53 -- Expo Go can't provide
// one there, so this silently no-ops in that case. The in-app notification feed (read
// from the `notifications` table) works regardless; only the OS-level push alert needs
// a registered device.
export function usePushRegistration(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    let isMounted = true;

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      }).catch(() => {});
    }

    (async () => {
      try {
        // expo-notifications' NotificationPermissionsStatus type currently fails to
        // resolve its `status` field (it extends a `PermissionResponse` re-exported
        // from `expo`, which this version no longer exports) -- the runtime value is
        // still a plain { status: string } object, hence the local cast.
        const existingPermissions = (await Notifications.getPermissionsAsync()) as { status: string };
        let finalStatus = existingPermissions.status;
        if (finalStatus !== "granted") {
          const requestedPermissions = (await Notifications.requestPermissionsAsync()) as {
            status: string;
          };
          finalStatus = requestedPermissions.status;
        }
        if (finalStatus !== "granted") return;

        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        if (!isMounted) return;

        await registerDevice({
          userId,
          expoPushToken: tokenResponse.data,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
      } catch {
        // See the note above -- expected in Expo Go on Android (SDK 53+).
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [userId]);
}
