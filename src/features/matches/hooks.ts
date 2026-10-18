import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmMatchResult,
  getMatch,
  listMatchReports,
  listMyMatches,
  openDispute,
  reportMatchResult,
} from "@/features/matches/api";
import type { DisputeReason } from "@/types/database";

export function useMatch(id: string | undefined) {
  return useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatch(id!),
    enabled: !!id,
  });
}

export function useMatchReports(matchId: string | undefined) {
  return useQuery({
    queryKey: ["match-reports", matchId],
    queryFn: () => listMatchReports(matchId!),
    enabled: !!matchId,
  });
}

export function useMyMatches(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-matches", userId],
    queryFn: () => listMyMatches(userId!),
    enabled: !!userId,
  });
}

function useInvalidateMatch(matchId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["match", matchId] });
    queryClient.invalidateQueries({ queryKey: ["match-reports", matchId] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["my-matches"] });
    queryClient.invalidateQueries({ queryKey: ["tournament"] });
    queryClient.invalidateQueries({ queryKey: ["my-tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["rankings"] });
  };
}

export function useReportMatchResult(matchId: string) {
  const invalidate = useInvalidateMatch(matchId);
  return useMutation({
    mutationFn: (input: {
      myScore: number;
      opponentScore: number;
      comment?: string;
      evidencePath?: string;
    }) => reportMatchResult({ matchId, ...input }),
    onSuccess: invalidate,
  });
}

export function useConfirmMatchResult(matchId: string) {
  const invalidate = useInvalidateMatch(matchId);
  return useMutation({
    mutationFn: () => confirmMatchResult(matchId),
    onSuccess: invalidate,
  });
}

export function useOpenDispute(matchId: string) {
  const invalidate = useInvalidateMatch(matchId);
  return useMutation({
    mutationFn: (input: { reason: DisputeReason; description?: string; evidencePath?: string }) =>
      openDispute({ matchId, ...input }),
    onSuccess: invalidate,
  });
}
