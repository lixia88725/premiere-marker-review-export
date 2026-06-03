#target premierepro

var REVIEW_EXPORT_TICKS_PER_SECOND = 254016000000;

function getSequenceSummary() {
  try {
    var seq = activeSequenceOrThrow();
    return stringifyResult({ ok: true, sequenceName: seq.name, projectName: projectNameOrSequence(seq), projectFolder: projectFolderOrEmpty(), markerCount: countSequenceMarkers(seq) });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function collectMarkers() {
  try {
    var seq = activeSequenceOrThrow();
    var markers = [];
    var marker = seq.markers.getFirstMarker();
    var index = 1;
    while (marker) {
      var startTicks = ticksFromTime(marker.start);
      var endTicks = ticksFromTime(marker.end || marker.start);
      var durationTicks = Math.max(0, endTicks - startTicks);
      markers.push({ index: index, name: marker.name || '', comment: marker.comments || '', startTicks: String(startTicks), endTicks: String(endTicks), durationTicks: String(durationTicks), startTimecode: formatTicks(startTicks), durationText: formatTicks(durationTicks) });
      index += 1;
      marker = seq.markers.getNextMarker(marker);
    }
    return stringifyResult({ ok: true, sequenceName: seq.name, projectName: projectNameOrSequence(seq), projectFolder: projectFolderOrEmpty(), markers: markers });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function replaceMarkerComments(replacementsJson) {
  try {
    var seq = activeSequenceOrThrow();
    var replacements = JSON.parse(replacementsJson);
    var updatedCount = 0;
    var skippedCount = 0;
    var messages = [];
    var marker = seq.markers.getFirstMarker();
    var index = 1;

    while (marker) {
      var replacement = replacementForIndex(replacements, index);
      if (replacement) {
        var startTicks = String(ticksFromTime(marker.start));
        var endTicks = String(ticksFromTime(marker.end || marker.start));
        var durationTicks = String(Math.max(0, Number(endTicks) - Number(startTicks)));
        var currentComment = String(marker.comments || '');

        if (startTicks !== String(replacement.startTicks) || durationTicks !== String(replacement.durationTicks) || currentComment !== String(replacement.originalComment || '')) {
          skippedCount += 1;
          messages.push('Skipped marker ' + index + ': marker changed after AI polish.');
        } else {
          marker.comments = replacement.polishedComment;
          updatedCount += 1;
          messages.push('Updated marker ' + index + '.');
        }
      }
      index += 1;
      marker = seq.markers.getNextMarker(marker);
    }

    return stringifyResult({ ok: true, updatedCount: updatedCount, skippedCount: skippedCount, messages: messages });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function exportMarkerMedia(outputRoot, videoPresetPath, framePresetPath, markersJson) {
  try {
    var seq = activeSequenceOrThrow();
    var markers = JSON.parse(markersJson);
    var items = [];
    app.encoder.launchEncoder();
    for (var i = 0; i < markers.length; i += 1) {
      var marker = markers[i];
      var outputPath = outputRoot + '/assets/' + marker.assetFileName;
      var presetPath = marker.mediaType === 'video' ? videoPresetPath : framePresetPath;
      var jobId = queueMarkerExport(seq, marker, outputPath, presetPath);
      items.push({ ok: jobId !== '0' && jobId !== 0 && jobId !== null, assetFileName: marker.assetFileName, jobId: String(jobId), message: marker.assetFileName + (jobId ? ' queued in AME.' : ' failed to queue.') });
    }
    if (items.length > 0) app.encoder.startBatch();
    return stringifyResult({ ok: true, items: items });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function exportSingleMarkerMedia(outputRoot, videoPresetPath, framePresetPath, markerJson) {
  try {
    var seq = activeSequenceOrThrow();
    var marker = JSON.parse(markerJson);
    app.encoder.launchEncoder();
    var outputPath = outputRoot + '/assets/' + marker.assetFileName;
    var presetPath = marker.mediaType === 'video' ? videoPresetPath : framePresetPath;
    var jobId = queueMarkerExport(seq, marker, outputPath, presetPath);
    return stringifyResult({ ok: true, item: { ok: jobId !== '0' && jobId !== 0 && jobId !== null, assetFileName: marker.assetFileName, jobId: String(jobId), message: marker.assetFileName + (jobId ? ' queued in AME.' : ' failed to queue.') } });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function startQueuedMedia() {
  try {
    app.encoder.startBatch();
    return stringifyResult({ ok: true });
  } catch (error) {
    return stringifyResult({ ok: false, error: String(error) });
  }
}

function queueMarkerExport(seq, marker, outputPath, presetPath) {
  var startSeconds = Number(marker.startTicks) / REVIEW_EXPORT_TICKS_PER_SECOND;
  var endSeconds = Number(marker.endTicks) / REVIEW_EXPORT_TICKS_PER_SECOND;
  if (marker.mediaType !== 'video') endSeconds = startSeconds + 0.001;
  seq.setInPoint(startSeconds);
  seq.setOutPoint(endSeconds);
  if (app.encoder.encodeSequence) return app.encoder.encodeSequence(seq, outputPath, presetPath, 1, 1);
  if (app.encoder.encodeActiveSequence) return app.encoder.encodeActiveSequence(outputPath, presetPath, 1, 1);
  throw new Error('Premiere encoder API is not available.');
}

function projectNameOrSequence(seq) {
  try {
    if (app.project && app.project.path) {
      var parts = String(app.project.path).split('/');
      return parts[parts.length - 1] || seq.name;
    }
  } catch (_error) {}
  return seq.name;
}

function projectFolderOrEmpty() {
  try {
    if (app.project && app.project.path) {
      var parts = String(app.project.path).split('/');
      parts.pop();
      return parts.join('/');
    }
  } catch (_error) {}
  return '';
}

function activeSequenceOrThrow() {
  if (!app.project || !app.project.activeSequence) throw new Error('No active sequence. Open a sequence timeline before exporting.');
  return app.project.activeSequence;
}

function countSequenceMarkers(seq) {
  var count = 0;
  var marker = seq.markers.getFirstMarker();
  while (marker) { count += 1; marker = seq.markers.getNextMarker(marker); }
  return count;
}

function replacementForIndex(replacements, index) {
  for (var i = 0; i < replacements.length; i += 1) {
    if (Number(replacements[i].index) === index) return replacements[i];
  }
  return null;
}

function ticksFromTime(time) {
  if (!time) return 0;
  if (time.ticks !== undefined) return Number(time.ticks);
  if (time.seconds !== undefined) return Math.round(Number(time.seconds) * REVIEW_EXPORT_TICKS_PER_SECOND);
  return 0;
}

function formatTicks(ticks) {
  var totalSeconds = Number(ticks) / REVIEW_EXPORT_TICKS_PER_SECOND;
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = Math.floor(totalSeconds % 60);
  var millis = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  return pad2(hours) + ':' + pad2(minutes) + ':' + pad2(seconds) + '.' + pad3(millis);
}

function pad2(value) { return value < 10 ? '0' + value : String(value); }
function pad3(value) { if (value < 10) return '00' + value; if (value < 100) return '0' + value; return String(value); }
function stringifyResult(value) { return JSON.stringify(value); }
