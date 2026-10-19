export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

// Date courte pour une actu : relative la première semaine ("il y a 2 j"), puis "24 août"
// (l'année n'est ajoutée que si elle diffère de l'année en cours).
export function formatNewsDate(iso: string, now: number = Date.now()): string {
  const date = new Date(iso);
  const diffDays = (now - date.getTime()) / 86_400_000;
  if (diffDays >= 0 && diffDays < 7) return timeAgo(iso, now);

  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// Le statut en base ne bascule en REGISTRATION_CLOSED que lorsque la tâche planifiée
// `close_expired_registrations` passe : en attendant, l'affichage tient compte de la date.
type RegistrationWindow = { status: string; registration_end: string };

export function isRegistrationOpen(t: RegistrationWindow, now: number = Date.now()): boolean {
  return t.status === "REGISTRATION_OPEN" && new Date(t.registration_end).getTime() > now;
}

export function displayStatus<S extends string>(t: RegistrationWindow & { status: S }, now: number = Date.now()): S | "REGISTRATION_CLOSED" {
  return t.status === "REGISTRATION_OPEN" && !isRegistrationOpen(t, now) ? "REGISTRATION_CLOSED" : t.status;
}
