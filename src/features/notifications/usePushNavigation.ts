import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { notificationTarget } from "@/utils/notifications";

// Touche sur une notification push (appli fermée, en arrière-plan ou ouverte) : on ouvre
// directement le match, le tournoi ou l'écran admin concerné. Chaque réponse n'est traitée
// qu'une fois, et seulement quand l'utilisateur est connecté (`enabled`).
export function usePushNavigation(enabled: boolean) {
  const response = Notifications.useLastNotificationResponse();
  const handledId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !response) return;
    const id = response.notification.request.identifier;
    if (handledId.current === id) return;
    handledId.current = id;

    const content = response.notification.request.content;
    const target = notificationTarget("", content.data as Record<string, unknown> | undefined);
    if (target) router.push(target as never);
  }, [enabled, response]);
}
