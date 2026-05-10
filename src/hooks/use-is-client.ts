"use client";

import { useEffect, useState } from "react";

// Renvoie `false` pendant le SSR et le premier rendu client (pour que les
// deux HTML correspondent), puis `true` après l'effet de montage.
//
// Utilisé pour différer l'appel à des libs tierces qui génèrent des IDs
// non-déterministes côté serveur (ex : @dnd-kit/core qui utilise un compteur
// global de module au lieu de React.useId, provoquant des hydration mismatch
// sur l'attribut `aria-describedby`).

export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  return isClient;
}
