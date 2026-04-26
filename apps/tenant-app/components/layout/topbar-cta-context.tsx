"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface TopbarCtaCtx {
  label: string | null;
  setLabel: (l: string | null) => void;
}

const TopbarCtaContext = createContext<TopbarCtaCtx | null>(null);

export function TopbarCtaProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return (
    <TopbarCtaContext.Provider value={{ label, setLabel }}>
      {children}
    </TopbarCtaContext.Provider>
  );
}

export function useTopbarCtaLabel() {
  return useContext(TopbarCtaContext);
}

export function fireTopbarCta() {
  window.dispatchEvent(new CustomEvent("topbar-cta"));
}

export function useTopbarCta(label: string, onTrigger: () => void) {
  const ctx = useContext(TopbarCtaContext);

  useEffect(() => {
    ctx?.setLabel(label);
    return () => ctx?.setLabel(null);
  }, [label, ctx]);

  const stableOnTrigger = useCallback(onTrigger, [onTrigger]);
  useEffect(() => {
    window.addEventListener("topbar-cta", stableOnTrigger);
    return () => window.removeEventListener("topbar-cta", stableOnTrigger);
  }, [stableOnTrigger]);
}
