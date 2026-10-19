import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applySanction,
  cancelTournament,
  createTournament,
  disqualifyParticipant,
  forfeitMatch,
  listAllTournamentsForAdmin,
  listOpenDisputes,
  resolveDispute,
  updateTournamentStatus,
} from "@/features/admin/api";

export function useAdminTournaments() {
  return useQuery({
    queryKey: ["admin-tournaments"],
    queryFn: listAllTournamentsForAdmin,
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTournament,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useUpdateTournamentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      updateTournamentStatus(input.id, input.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournament"] });
    },
  });
}

export function useOpenDisputes() {
  return useQuery({
    queryKey: ["admin-disputes"],
    queryFn: listOpenDisputes,
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveDispute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
      queryClient.invalidateQueries({ queryKey: ["match"] });
    },
  });
}

function useInvalidateAfterAdminAction(tournamentId?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["tournament"] });
    queryClient.invalidateQueries({ queryKey: ["tournament-participants"] });
    queryClient.invalidateQueries({ queryKey: ["matches", tournamentId] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["match"] });
  };
}

export function useCancelTournament() {
  const invalidate = useInvalidateAfterAdminAction();
  return useMutation({ mutationFn: cancelTournament, onSuccess: invalidate });
}

export function useForfeitMatch(tournamentId: string) {
  const invalidate = useInvalidateAfterAdminAction(tournamentId);
  return useMutation({ mutationFn: forfeitMatch, onSuccess: invalidate });
}

export function useDisqualifyParticipant(tournamentId: string) {
  const invalidate = useInvalidateAfterAdminAction(tournamentId);
  return useMutation({ mutationFn: disqualifyParticipant, onSuccess: invalidate });
}

export function useApplySanction() {
  return useMutation({ mutationFn: applySanction });
}
