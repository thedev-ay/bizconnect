'use client';

import dynamic from "next/dynamic";

export const DependencyGraphLoader = dynamic(
  () => import("./dependency-graph").then((m) => m.ModuleDependencyGraph),
  { ssr: false },
);
