"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

interface TopbarPageState {
  title?: string | null;
  description?: string | null;
}

interface TopbarCtaCtx {
  label: string | null;
  setLabel: (l: string | null) => void;
  secondaryLabel: string | null;
  setSecondaryLabel: (l: string | null) => void;
  page: TopbarPageState;
  setPage: React.Dispatch<React.SetStateAction<TopbarPageState>>;
}

const TopbarCtaContext = createContext<TopbarCtaCtx | null>(null);

export function TopbarCtaProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const [secondaryLabel, setSecondaryLabel] = useState<string | null>(null);
  const [page, setPage] = useState<TopbarPageState>({});
  const value = useMemo(
    () => ({ label, setLabel, secondaryLabel, setSecondaryLabel, page, setPage }),
    [label, secondaryLabel, page]
  );

  return (
    <TopbarCtaContext.Provider value={value}>
      {children}
    </TopbarCtaContext.Provider>
  );
}

export function useTopbarCtaLabel() {
  return useContext(TopbarCtaContext);
}

function fireTopbarAction(eventName: "topbar-cta" | "topbar-secondary-cta") {
  window.dispatchEvent(new CustomEvent(eventName));
}

function useTopbarAction(
  label: string | null,
  onTrigger: () => void,
  eventName: "topbar-cta" | "topbar-secondary-cta",
  setActionLabel: ((label: string | null) => void) | undefined
) {
  useEffect(() => {
    setActionLabel?.(label);
    return () => setActionLabel?.(null);
  }, [label, setActionLabel]);

  const stableOnTrigger = useCallback(onTrigger, [onTrigger]);
  useEffect(() => {
    if (!label) return;
    window.addEventListener(eventName, stableOnTrigger);
    return () => window.removeEventListener(eventName, stableOnTrigger);
  }, [eventName, label, stableOnTrigger]);
}

export function fireTopbarCta() {
  fireTopbarAction("topbar-cta");
}

export function fireTopbarSecondaryCta() {
  fireTopbarAction("topbar-secondary-cta");
}

export function useTopbarCta(label: string | null, onTrigger: () => void) {
  const ctx = useContext(TopbarCtaContext);
  useTopbarAction(label, onTrigger, "topbar-cta", ctx?.setLabel);
}

export function useTopbarSecondaryCta(label: string | null, onTrigger: () => void) {
  const ctx = useContext(TopbarCtaContext);
  useTopbarAction(label, onTrigger, "topbar-secondary-cta", ctx?.setSecondaryLabel);
}

export function useTopbarPage(page: TopbarPageState) {
  const ctx = useContext(TopbarCtaContext);
  const setPage = ctx?.setPage;
  const { title = null, description = null } = page;

  useEffect(() => {
    setPage?.((current) => {
      if (current.title === title && current.description === description) {
        return current;
      }

      return { title, description };
    });

    return () =>
      setPage?.((current) => {
        if (!current.title && !current.description) {
          return current;
        }

        return {};
      });
  }, [setPage, title, description]);
}
