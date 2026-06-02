export const TICKS_PER_SECOND = 254016000000;

export function ticksToSeconds(ticks) {
  return Number(ticks || 0) / TICKS_PER_SECOND;
}

export function formatSeconds(seconds) {
  return Number(seconds).toFixed(3);
}

export function buildPosterFileName(assetFileName) {
  return String(assetFileName).replace(/\.mp4$/i, '-poster.jpg');
}

export function buildPosterFfmpegArgs({ ffmpegPath, masterVideoPath, outputPath, marker }) {
  return [ffmpegPath, '-y', '-ss', formatSeconds(ticksToSeconds(marker.startTicks)), '-i', masterVideoPath, '-frames:v', '1', '-q:v', '3', outputPath];
}

export function buildFfmpegArgs({ ffmpegPath, masterVideoPath, outputPath, marker }) {
  const start = formatSeconds(ticksToSeconds(marker.startTicks));
  if (marker.mediaType === 'image') {
    return [ffmpegPath, '-y', '-ss', start, '-i', masterVideoPath, '-frames:v', '1', '-q:v', '2', outputPath];
  }

  return [ffmpegPath, '-y', '-ss', start, '-i', masterVideoPath, '-t', formatSeconds(ticksToSeconds(marker.durationTicks)), '-vf', 'scale=540:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '64k', outputPath];
}
