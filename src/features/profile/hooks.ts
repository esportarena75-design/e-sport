import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removeAvatar, updateProfile, uploadAvatar } from "@/features/profile/api";

function useRefreshProfile(userId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    // Le pseudo / la photo apparaissent aussi dans les profils publics, brackets et classements.
    queryClient.invalidateQueries({ queryKey: ["public-profile", userId] });
    queryClient.invalidateQueries({ queryKey: ["rankings"] });
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    queryClient.invalidateQueries({ queryKey: ["tournament-participants"] });
  };
}

export function useUpdateProfile(userId: string | undefined) {
  const refresh = useRefreshProfile(userId);
  return useMutation({
    mutationFn: (input: { username: string; bio: string }) => updateProfile(userId!, input),
    onSuccess: refresh,
  });
}

export function useUploadAvatar(userId: string | undefined) {
  const refresh = useRefreshProfile(userId);
  return useMutation({
    mutationFn: (input: { fileUri: string; mimeType: string }) => uploadAvatar({ userId: userId!, ...input }),
    onSuccess: refresh,
  });
}

export function useRemoveAvatar(userId: string | undefined) {
  const refresh = useRefreshProfile(userId);
  return useMutation({ mutationFn: () => removeAvatar(userId!), onSuccess: refresh });
}
