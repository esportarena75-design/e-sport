import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applySanction,
  cancelTournament,
  createNews,
  createTournament,
  deleteNews,
  disqualifyParticipant,
  forfeitMatch,
  getAdminUser,
  liftSanction,
  listAdminLogs,
  listAllNews,
  listUserSanctions,
  listAllTournamentsForAdmin,
  listOpenDisputes,
  resolveDispute,
  scheduleMatch,
  setNewsPublished,
  searchUsers,
  updateTournament,
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

export function useScheduleMatch(tournamentId: string) {
  const invalidate = useInvalidateAfterAdminAction(tournamentId);
  return useMutation({ mutationFn: scheduleMatch, onSuccess: invalidate });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => searchUsers(query),
    enabled: query.trim().length >= 2,
  });
}

export function useAdminUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => getAdminUser(userId!),
    enabled: !!userId,
  });
}

export function useUserSanctions(userId: string | undefined) {
  return useQuery({
    queryKey: ["admin-user-sanctions", userId],
    queryFn: () => listUserSanctions(userId!),
    enabled: !!userId,
  });
}

function useInvalidateAfterUserAction(userId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-user", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-user-sanctions", userId] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
  };
}

export function useLiftSanction(userId: string) {
  const invalidate = useInvalidateAfterUserAction(userId);
  return useMutation({ mutationFn: liftSanction, onSuccess: invalidate });
}

export function useApplySanctionToUser(userId: string) {
  const invalidate = useInvalidateAfterUserAction(userId);
  return useMutation({ mutationFn: applySanction, onSuccess: invalidate });
}

export function useAdminLogs() {
  return useQuery({ queryKey: ["admin-logs"], queryFn: () => listAdminLogs(100) });
}

export function useUpdateTournament(tournamentId: string) {
  const invalidate = useInvalidateAfterAdminAction(tournamentId);
  return useMutation({ mutationFn: updateTournament, onSuccess: invalidate });
}

function useInvalidateNews() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    queryClient.invalidateQueries({ queryKey: ["news"] });
  };
}

export function useAdminNews() {
  return useQuery({ queryKey: ["admin-news"], queryFn: listAllNews });
}

export function useCreateNews() {
  const invalidate = useInvalidateNews();
  return useMutation({ mutationFn: createNews, onSuccess: invalidate });
}

export function useSetNewsPublished() {
  const invalidate = useInvalidateNews();
  return useMutation({ mutationFn: setNewsPublished, onSuccess: invalidate });
}

export function useDeleteNews() {
  const invalidate = useInvalidateNews();
  return useMutation({ mutationFn: deleteNews, onSuccess: invalidate });
}
