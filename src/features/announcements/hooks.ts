import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listRecentAnnouncements,
  listTournamentAnnouncements,
  sendAnnouncement,
} from "@/features/announcements/api";

export function useTournamentAnnouncements(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ["announcements", "tournament", tournamentId],
    queryFn: () => listTournamentAnnouncements(tournamentId!),
    enabled: !!tournamentId,
  });
}

export function useRecentAnnouncements() {
  return useQuery({ queryKey: ["announcements", "recent"], queryFn: () => listRecentAnnouncements() });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
    },
  });
}
