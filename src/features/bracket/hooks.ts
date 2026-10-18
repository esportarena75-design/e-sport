import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { generateBracket, listMatches } from "@/features/bracket/api";

export function useMatches(tournamentId: string | undefined) {
  return useQuery({
    queryKey: ["matches", tournamentId],
    queryFn: () => listMatches(tournamentId!),
    enabled: !!tournamentId,
  });
}

export function useGenerateBracket(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateBracket(tournamentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches", tournamentId] });
      queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    },
  });
}
