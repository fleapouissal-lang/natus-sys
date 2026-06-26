"use client";

import { NatusCursor } from "@/components/layout/natus-cursor";
import { NatusPreloader } from "@/components/layout/natus-preloader";

/** Preloader au démarrage + curseur personnalisé desktop. */
export function NatusShellEffects() {
  return (
    <>
      <NatusPreloader />
      <NatusCursor />
    </>
  );
}
