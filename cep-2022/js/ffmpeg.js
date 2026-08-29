(function () {
  var TICKS_PER_SECOND = 254016000000;
  function ticksToSeconds(ticks) { return Number(ticks || 0) / TICKS_PER_SECOND; }
  function formatSeconds(seconds) { return Number(seconds).toFixed(3); }
  function buildPosterFileName(assetFileName) { return String(assetFileName).replace(/\.mp4$/i, '-poster.jpg'); }
  function buildPosterFfmpegArgs(options) { return [options.ffmpegPath, '-y', '-ss', formatSeconds(ticksToSeconds(options.marker.startTicks)), '-i', options.masterVideoPath, '-frames:v', '1', '-q:v', '3', options.outputPath]; }
  function buildFfmpegArgs(options) {
    var marker = options.marker;
    var start = formatSeconds(ticksToSeconds(marker.startTicks));
    if (marker.mediaType === 'image') return [options.ffmpegPath, '-y', '-ss', start, '-i', options.masterVideoPath, '-frames:v', '1', '-q:v', '2', options.outputPath];
    return [options.ffmpegPath, '-y', '-ss', start, '-i', options.masterVideoPath, '-t', formatSeconds(ticksToSeconds(marker.durationTicks)), '-vf', 'scale=540:-2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '64k', options.outputPath];
  }
  window.ReviewFfmpeg = { ticksToSeconds: ticksToSeconds, buildPosterFileName: buildPosterFileName, buildPosterFfmpegArgs: buildPosterFfmpegArgs, buildFfmpegArgs: buildFfmpegArgs };
}());
