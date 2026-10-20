import { useQuery } from "@tanstack/react-query";

import { listLatestNews } from "@/features/news/api";

export function useLatestNews() {
  return useQuery({
    queryKey: ["news", "latest"],
    queryFn: () => listLatestNews(),
    // Les actus ne changent pas à la minute : inutile de refetch à chaque retour sur l'accueil.
    staleTime: 10 * 60 * 1000,
  });
}
