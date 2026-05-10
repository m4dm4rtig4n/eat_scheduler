"use client";

import { useEffect, useState } from "react";

// Détecte si la viewport est sous le breakpoint `lg` de Tailwind (1024px).
// Cohérent avec le reste de l'app qui bascule en layout mobile à `lg:`.
//
// SSR-safe : la valeur initiale est `false` (desktop) car `window` n'existe
// pas côté serveur. La vraie valeur est calculée dans useEffect au montage.
// Cela peut causer un flash desktop → mobile sur les très petits écrans
// pendant l'hydratation, acceptable pour ce cas d'usage.

const MOBILE_QUERY = "(max-width: 1023px)";

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
