import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/api";

export function useNotifications(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => listNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
}

export function useMarkAllNotificationsRead(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(userId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] }),
  });
}
