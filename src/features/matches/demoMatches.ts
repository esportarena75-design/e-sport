import type { MatchStatus } from "@/types/database";

// Matchs d'EXEMPLE affichés sur l'accueil pour remplir la page pendant le développement.
// Ils ne viennent pas de la base et ne mènent nulle part. Pour les retirer :
// passer SHOW_DEMO_MATCHES à false (ou supprimer ce fichier et son usage dans l'accueil).
export const SHOW_DEMO_MATCHES = true;

export type DemoMatch = {
  id: string;
  game: string;
  tournament: string;
  round: string;
  opponent: string;
  time: string;
  status: MatchStatus;
};

export const DEMO_MATCHES: DemoMatch[] = [
  {
    id: "demo-1",
    game: "Valorant",
    tournament: "Arena Cup #12",
    round: "Quart de finale",
    opponent: "NightFox",
    time: "Aujourd'hui · 18:30",
    status: "READY",
  },
  {
    id: "demo-2",
    game: "League of Legends",
    tournament: "Weekly Rift",
    round: "Round 2",
    opponent: "Kaizen_FR",
    time: "Aujourd'hui · 20:00",
    status: "SCHEDULED",
  },
  {
    id: "demo-3",
    game: "Rocket League",
    tournament: "Turbo League",
    round: "Demi-finale",
    opponent: "SkyBoost",
    time: "En cours",
    status: "IN_PROGRESS",
  },
  {
    id: "demo-4",
    game: "EA FC",
    tournament: "FC Showdown",
    round: "Round 3",
    opponent: "Zidane_92",
    time: "Aujourd'hui · 21:15",
    status: "AWAITING_CONFIRMATION",
  },
  {
    id: "demo-5",
    game: "Counter-Strike 2",
    tournament: "Arena Open",
    round: "Round 1",
    opponent: "Vortex",
    time: "Aujourd'hui · 22:00",
    status: "SCHEDULED",
  },
  {
    id: "demo-6",
    game: "Fortnite",
    tournament: "Night Cup",
    round: "Finale",
    opponent: "Ghost_Lab",
    time: "Aujourd'hui · 23:00",
    status: "READY",
  },
];
