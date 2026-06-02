(function () {
function mediaFileNameForMarker(index, mediaType) {
  var padded = String(index).padStart(3, '0');
  return mediaType === 'video' ? 'marker-' + padded + '.mp4' : 'marker-' + padded + '.jpg';
}

function normalizeMarkers(markers) {
  return [...markers]
    .sort((a, b) => Number(a.startTicks || 0) - Number(b.startTicks || 0))
    .map((marker, offset) => {
      var index = offset + 1;
      var hasDuration = Number(marker.durationTicks || 0) > 0;
      var mediaType = hasDuration ? 'video' : 'image';
      return {
        index,
        name: marker.name || '',
        comment: marker.comment || marker.comments || '',
        startTicks: String(marker.startTicks || '0'),
        endTicks: String(marker.endTicks || marker.startTicks || '0'),
        durationTicks: String(marker.durationTicks || '0'),
        startTimecode: marker.startTimecode || '',
        durationText: marker.durationText || '',
        mediaType,
        assetFileName: mediaFileNameForMarker(index, mediaType)
      };
    });
}

function buildReportHtml({ sequenceName, generatedAt, markers }) {
  var showMarkerColumn = hasAnyMarkerName(markers);
  var rows = markers.map((marker) => renderMarkerRow(marker, showMarkerColumn)).join('\n');
  var emptyRow = markers.length === 0
    ? '<tr><td colspan="' + (showMarkerColumn ? '6' : '5') + '" class="empty">No sequence markers found.</td></tr>'
    : '';
  var markerHead = showMarkerColumn ? '<th class="col-marker">Marker</th>' : '';
  return '<!doctype html>\n' +
    '<html lang="zh-CN">\n<head>\n' +
    '  <meta charset="utf-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>Review Report - ' + escapeHtml(sequenceName) + '</title>\n' +
    '  <style>' + paperCss(showMarkerColumn) + '</style>\n' +
    '</head>\n<body>\n' +
    '  <main class="page">\n' +
    '    <header class="report-header">\n' +
    '      <div class="title-row"><h1>' + escapeHtml(sequenceName) + '</h1><div class="stamp">Feedback</div></div>\n' +
    '      <div class="meta-strip">Generated: ' + escapeHtml(generatedAt) + ' · Markers: ' + markers.length + '</div>\n' +
    '    </header>\n' +
    '    <section class="table-shell">\n' +
    '      <table><thead><tr><th class="col-index">#</th><th class="col-time">Start</th><th class="col-duration">Length</th><th class="col-media">Preview</th>' + markerHead + '<th>Comment</th></tr></thead><tbody>\n' +
    rows + emptyRow + '\n' +
    '      </tbody></table>\n' +
    '    </section>\n' +
    '  </main>\n' +
    '  <script>document.addEventListener(\"click\", function (event) { var button = event.target.closest(\".play-overlay\"); if (!button) return; var frame = button.closest(\".video-frame\"); var video = frame && frame.querySelector(\"video\"); if (video) { button.style.display = \"none\"; video.controls = true; video.play(); } });</script>\n' +
    '</body>\n</html>';
}

function hasAnyMarkerName(markers) {
  return markers.some((marker) => isRealMarkerName(marker.name));
}

function isRealMarkerName(name) {
  var value = String(name || '').trim();
  return value !== '' && value !== '(Untitled marker)';
}

function posterFileName(assetFileName) {
  return String(assetFileName).replace(/\.mp4$/i, '-poster.jpg');
}

function renderMarkerRow(marker, showMarkerColumn) {
  var mediaPath = 'assets/' + marker.assetFileName;
  var media = marker.mediaType === 'video'
    ? '<div class="video-frame"><video src="' + escapeAttr(mediaPath) + '" poster="assets/' + escapeAttr(posterFileName(marker.assetFileName)) + '" preload="metadata"></video><button class="play-overlay" type="button" aria-label="Play preview">▶</button></div>'
    : '<img src="' + escapeAttr(mediaPath) + '" alt="Marker ' + marker.index + ' still">';
  var markerCell = showMarkerColumn ? '<td><div class="marker-name">' + escapeHtml(isRealMarkerName(marker.name) ? marker.name : '') + '</div></td>' : '';
  return '<tr><td>' + marker.index + '</td><td>' + escapeHtml(marker.startTimecode) + '</td><td>' + escapeHtml(marker.durationText) + '</td><td>' + media + '</td>' + markerCell + '<td><div class="comment">' + escapeHtml(marker.comment) + '</div></td></tr>';
}

function paperCss(showMarkerColumn) {
  return '\n' +
    '    * { box-sizing: border-box; }\n' +
    '    :root { --page-bg: #f3efe5; --table-bg: #fffaf0; --row-bg: #fffaf0; --row-hover: #f7eddb; --text: #252018; --comment: #2b241b; --muted: #776b5d; --accent: #9a583b; --line: #e1d4bf; --head-bg: #eadbc3; --head-text: #675440; --meta-bg: rgba(255,250,240,.82); --shadow: 0 22px 60px rgba(82,55,24,.12); }\n' +
    '    html, body { margin: 0; background: var(--page-bg); color: var(--text); }\n' +
    '    body { font-family: ui-serif, "Iowan Old Style", "Songti SC", "Noto Serif CJK SC", Georgia, serif; }\n' +
    '    .page { width: min(1480px, calc(100vw - 44px)); margin: 0 auto; padding: 34px 0 56px; }\n' +
    '    .report-header { margin-bottom: 22px; } .eyebrow { color: var(--accent); font: 700 12px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; letter-spacing: .12em; text-transform: uppercase; }\n' +
    '    .title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 24px; margin-top: 8px; }\n' +
    '    h1 { margin: 0; font-size: clamp(28px, 4vw, 52px); line-height: .98; letter-spacing: 0; font-weight: 700; }\n' +
    '    .subtitle { max-width: 760px; margin: 14px 0 0; color: var(--muted); font: 16px/1.65 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }\n' +
    '    .stamp { flex: 0 0 auto; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 7px 12px; font: 700 12px/1 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; letter-spacing: .08em; text-transform: uppercase; }\n' +
    '    .meta-strip { display: inline-flex; margin-top: 18px; padding: 8px 12px; border: 1px solid var(--line); color: var(--muted); background: var(--meta-bg); font: 13px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }\n' +
    '    .table-shell { overflow: auto; border: 1px solid var(--line); border-radius: 4px; background: var(--table-bg); box-shadow: var(--shadow); }\n' +
    '    table { width: 100%; border-collapse: collapse; table-layout: fixed; } th, td { border-bottom: 1px solid var(--line); padding: 14px 15px; vertical-align: top; }\n' +
    '    th { position: sticky; top: 0; z-index: 2; color: var(--head-text); background: var(--head-bg); font: 700 11px/1.2 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; letter-spacing: .1em; text-transform: uppercase; text-align: left; }\n' +
    '    tbody tr { background: var(--row-bg); box-shadow: inset 4px 0 0 transparent; } tbody tr:hover { background: var(--row-hover); box-shadow: inset 4px 0 0 var(--accent); }\n' +
    '    .col-index { width: 46px; } .col-time { width: 106px; } .col-duration { width: 86px; } .col-media { width: 236px; }' + (showMarkerColumn ? ' .col-marker { width: 84px; }' : '') + '\n' +
    '    td:nth-child(1), td:nth-child(2), td:nth-child(3)' + (showMarkerColumn ? ', td:nth-child(5)' : '') + ' { color: var(--muted); font: 12px/1.35 ui-sans-serif, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }\n' +
    (showMarkerColumn ? '    td:nth-child(5) { max-width: 84px; overflow: hidden; text-overflow: ellipsis; } .marker-name { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 650; }\n' : '') +
    '    td:nth-child(1) { font-weight: 800; color: var(--accent); } .comment { white-space: pre-wrap; word-break: break-word; color: var(--comment); font-size: 15.5px; line-height: 1.72; }\n' +
    '    video, img { display: block; width: 100%; max-height: 174px; object-fit: contain; background: #111; border-radius: 4px; } .video-frame { position: relative; } .play-overlay { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: 48px; height: 48px; border-radius: 999px; border: 1px solid rgba(255,255,255,.72); background: rgba(0,0,0,.45); color: white; opacity: .5; cursor: pointer; font-size: 21px; line-height: 1; } .video-frame:hover .play-overlay { opacity: .72; } .empty { text-align: center; color: var(--muted); padding: 28px; }\n' +
    '    tbody tr:last-child td { border-bottom: 0; } @media (max-width: 860px) { .page { width: min(100vw - 24px, 1480px); padding-top: 22px; } .title-row { display: block; } .stamp { display: inline-flex; margin-top: 12px; } .col-media { width: 190px; }' + (showMarkerColumn ? ' .col-marker { width: 70px; }' : '') + ' }\n';
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}


window.ReviewReport = {
  mediaFileNameForMarker: mediaFileNameForMarker,
  normalizeMarkers: normalizeMarkers,
  buildReportHtml: buildReportHtml
};

}());
