"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
