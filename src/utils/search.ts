// Neutralise les jokers de LIKE (% _ \) saisis par l'utilisateur et les virgules/parenthèses
// qui casseraient la syntaxe des filtres PostgREST : la recherche reste une recherche de texte.
export function toLikePattern(input: string): string {
  const cleaned = input
    .trim()
    .replace(/[\\%_]/g, (c) => `\\${c}`)
    .replace(/[,()]/g, " ");
  return `%${cleaned}%`;
}
