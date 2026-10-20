// Formats acceptés par le bucket `avatars` (voir la migration 20261020000000_profile_edit.sql).
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function isAllowedAvatarType(mimeType: string): boolean {
  return (AVATAR_MIME_TYPES as readonly string[]).includes(mimeType);
}

const EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Chemin {user_id}/avatar-<horodatage>.<ext> : le dossier doit être celui de l'utilisateur (policy
// storage) ; l'horodatage change l'URL à chaque envoi, ce qui évite d'afficher l'ancienne image en cache.
export function avatarPath(userId: string, mimeType: string, now: number = Date.now()): string {
  return `${userId}/avatar-${now}.${EXTENSIONS[mimeType] ?? "jpg"}`;
}
