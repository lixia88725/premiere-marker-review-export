import type { MarkerReplacement } from "./types";

export interface CurrentMarkerState {
  guid: string;
  startTicks: string;
  durationTicks: string;
  comment: string;
}

export function markerReplacementConflict(
  replacement: MarkerReplacement,
  current: CurrentMarkerState | undefined
): string | null {
  if (!current || current.guid !== replacement.guid) return "marker no longer exists";
  if (
    current.startTicks !== replacement.startTicks ||
    current.durationTicks !== replacement.durationTicks ||
    current.comment !== replacement.originalComment
  ) {
    return "marker changed after AI polish";
  }
  return null;
}
