import { useEffect, useState } from "react";

// Renvoie `value` avec un délai : évite une requête réseau à chaque frappe dans un champ de recherche.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
