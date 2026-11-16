import type { CSSProperties } from "react";
import type { PublicCase } from "@fabrica/contracts";

export function portraitSheetStyle(dossier: PublicCase, index: number): CSSProperties | undefined {
  if (!dossier.portraitSheetUrl) return undefined;
  const count = dossier.suspects.length;
  const horizontalPosition = count > 1 ? (index * 100) / (count - 1) : 50;
  return {
    backgroundImage: `url(${JSON.stringify(dossier.portraitSheetUrl)})`,
    backgroundSize: `${count * 100}% auto`,
    backgroundPosition: `${horizontalPosition}% 35%`,
  };
}
