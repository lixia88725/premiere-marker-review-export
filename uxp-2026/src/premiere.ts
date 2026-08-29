import type { MarkerReplacement, RawMarker, SequenceContext } from "./types";
import type { premierepro } from "@adobe/premierepro";
import { markerReplacementConflict } from "./markerGuard";

const ppro = require("premierepro") as premierepro;
const TICKS_PER_SECOND = 254016000000;

function ticksForSeconds(seconds: number): string {
  return String(Math.round(seconds * TICKS_PER_SECOND));
}

export function formatSeconds(value: number): string {
  const safe = Math.max(0, Number(value) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const millis = Math.round((safe - Math.floor(safe)) * 1000);
  const pad2 = (part: number) => String(part).padStart(2, "0");
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${String(millis).padStart(3, "0")}`;
}

export async function getSequenceContext(): Promise<SequenceContext> {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("No active project. Open a Premiere project first.");
  const sequence = await project.getActiveSequence();
  if (!sequence) throw new Error("No active sequence. Open a sequence timeline first.");

  const owner = await ppro.Markers.getMarkers(sequence);
  const markers: RawMarker[] = owner.getMarkers().map((marker: any) => {
    const startSeconds = Number(marker.getStart().seconds || 0);
    const durationSeconds = Math.max(0, Number(marker.getDuration().seconds || 0));
    const startTicks = ticksForSeconds(startSeconds);
    const durationTicks = ticksForSeconds(durationSeconds);
    return {
      guid: marker.guid?.toString?.() || "",
      name: marker.getName() || "",
      comment: marker.getComments() || "",
      startSeconds,
      durationSeconds,
      startTicks,
      endTicks: ticksForSeconds(startSeconds + durationSeconds),
      durationTicks,
      startTimecode: formatSeconds(startSeconds),
      durationText: formatSeconds(durationSeconds)
    };
  });

  return {
    project,
    sequence,
    projectName: project.name || sequence.name,
    sequenceName: sequence.name,
    markers
  };
}

export async function withSequenceRange<T>(
  project: any,
  sequence: any,
  startSeconds: number,
  endSeconds: number,
  callback: () => Promise<T>
): Promise<T> {
  const oldIn = await sequence.getInPoint();
  const oldOut = await sequence.getOutPoint();
  try {
    setSequenceRange(project, sequence, startSeconds, endSeconds, "Set marker export range");
    return await callback();
  } finally {
    setSequenceRange(
      project,
      sequence,
      Number(oldIn.seconds || 0),
      Number(oldOut.seconds || 0),
      "Restore sequence In and Out"
    );
  }
}

function setSequenceRange(project: any, sequence: any, start: number, end: number, label: string): void {
  let success = false;
  project.lockedAccess(() => {
    success = project.executeTransaction((compoundAction: any) => {
      compoundAction.addAction(sequence.createSetInPointAction(ppro.TickTime.createWithSeconds(start)));
      compoundAction.addAction(sequence.createSetOutPointAction(ppro.TickTime.createWithSeconds(end)));
    }, label);
  });
  if (!success) throw new Error(`Premiere could not ${label.toLowerCase()}.`);
}

export async function applyMarkerReplacements(replacements: MarkerReplacement[]): Promise<{updatedCount: number; skippedCount: number; messages: string[]}> {
  const context = await getSequenceContext();
  const owner = await ppro.Markers.getMarkers(context.sequence);
  const current = owner.getMarkers();
  const byGuid = new Map<string, any>(current.map((marker: any) => [marker.guid?.toString?.() || "", marker]));
  const actions: Array<{ marker: any; replacement: MarkerReplacement }> = [];
  const messages: string[] = [];
  let skippedCount = 0;

  for (const replacement of replacements) {
    const marker: any = byGuid.get(replacement.guid);
    const conflict = markerReplacementConflict(replacement, marker ? {
      guid: marker.guid?.toString?.() || "",
      startTicks: ticksForSeconds(Number(marker.getStart().seconds || 0)),
      durationTicks: ticksForSeconds(Number(marker.getDuration().seconds || 0)),
      comment: String(marker.getComments() || "")
    } : undefined);
    if (conflict) {
      skippedCount += 1;
      messages.push(`Skipped marker ${replacement.index}: ${conflict}.`);
      continue;
    }
    actions.push({ marker, replacement });
  }

  if (actions.length) {
    let success = false;
    context.project.lockedAccess(() => {
      success = context.project.executeTransaction((compoundAction: any) => {
        for (const item of actions) {
          compoundAction.addAction(item.marker.createSetCommentsAction(item.replacement.polishedComment));
        }
      }, "Apply polished marker comments");
    });
    if (!success) throw new Error("Premiere could not update marker comments.");
    for (const item of actions) messages.push(`Updated marker ${item.replacement.index}.`);
  }

  return { updatedCount: actions.length, skippedCount, messages };
}

export { ppro };
