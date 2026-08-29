import type { ReviewMarker } from "./types";
import { ppro, withSequenceRange } from "./premiere";
import { createRenderTracker } from "./renderTracker";
import { copyStagedFrame } from "./frameStaging";

const TERMINAL_TIMEOUT_MS = 30 * 60 * 1000;
const uxp: any = require("uxp");

function joinNativePath(folder: string, name: string): string {
  const separator = folder.includes("\\") ? "\\" : "/";
  return folder.replace(/[\\/]$/, "") + separator + name;
}

function posterName(marker: ReviewMarker): string {
  return marker.assetFileName.replace(/\.mp4$/i, "-poster.jpg");
}

async function exportFrame(sequence: any, staging: any, assets: any, marker: ReviewMarker, requestedName: string): Promise<string | null> {
  const rect: any = await sequence.getFrameSize();
  const sourceWidth = Math.max(1, Number(rect?.width || 1280));
  const sourceHeight = Math.max(1, Number(rect?.height || 720));
  const scale = Math.min(1, 1280 / sourceWidth);
  const width = Math.max(2, Math.round(sourceWidth * scale / 2) * 2);
  const height = Math.max(2, Math.round(sourceHeight * scale / 2) * 2);
  const success = await ppro.Exporter.exportSequenceFrame(
    sequence,
    ppro.TickTime.createWithSeconds(marker.startSeconds),
    requestedName,
    staging.nativePath,
    width,
    height
  );
  return copyStagedFrame({
    staging,
    destination: assets,
    requestedName,
    binaryFormat: uxp.storage.formats.binary,
    attempts: success ? 12 : 1
  });
}

export async function exportMarkerMedia(options: {
  project: any;
  sequence: any;
  markers: ReviewMarker[];
  assets: any;
  presetPath: string;
  onProgress: (message: string, type?: string) => void;
}): Promise<void> {
  const { project, sequence, markers, assets, presetPath, onProgress } = options;
  const videos = markers.filter((marker) => marker.mediaType === "video");
  const encoder = ppro.EncoderManager.getManager();
  if (videos.length && !encoder.isAMEInstalled) {
    throw new Error("Adobe Media Encoder 26.3 or later is required for duration markers.");
  }

  const tempRoot = await uxp.storage.localFileSystem.getTemporaryFolder();
  const staging = await tempRoot.createFolder(`review-frames-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
  try {
    for (const marker of markers) {
      const requested = marker.mediaType === "video" ? posterName(marker) : marker.assetFileName;
      try {
        const actual = await exportFrame(sequence, staging, assets, marker, requested);
        if (marker.mediaType === "image") {
          marker.mediaAvailable = !!actual;
          if (actual) marker.assetFileName = actual;
        } else {
          marker.posterFileName = actual || "";
        }
        onProgress(actual ? `${actual} exported.` : `${requested} failed in Premiere frame exporter.`, actual ? "ok" : "error");
      } catch (error: any) {
        if (marker.mediaType === "image") marker.mediaAvailable = false;
        else marker.posterFileName = "";
        onProgress(`${requested} failed: ${error?.message || error}`, "error");
      }
    }
  } finally {
    try { await staging.delete(); } catch (_error) { /* UXP clears plugin-temp automatically */ }
  }

  if (!videos.length) return;
  if (!await encoder.launchEncoder()) throw new Error("Adobe Media Encoder could not be launched.");
  const expectedNames = videos.map((marker) => marker.assetFileName);
  const renderWait = createRenderTracker({
    encoder,
    eventManager: ppro.EventManager,
    events: {
      queue: ppro.EncoderManager.EVENT_RENDER_QUEUE,
      progress: ppro.EncoderManager.EVENT_RENDER_PROGRESS,
      complete: ppro.EncoderManager.EVENT_RENDER_COMPLETE,
      error: ppro.EncoderManager.EVENT_RENDER_ERROR,
      cancel: ppro.EncoderManager.EVENT_RENDER_CANCEL
    },
    expectedNames,
    onProgress: (message) => onProgress(message),
    timeoutMs: TERMINAL_TIMEOUT_MS
  });

  for (const marker of videos) {
    const outputPath = joinNativePath(assets.nativePath, marker.assetFileName);
    const queued = await withSequenceRange(
      project,
      sequence,
      marker.startSeconds,
      marker.startSeconds + marker.durationSeconds,
      () => encoder.exportSequence(
        sequence,
        ppro.Constants.ExportType.QUEUE_TO_AME,
        outputPath,
        presetPath,
        false
      )
    );
    if (!queued) {
      renderWait.markFailed(marker.assetFileName, "Could not queue in AME");
      onProgress(`${marker.assetFileName} could not be queued.`, "error");
    }
  }

  if (!await encoder.startBatchEncode()) {
    for (const marker of videos) renderWait.markFailed(marker.assetFileName, "AME batch could not be started");
  }
  const results = await renderWait.promise;
  for (const result of results) {
    const marker = videos.find((item) => item.assetFileName === result.fileName);
    if (marker) marker.mediaAvailable = result.success;
    onProgress(result.success ? `${result.fileName} exported.` : `${result.fileName} failed: ${result.error}`, result.success ? "ok" : "error");
  }
}
