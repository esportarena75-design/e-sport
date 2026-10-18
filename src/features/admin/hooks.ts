import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTournament,
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
