import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getTournament,
  joinTournament,
  leaveTournament,
  listMyTournaments,
  listParticipants,
  listTournaments,
  TOURNAMENTS_PAGE_SIZE,
  type TournamentFilters,
} from "@/features/tournaments/api";

export function useTournaments(filters: TournamentFilters) {
  return useInfiniteQuery({
    queryKey: ["tournaments", filters],
    queryFn: ({ pageParam }) => listTournaments(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === TOURNAMENTS_PAGE_SIZE ? allPages.length : undefined,
  });
}

export function useTournament(id: string | undefined) {
  return useQuery({
    queryKey: ["tournament", id],
    queryFn: () => getTournament(id!),
    enabled: !!id,
  });
}

export function useTournamentParticipants(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ["tournament-participants", tournamentId],
    queryFn: () => listParticipants(tournamentId!),
    enabled: !!tournamentId,
  });
}

export function useMyTournaments(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-tournaments", userId],
    queryFn: () => listMyTournaments(userId!),
    enabled: !!userId,
  });
}

function useInvalidateTournament(tournamentId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["tournament-participants", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["my-tournaments"] });
  };
}

export function useJoinTournament(tournamentId: string) {
  const invalidate = useInvalidateTournament(tournamentId);
  return useMutation({
    mutationFn: () => joinTournament(tournamentId),
    onSuccess: invalidate,
  });
}

export function useLeaveTournament(tournamentId: string, userId: string | undefined) {
  const invalidate = useInvalidateTournament(tournamentId);
  return useMutation({
    mutationFn: () => leaveTournament(tournamentId, userId!),
    onSuccess: invalidate,
  });
}
