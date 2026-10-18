import { useQuery } from "@tanstack/react-query";

import { getPlayerStats, getPublicProfile, listRankings } from "@/features/stats/api";

export function usePlayerStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["player-stats", userId],
    queryFn: () => getPlayerStats(userId!),
    enabled: !!userId,
  });
}

export function useRankings() {
  return useQuery({
    queryKey: ["rankings"],
    queryFn: listRankings,
  });
}

export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", id],
    queryFn: () => getPublicProfile(id!),
    enabled: !!id,
  });
}
