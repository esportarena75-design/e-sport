// Durées proposées pour une suspension. "forever" = suspension sans date de fin.
export const SUSPENSION_DURATIONS = [
  { value: "1", label: "1 jour", days: 1 },
  { value: "3", label: "3 jours", days: 3 },
  { value: "7", label: "7 jours", days: 7 },
  { value: "30", label: "30 jours", days: 30 },
  { value: "forever", label: "Indéfinie", days: null },
] as const;

export type SuspensionDurationValue = (typeof SUSPENSION_DURATIONS)[number]["value"];

// Date de fin d'une suspension à partir de la durée choisie (null = indéfinie).
export function suspensionEndDate(
  value: SuspensionDurationValue,
  now: Date = new Date(),
): Date | null {
  const option = SUSPENSION_DURATIONS.find((d) => d.value === value);
  if (!option || option.days === null) return null;
  return new Date(now.getTime() + option.days * 86_400_000);
}
