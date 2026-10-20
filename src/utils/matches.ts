import type { MatchPublic } from "@/types/database";
import { isBye } from "@/utils/bracket";

const UPCOMING_STATUSES = ["SCHEDULED", "READY", "IN_PROGRESS", "AWAITING_CONFIRMATION", "DISPUTED"];

type StartInfo = Pick<MatchPublic, "scheduled_at" | "round" | "tournament_start_date">;

// Date de début d'un match : celle fixée par un admin, sinon (premier tour seulement) la date de
// début du tournoi. Les tours suivants n'ont pas de date tant qu'elle n'est pas fixée.
export function getMatchStart(match: StartInfo): string | null {
  return match.scheduled_at ?? (match.round === 1 ? match.tournament_start_date : null);
}

// `status` est un simple string ici : la comparaison se fait contre UPCOMING_STATUSES, et les tests
// passent des objets littéraux dont le statut n'est pas typé MatchStatus.
type SortableMatch = StartInfo & { status: string; completed_at: string | null; created_at: string };

// Sépare « à venir » (par date croissante, sans date en dernier) et « historique » (récents d'abord).
export function splitMyMatches<T extends SortableMatch>(matches: T[]): { upcoming: T[]; history: T[] } {
  const upcoming = matches
    .filter((m) => UPCOMING_STATUSES.includes(m.status))
    .sort((a, b) => {
      const da = getMatchStart(a);
      const db = getMatchStart(b);
      if (da && db) return new Date(da).getTime() - new Date(db).getTime();
      if (da) return -1;
      if (db) return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const history = matches
    .filter((m) => !UPCOMING_STATUSES.includes(m.status))
    .sort(
      (a, b) =>
        new Date(b.completed_at ?? b.created_at).getTime() -
        new Date(a.completed_at ?? a.created_at).getTime(),
    );

  return { upcoming, history };
}

export { isBye };

// Compte à rebours : « 2 j 04 h 12 min » au-delà de 24 h, « 03:12:45 » en dessous, « En cours »
// une fois la date passée.
export function formatCountdown(targetIso: string, now: number = Date.now()): string {
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return "Maintenant";

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  if (days > 0) return `${days} j ${pad(hours)} h ${pad(minutes)} min`;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatMatchDate(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
