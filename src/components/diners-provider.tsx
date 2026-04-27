"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { FALLBACK_DINERS, type DinerConfig } from "@/lib/diners";

type DinersContextValue = {
  diners: DinerConfig[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const DinersContext = createContext<DinersContextValue>({
  diners: FALLBACK_DINERS,
  loading: false,
  refresh: async () => {},
});

export function DinersProvider({
  initialDiners,
  children,
}: {
  initialDiners: DinerConfig[];
  children: React.ReactNode;
}) {
  const [diners, setDiners] = useState<DinerConfig[]>(
    initialDiners.length > 0 ? initialDiners : FALLBACK_DINERS
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diners");
      if (res.ok) {
        const data: DinerConfig[] = await res.json();
        setDiners(data.length > 0 ? data : FALLBACK_DINERS);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Pas de fetch initial (server-side initial), mais on peut réécouter au focus
  useEffect(() => {
    const onFocus = () => {
      // skip during dev hot reloads
      refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return (
    <DinersContext.Provider value={{ diners, loading, refresh }}>
      {children}
    </DinersContext.Provider>
  );
}

export function useDiners(): DinerConfig[] {
  return useContext(DinersContext).diners;
}

export function useDinersContext(): DinersContextValue {
  return useContext(DinersContext);
}
