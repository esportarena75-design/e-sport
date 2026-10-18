import { useQuery } from "@tanstack/react-query";

import { getProfile } from "@/features/auth/api";

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
}
