import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addGameAccount,
  deleteGameAccount,
  listGameAccounts,
  listGames,
  listPlatforms,
} from "@/features/game-accounts/api";

export function useGames() {
  return useQuery({ queryKey: ["games"], queryFn: listGames });
}

export function usePlatforms() {
  return useQuery({ queryKey: ["platforms"], queryFn: listPlatforms });
}

export function useGameAccounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["game-accounts", userId],
    queryFn: () => listGameAccounts(userId!),
    enabled: !!userId,
  });
}

export function useAddGameAccount(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { gameId: string; platformId: string; playerIdentifier: string }) =>
      addGameAccount({ userId: userId!, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-accounts", userId] });
    },
  });
}

export function useDeleteGameAccount(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGameAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-accounts", userId] });
    },
  });
}
