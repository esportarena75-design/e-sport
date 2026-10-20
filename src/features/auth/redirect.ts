// Lecture de l'URL ouverte par le lien du mail de réinitialisation.
// Supabase (flux « implicit ») renvoie les jetons dans le fragment :
//   esportapp://reset-password#access_token=…&refresh_token=…&type=recovery
// ou, si le lien est périmé :
//   esportapp://reset-password#error=access_denied&error_code=otp_expired&error_description=…
export type AuthRedirect =
  | { kind: "tokens"; accessToken: string; refreshToken: string; type: string | null }
  | { kind: "error"; code: string | null; description: string };

function readParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const parts: string[] = [];
  if (queryIndex !== -1) parts.push(url.slice(queryIndex + 1, hashIndex > queryIndex ? hashIndex : undefined));
  if (hashIndex !== -1) parts.push(url.slice(hashIndex + 1));
  return new URLSearchParams(parts.join("&"));
}

export function parseAuthRedirect(url: string | null | undefined): AuthRedirect | null {
  if (!url) return null;
  const params = readParams(url);

  const error = params.get("error") ?? params.get("error_code");
  if (error) {
    return {
      kind: "error",
      code: params.get("error_code") ?? params.get("error"),
      description: params.get("error_description")?.replace(/\+/g, " ") ?? "Lien invalide",
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) {
    return { kind: "tokens", accessToken, refreshToken, type: params.get("type") };
  }
  return null;
}
