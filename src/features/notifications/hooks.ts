import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  isTournamentMuted,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setTournamentMuted,
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

export function useUnreadCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => listNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30_000,
    select: (rows) => rows.filter((n) => !n.read).length,
  });
}

export function useTournamentMuted(userId: string | undefined, tournamentId: string | undefined) {
  return useQuery({
    queryKey: ["notification-mute", userId, tournamentId],
    queryFn: () => isTournamentMuted(userId!, tournamentId!),
    enabled: !!userId && !!tournamentId,
  });
}

export function useSetTournamentMuted(userId: string | undefined, tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (muted: boolean) => setTournamentMuted({ userId: userId!, tournamentId, muted }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notification-mute", userId, tournamentId] }),
  });
}
