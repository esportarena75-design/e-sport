export function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Finale";
  if (fromEnd === 1) return "Demi-finales";
  if (fromEnd === 2) return "Quarts de finale";
  return `Tour ${round}`;
}

// Un match exempté (bye) est créé par generate_bracket avec un seul joueur, déjà vainqueur,
// en statut FORFEIT : il n'y a rien à jouer ni à déclarer.
export function isBye(match: {
  status: string;
  player_1_id: string | null;
  player_2_id: string | null;
  winner_id: string | null;
}): boolean {
  return (
    match.status === "FORFEIT" &&
    match.winner_id !== null &&
    (match.player_1_id === null) !== (match.player_2_id === null)
  );
}
