const buildReportHtml = window.ReviewReport.buildReportHtml;
const normalizeMarkers = window.ReviewReport.normalizeMarkers;
const buildFfmpegArgs = window.ReviewFfmpeg.buildFfmpegArgs;
const buildPosterFileName = window.ReviewFfmpeg.buildPosterFileName;
const buildPosterFfmpegArgs = window.ReviewFfmpeg.buildPosterFfmpegArgs;
const sanitizeFolderName = window.ReviewExportPath.sanitizeFolderName;
const reviewDateStamp = window.ReviewExportPath.reviewDateStamp;
const loadAiSettings = window.ReviewAiPolish.loadAiSettings;
const saveAiSettings = window.ReviewAiPolish.saveAiSettings;
const polishMarkerComments = window.ReviewAiPolish.polishMarkerComments;
const buildMarkerCommentReplacements = window.ReviewAiPolish.buildMarkerCommentReplacements;
const buildMarkerPolishBackup = window.ReviewAiPolish.buildMarkerPolishBackup;
const cs = new CSInterface();
const RECENT_OUTPUTS_KEY = 'premiereReviewExport.recentOutputs';
const RECENT_MASTERS_KEY = 'premiereReviewExport.recentMasters';
const el = {
  sequenceName: document.getElementById('sequenceName'),
  markerCount: document.getElementById('markerCount'),
  outputPath: document.getElementById('outputPath'),
  masterVideoPath: document.getElementById('masterVideoPath'),
  chooseOutput: document.getElementById('chooseOutput'),
  chooseMaster: document.getElementById('chooseMaster'),
  recentOutput: document.getElementById('recentOutput'),
  recentMaster: document.getElementById('recentMaster'),
  recentOutputMenu: document.getElementById('recentOutputMenu'),
  recentMasterMenu: document.getElementById('recentMasterMenu'),
  aiEnabled: document.getElementById('aiEnabled'),
  aiBaseUrl: document.getElementById('aiBaseUrl'),
  aiModel: document.getElementById('aiModel'),
  aiApiKey: document.getElementById('aiApiKey'),
  aiPrompt: document.getElementById('aiPrompt'),
  refresh: document.getElementById('refresh'),
  polishMarkers: document.getElementById('polishMarkers'),
  export: document.getElementById('export'),
  polishPreview: document.getElementById('polishPreview'),
  polishPreviewList: document.getElementById('polishPreviewList'),
  applyPolishPreview: document.getElementById('applyPolishPreview'),
  cancelPolishPreview: document.getElementById('cancelPolishPreview'),
  log: document.getElementById('log')
};
const extensionRoot = decodeURI(cs.getSystemPath(SystemPath.EXTENSION)).replace(/\\/g, '/');
const videoPresetPath = extensionRoot + '/presets/review-720p.epr';
const framePresetPath = extensionRoot + '/presets/review-frame.epr';
let pendingPolishPreview = null;

el.chooseOutput.addEventListener('click', chooseOutputFolder);
el.chooseMaster.addEventListener('click', chooseMasterVideo);
el.recentOutput.addEventListener('click', function () { toggleRecentMenu(el.recentOutputMenu, RECENT_OUTPUTS_KEY, el.outputPath); });
el.recentMaster.addEventListener('click', function () { toggleRecentMenu(el.recentMasterMenu, RECENT_MASTERS_KEY, el.masterVideoPath); });
el.refresh.addEventListener('click', refreshSummary);
el.polishMarkers.addEventListener('click', polishPremiereMarkers);
el.export.addEventListener('click', exportReport);
el.applyPolishPreview.addEventListener('click', applyPolishPreview);
el.cancelPolishPreview.addEventListener('click', cancelPolishPreview);
document.addEventListener('click', closeRecentMenusOnOutsideClick);
applyAiSettingsToUi(loadAiSettings());
bindAiSettingsAutosave();
loadHostScript().then(refreshSummary).catch(function (error) { log(error.message, 'error'); });

async function loadHostScript() {
  const jsxPath = extensionRoot + '/jsx/host.jsx';
  const result = await evalScript('$.evalFile(' + quoteForExtendScript(jsxPath) + ')');
  if (result && result.ok === false) throw new Error(result.error || 'Failed to load host script.');
}

async function refreshSummary(options) {
  const diagnostics = options && options.diagnostics !== false;
  setBusy(true);
  try {
    const summary = await evalScript('getSequenceSummary()');
    if (!summary.ok) throw new Error(summary.error);
    el.sequenceName.textContent = summary.sequenceName;
    el.markerCount.textContent = summary.markerCount + (summary.markerCount === 1 ? ' marker' : ' markers');
    applyDefaultOutputFolder(summary.projectFolder);
    if (diagnostics) logProjectPathDiagnostics(summary);
  } catch (error) {
    el.sequenceName.textContent = 'No active sequence';
    el.markerCount.textContent = '0 markers';
    log(error.message, 'error');
  } finally {
    setBusy(false);
  }
}

function logProjectPathDiagnostics(summary) {
  if (normalizeCepFilePath(el.outputPath.value)) return;
  log('Project path from Premiere: ' + (summary.projectPath || '(empty)'), 'error');
  log('Project folder from Premiere: ' + (summary.projectFolder || '(empty)'), 'error');
  log('Production path from Premiere: ' + (summary.productionPath || '(empty)'), 'error');
}

function applyDefaultOutputFolder(projectFolder) {
  if (normalizeCepFilePath(el.outputPath.value)) return;
  const normalized = normalizeCepFilePath(projectFolder);
  if (normalized) {
    el.outputPath.value = normalized;
    log('Default output folder: ' + normalized, 'ok');
  }
}

function chooseMasterVideo() {
  if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialog) {
    const typed = window.prompt('Master video path', el.masterVideoPath.value || '');
    if (typed) setPathAndRemember(el.masterVideoPath, RECENT_MASTERS_KEY, typed);
    return;
  }
  const result = window.cep.fs.showOpenDialog(false, false, 'Choose exported master review video', '', ['mp4', 'mov', 'm4v']);
  if (result && result.err === 0 && result.data && result.data.length > 0) setPathAndRemember(el.masterVideoPath, RECENT_MASTERS_KEY, result.data[0]);
}

function chooseOutputFolder() {
  if (!window.cep || !window.cep.fs || !window.cep.fs.showOpenDialog) {
    const typed = window.prompt('Output parent folder path', el.outputPath.value || '');
    if (typed) setPathAndRemember(el.outputPath, RECENT_OUTPUTS_KEY, typed);
    return;
  }
  const result = window.cep.fs.showOpenDialog(false, true, 'Choose review report parent folder', '', []);
  if (result && result.err === 0 && result.data && result.data.length > 0) setPathAndRemember(el.outputPath, RECENT_OUTPUTS_KEY, result.data[0]);
}

async function exportReport() {
  clearLog();
  const outputParent = normalizeCepFilePath(el.outputPath.value);
  if (!outputParent) { log('Choose an output parent folder first.', 'error'); return; }
  setBusy(true);
  try {
    log('Reading current sequence markers...');
    const raw = await evalScript('collectMarkers()');
    if (!raw.ok) throw new Error(raw.error);
    const markers = normalizeMarkers(raw.markers);
    const reportMarkers = await maybePolishMarkerComments(markers);
    const mediaExportPlan = getMediaExportPlan();
    logMediaExportPlan(mediaExportPlan);
    rememberPath(RECENT_OUTPUTS_KEY, outputParent);
    const outputRoot = createReviewOutputFolder(outputParent, raw.projectName || raw.sequenceName);
    ensureDirectory(outputRoot + '/assets');
    const html = buildReportHtml({ sequenceName: raw.sequenceName, generatedAt: new Date().toISOString(), markers: reportMarkers });
    writeTextFile(outputRoot + '/review.html', html);
    log('Wrote ' + outputRoot + '/review.html.', 'ok');

    if (mediaExportPlan.mode === 'ffmpeg') {
      log('Fallback master video selected. Exporting media assets with FFmpeg instead of Adobe Media Encoder...', 'ok');
      await exportMediaWithFfmpeg(markers, outputRoot);
      return;
    }

    if (mediaExportPlan.mode === 'none') {
      log('HTML report will be generated without media assets.', 'error');
      return;
    }

    log('Queueing marker media in Adobe Media Encoder 2022 one marker at a time...');
    let queuedCount = 0;
    for (const marker of markers) {
      const exportResult = await evalScript('exportSingleMarkerMedia(' + quoteForExtendScript(outputRoot) + ',' + quoteForExtendScript(videoPresetPath) + ',' + quoteForExtendScript(framePresetPath) + ',' + quoteForExtendScript(JSON.stringify(marker)) + ')');
      if (!exportResult.ok) {
        log(exportResult.error || ('Could not queue ' + marker.assetFileName), 'error');
      } else {
        queuedCount += exportResult.item && exportResult.item.ok ? 1 : 0;
        log(exportResult.item.message, exportResult.item.ok ? 'ok' : 'error');
      }
      if (marker.mediaType === 'video') {
        const posterMarker = clonePosterMarker(marker);
        const posterResult = await evalScript('exportSingleMarkerMedia(' + quoteForExtendScript(outputRoot) + ',' + quoteForExtendScript(videoPresetPath) + ',' + quoteForExtendScript(framePresetPath) + ',' + quoteForExtendScript(JSON.stringify(posterMarker)) + ')');
        if (posterResult.ok && posterResult.item) log(posterResult.item.message, posterResult.item.ok ? 'ok' : 'error');
      }
      await delay(10);
    }

    if (queuedCount > 0) {
      const batchResult = await evalScript('startQueuedMedia()');
      if (!batchResult.ok) throw new Error(batchResult.error);
      log('Started AME batch for ' + queuedCount + ' queued media assets.', 'ok');
    }
  } catch (error) {
    log(error.message, 'error');
  } finally {
    setBusy(false);
    refreshSummary();
  }
}

async function polishPremiereMarkers() {
  clearLog();
  cancelPolishPreview();
  const outputParent = normalizeCepFilePath(el.outputPath.value);
  if (!outputParent) { log('Choose an output parent folder first so the original marker comments can be backed up.', 'error'); return; }

  const settings = Object.assign({}, getAiSettingsFromUi(), { enabled: true });
  saveAiSettings(settings);
  if (!settings.baseUrl || !settings.model || !settings.apiKey) {
    log('Fill in AI Base URL, Model, and API Key before polishing Premiere markers.', 'error');
    return;
  }

  setBusy(true);
  try {
    log('Reading current sequence markers...');
    const raw = await evalScript('collectMarkers()');
    if (!raw.ok) throw new Error(raw.error);
    const markers = normalizeMarkers(raw.markers);
    const commentCount = markers.filter(function (marker) { return String(marker.comment || '').trim() !== ''; }).length;
    if (commentCount === 0) {
      log('No non-empty marker comments to polish.', 'ok');
      return;
    }

    log('Polishing ' + commentCount + ' Premiere marker comments with AI...');
    let failed = false;
    const polished = await polishMarkerComments(markers, settings, undefined, function (error) {
      failed = true;
      log('AI polish failed: ' + error.message + '. Premiere markers were not changed.', 'error');
    });
    if (failed) return;

    const replacements = buildMarkerCommentReplacements(markers, polished);
    if (replacements.length === 0) {
      log('AI returned no changed comments. Premiere markers were not changed.', 'ok');
      return;
    }

    pendingPolishPreview = {
      outputParent: outputParent,
      sequenceName: raw.sequenceName,
      projectName: raw.projectName,
      replacements: replacements
    };
    renderPolishPreview(pendingPolishPreview);
    log('Review the AI polish preview, then apply or cancel.', 'ok');
  } catch (error) {
    log(error.message, 'error');
  } finally {
    setBusy(false);
    refreshSummary();
  }
}

async function applyPolishPreview() {
  if (!pendingPolishPreview || !pendingPolishPreview.replacements || pendingPolishPreview.replacements.length === 0) {
    log('No AI polish preview to apply.', 'error');
    return;
  }

  setBusy(true);
  try {
    ensureDirectory(pendingPolishPreview.outputParent);
    const backupPath = pendingPolishPreview.outputParent + '/marker-polish-backup-' + backupTimestamp(new Date()) + '.json';
    const backup = buildMarkerPolishBackup({
      sequenceName: pendingPolishPreview.sequenceName,
      projectName: pendingPolishPreview.projectName,
      generatedAt: new Date().toISOString(),
      replacements: pendingPolishPreview.replacements
    });
    writeTextFile(backupPath, JSON.stringify(backup, null, 2));
    log('Backup written: ' + backupPath, 'ok');

    const result = await evalScript('replaceMarkerComments(' + quoteForExtendScript(JSON.stringify(pendingPolishPreview.replacements)) + ')');
    if (!result.ok) throw new Error(result.error);
    for (const message of result.messages || []) log(message, message.indexOf('Skipped') === 0 ? 'error' : 'ok');
    log('Updated ' + result.updatedCount + ' Premiere marker comments. Skipped ' + result.skippedCount + '.', result.skippedCount ? 'error' : 'ok');

    el.aiEnabled.checked = false;
    saveAiSettings(getAiSettingsFromUi());
    log('Export-time AI Polish was turned off to avoid polishing the same comments again.', 'ok');
    cancelPolishPreview();
  } catch (error) {
    log(error.message, 'error');
  } finally {
    setBusy(false);
    refreshSummary();
  }
}

function cancelPolishPreview() {
  pendingPolishPreview = null;
  el.polishPreview.hidden = true;
  el.polishPreviewList.innerHTML = '';
}

function renderPolishPreview(preview) {
  el.polishPreviewList.innerHTML = '';
  for (const replacement of preview.replacements) {
    const item = document.createElement('article');
    item.className = 'preview-item';

    const meta = document.createElement('div');
    meta.className = 'preview-meta';
    meta.textContent = 'Marker ' + replacement.index;
    item.appendChild(meta);

    const copy = document.createElement('div');
    copy.className = 'preview-copy';
    copy.appendChild(previewTextBlock('Original', replacement.originalComment));
    copy.appendChild(previewTextBlock('Polished', replacement.polishedComment));
    item.appendChild(copy);
    el.polishPreviewList.appendChild(item);
  }
  el.polishPreview.hidden = false;
}

function previewTextBlock(label, text) {
  const block = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = label;
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  block.appendChild(heading);
  block.appendChild(paragraph);
  return block;
}

async function maybePolishMarkerComments(markers) {
  const settings = getAiSettingsFromUi();
  saveAiSettings(settings);
  if (!settings.enabled) return markers;

  if (!settings.baseUrl || !settings.model || !settings.apiKey) {
    log('AI polish is enabled, but Base URL, Model, or API Key is missing. Using original comments.', 'error');
    return markers;
  }

  const commentCount = markers.filter(function (marker) { return String(marker.comment || '').trim() !== ''; }).length;
  if (commentCount === 0) {
    log('AI polish skipped because there are no marker comments.', 'ok');
    return markers;
  }

  let failed = false;
  log('Polishing ' + commentCount + ' marker comments with AI...');
  const polished = await polishMarkerComments(markers, settings, undefined, function (error) {
    failed = true;
    log('AI polish failed: ' + error.message + '. Using original comments.', 'error');
  });
  if (!failed) log('AI polished marker comments for this report.', 'ok');
  return polished;
}

function getAiSettingsFromUi() {
  return {
    enabled: !!el.aiEnabled.checked,
    baseUrl: el.aiBaseUrl.value,
    model: el.aiModel.value,
    apiKey: el.aiApiKey.value,
    prompt: el.aiPrompt.value
  };
}

function applyAiSettingsToUi(settings) {
  el.aiEnabled.checked = !!settings.enabled;
  el.aiBaseUrl.value = settings.baseUrl || '';
  el.aiModel.value = settings.model || '';
  el.aiApiKey.value = settings.apiKey || '';
  el.aiPrompt.value = settings.prompt || '';
}

function bindAiSettingsAutosave() {
  for (const input of [el.aiEnabled, el.aiBaseUrl, el.aiModel, el.aiApiKey, el.aiPrompt]) {
    input.addEventListener('change', function () { saveAiSettings(getAiSettingsFromUi()); });
    input.addEventListener('input', function () { saveAiSettings(getAiSettingsFromUi()); });
  }
}

function hasFallbackMasterVideo() {
  return !!normalizeCepFilePath(el.masterVideoPath.value);
}

function getMediaExportPlan() {
  const fallbackMasterVideo = normalizeCepFilePath(el.masterVideoPath.value);
  const ffmpegPath = findFfmpegPath();
  const hasAme = hasAme2022();
  if (fallbackMasterVideo && ffmpegPath) return { mode: 'ffmpeg', fallbackMasterVideo: fallbackMasterVideo, ffmpegPath: ffmpegPath, hasAme: hasAme };
  if (fallbackMasterVideo && !ffmpegPath) return { mode: 'none', fallbackMasterVideo: fallbackMasterVideo, ffmpegPath: '', hasAme: hasAme, error: 'Fallback master video is selected, but FFmpeg was not found.' };
  if (hasAme) return { mode: 'ame', fallbackMasterVideo: '', ffmpegPath: ffmpegPath, hasAme: true };
  return { mode: 'none', fallbackMasterVideo: '', ffmpegPath: ffmpegPath, hasAme: false, error: 'No media exporter is available. Install Adobe Media Encoder 2022, or install FFmpeg and choose a fallback master video.' };
}

function logMediaExportPlan(plan) {
  if (plan.mode === 'ffmpeg') {
    log('Media export check: FFmpeg fallback is available.', 'ok');
    return;
  }
  if (plan.mode === 'ame') {
    log('Media export check: Adobe Media Encoder 2022 is available.', 'ok');
    return;
  }
  log('Media export check: ' + plan.error, 'error');
}

async function exportMediaWithFfmpeg(markers, outputRoot) {
  const ffmpegPath = findFfmpegPath();
  if (!ffmpegPath) {
    log('FFmpeg was not found. Install it or set the fallback master video after installing FFmpeg.', 'error');
    return;
  }

  const masterVideoPath = normalizeCepFilePath(el.masterVideoPath.value);
  if (!masterVideoPath) {
    log('Choose a fallback master video first. HTML was generated, but media assets were not exported.', 'error');
    return;
  }

  if (!fileExists(masterVideoPath)) {
    log('Fallback master video does not exist: ' + masterVideoPath, 'error');
    return;
  }
  rememberPath(RECENT_MASTERS_KEY, masterVideoPath);

  for (const marker of markers) {
    const outputPath = outputRoot + '/assets/' + marker.assetFileName;
    if (marker.mediaType === 'video') {
      const posterPath = outputRoot + '/assets/' + buildPosterFileName(marker.assetFileName);
      const posterArgs = buildPosterFfmpegArgs({ ffmpegPath: ffmpegPath, masterVideoPath: masterVideoPath, outputPath: posterPath, marker: marker });
      const posterResult = await runProcess(posterArgs);
      if (posterResult.ok) log(buildPosterFileName(marker.assetFileName) + ' exported with FFmpeg.', 'ok');
      else log(buildPosterFileName(marker.assetFileName) + ' failed: ' + posterResult.error, 'error');
    }
    const args = buildFfmpegArgs({ ffmpegPath: ffmpegPath, masterVideoPath: masterVideoPath, outputPath: outputPath, marker: marker });
    log('FFmpeg exporting ' + marker.assetFileName + '...');
    const result = await runProcess(args);
    if (result.ok) log(marker.assetFileName + ' exported with FFmpeg.', 'ok');
    else log(marker.assetFileName + ' failed: ' + result.error, 'error');
  }
}

function createReviewOutputFolder(parentPath, projectName) {
  ensureDirectory(parentPath);
  const base = sanitizeFolderName(projectName) + '_Review_' + reviewDateStamp(new Date());
  let version = 1;
  let folderPath = parentPath + '/' + base + '_V' + version;
  while (folderExists(folderPath)) {
    version += 1;
    folderPath = parentPath + '/' + base + '_V' + version;
  }
  ensureDirectory(folderPath);
  log('Export folder: ' + folderPath, 'ok');
  return folderPath;
}

function clonePosterMarker(marker) {
  return {
    index: marker.index,
    name: marker.name,
    comment: marker.comment,
    startTicks: marker.startTicks,
    endTicks: marker.startTicks,
    durationTicks: '0',
    startTimecode: marker.startTimecode,
    durationText: '00:00:00.000',
    mediaType: 'image',
    assetFileName: buildPosterFileName(marker.assetFileName)
  };
}

function findFfmpegPath() {
  const candidates = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];
  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }
  return '';
}

function fileExists(path) {
  return !!(window.cep && window.cep.fs && window.cep.fs.stat && window.cep.fs.stat(path).err === 0);
}

function folderExists(path) {
  return fileExists(path);
}

function runProcess(args) {
  return new Promise(function (resolve) {
    if (typeof require !== 'function') {
      resolve({ ok: false, error: 'Node require is not available in this CEP panel.' });
      return;
    }
    const childProcess = require('child_process');
    const command = args[0];
    const childArgs = args.slice(1);
    const child = childProcess.spawn(command, childArgs);
    let stderr = '';
    child.stderr.on('data', function (chunk) { stderr += String(chunk); });
    child.on('error', function (error) { resolve({ ok: false, error: error.message }); });
    child.on('close', function (code) {
      resolve({ ok: code === 0, error: code === 0 ? '' : (stderr || ('exit code ' + code)) });
    });
  });
}

function evalScript(script) {
  return new Promise(function (resolve) {
    cs.evalScript(script, function (result) {
      if (result === undefined || result === 'undefined' || result === null || result === '') {
        resolve({ ok: true });
        return;
      }
      try { resolve(JSON.parse(result)); }
      catch (_error) { resolve({ ok: false, error: String(result || 'No response from Premiere.') }); }
    });
  });
}

function normalizeCepFilePath(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  const withoutFileScheme = trimmed.indexOf('file://') === 0
    ? decodeURIComponent(trimmed.replace(/^file:\/\//, ''))
    : decodeURIComponent(trimmed);
  if (withoutFileScheme === '/') return withoutFileScheme;
  return withoutFileScheme.replace(/\/+$/, '');
}

function hasAme2022() {
  if (window.cep && window.cep.fs && window.cep.fs.stat) {
    return window.cep.fs.stat('/Applications/Adobe Media Encoder 2022/Adobe Media Encoder 2022.app').err === 0;
  }
  return false;
}

function toggleRecentMenu(menu, storageKey, input) {
  const items = recentPaths(storageKey);
  renderRecentMenu(menu, items, function (value) {
    input.value = value;
    menu.hidden = true;
  });
  menu.hidden = !menu.hidden;
}

function renderRecentMenu(menu, items, onSelect) {
  menu.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('button');
    empty.type = 'button';
    empty.disabled = true;
    empty.textContent = 'No recent paths';
    menu.appendChild(empty);
    return;
  }
  for (const item of items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item;
    button.title = item;
    button.addEventListener('click', function () { onSelect(item); });
    menu.appendChild(button);
  }
}

function closeRecentMenusOnOutsideClick(event) {
  if (event.target === el.recentOutput || event.target === el.recentMaster) return;
  if (el.recentOutputMenu.contains(event.target) || el.recentMasterMenu.contains(event.target)) return;
  el.recentOutputMenu.hidden = true;
  el.recentMasterMenu.hidden = true;
}

function setPathAndRemember(input, storageKey, value) {
  const normalized = normalizeCepFilePath(value);
  input.value = normalized;
  rememberPath(storageKey, normalized);
}

function recentPaths(storageKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (_error) {
    return [];
  }
}

function rememberPath(storageKey, value) {
  const normalized = normalizeCepFilePath(value);
  if (!normalized) return;
  const next = [normalized].concat(recentPaths(storageKey).filter(function (item) { return item !== normalized; })).slice(0, 5);
  window.localStorage.setItem(storageKey, JSON.stringify(next));
}

function delay(ms) {
  return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
}

function backupTimestamp(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0')
  ].join('');
}

function ensureDirectory(folderPath) {
  if (window.cep && window.cep.fs && window.cep.fs.stat && window.cep.fs.makedir) {
    const existing = window.cep.fs.stat(folderPath);
    if (existing.err === 0) return;
    const result = window.cep.fs.makedir(folderPath);
    if (result.err !== 0) throw new Error('Could not create folder: ' + folderPath);
    return;
  }
  throw new Error('CEP filesystem bridge is not available.');
}

function writeTextFile(filePath, content) {
  if (window.cep && window.cep.fs && window.cep.fs.writeFile) {
    const result = window.cep.fs.writeFile(filePath, content);
    if (result.err !== 0) throw new Error('Could not write file: ' + filePath);
    return;
  }
  throw new Error('CEP filesystem bridge is not available.');
}

function quoteForExtendScript(value) { return '"' + String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function setBusy(isBusy) { el.refresh.disabled = isBusy; el.polishMarkers.disabled = isBusy; el.export.disabled = isBusy; el.applyPolishPreview.disabled = isBusy; el.cancelPolishPreview.disabled = isBusy; el.chooseOutput.disabled = isBusy; el.chooseMaster.disabled = isBusy; el.recentOutput.disabled = isBusy; el.recentMaster.disabled = isBusy; el.aiEnabled.disabled = isBusy; el.aiBaseUrl.disabled = isBusy; el.aiModel.disabled = isBusy; el.aiApiKey.disabled = isBusy; el.aiPrompt.disabled = isBusy; }
function clearLog() { el.log.innerHTML = ''; }
function log(message, type) { const item = document.createElement('li'); item.textContent = message; if (type) item.className = type; el.log.appendChild(item); }
