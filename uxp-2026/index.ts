import { requestJsonWithFetch } from "./src/ai";
import { exportMarkerMedia } from "./src/media";
import { applyMarkerReplacements, getSequenceContext, ppro } from "./src/premiere";
import {
  chooseOutputFolder,
  createOutputContext,
  getVideoPresetPath,
  loadApiKey,
  restoreOutputFolder,
  saveApiKey,
  storedOutputPath,
  writeText
} from "./src/storage";
import type { AiSettings, MarkerReplacement, ReviewMarker } from "./src/types";
import {
  AI_SETTINGS_KEY,
  buildMarkerCommentReplacements,
  buildMarkerPolishBackup,
  defaultAiSettings,
  loadAiSettings,
  normalizeAiSettings,
  polishMarkerComments
} from "./src/core/aiPolish.js";
import { buildReportHtml, normalizeMarkers } from "./src/core/report.js";

const uxp = require("uxp") as typeof import("uxp");

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing panel element: ${id}`);
  return value as T;
}

interface SpectrumField extends HTMLElement {
  value: string;
  disabled: boolean;
  type?: string;
}

interface SpectrumCheckbox extends HTMLElement {
  checked: boolean;
  disabled: boolean;
}

interface SpectrumButton extends HTMLElement {
  disabled: boolean;
}

const el = {
  sequenceName: element<HTMLDivElement>("sequenceName"),
  markerCount: element<HTMLDivElement>("markerCount"),
  outputPath: element<SpectrumField>("outputPath"),
  chooseOutput: element<SpectrumButton>("chooseOutput"),
  aiEnabled: element<SpectrumCheckbox>("aiEnabled"),
  aiBaseUrl: element<SpectrumField>("aiBaseUrl"),
  aiModel: element<SpectrumField>("aiModel"),
  aiApiKey: element<SpectrumField>("aiApiKey"),
  aiPrompt: element<SpectrumField>("aiPrompt"),
  refresh: element<SpectrumButton>("refresh"),
  polishMarkers: element<SpectrumButton>("polishMarkers"),
  export: element<SpectrumButton>("export"),
  polishPreview: element<HTMLElement>("polishPreview"),
  polishPreviewList: element<HTMLDivElement>("polishPreviewList"),
  applyPolishPreview: element<SpectrumButton>("applyPolishPreview"),
  cancelPolishPreview: element<SpectrumButton>("cancelPolishPreview"),
  log: element<HTMLOListElement>("log")
};

let outputFolder: any | null = null;
let apiKeyValue = "";
const progressItems = new Map<string, HTMLLIElement>();
let pendingPolishPreview: null | {
  sequenceName: string;
  projectName: string;
  replacements: MarkerReplacement[];
} = null;

function log(message: string, type?: string): void {
  const progressMatch = message.match(/^(marker-\d+\.mp4):\s*\d+%$/);
  const key = progressMatch?.[1];
  const item = key && progressItems.get(key) || document.createElement("li");
  item.textContent = message;
  item.className = type || "";
  if (!item.parentNode) el.log.appendChild(item);
  if (key) progressItems.set(key, item);
  el.log.scrollTop = el.log.scrollHeight;
}

function clearLog(): void {
  el.log.innerHTML = "";
  progressItems.clear();
}

function setBusy(busy: boolean): void {
  for (const control of [el.chooseOutput, el.refresh, el.polishMarkers, el.export, el.applyPolishPreview, el.cancelPolishPreview]) {
    control.disabled = busy;
  }
}

function getAiSettingsFromUi(forceEnabled = false): AiSettings {
  return normalizeAiSettings({
    enabled: forceEnabled || el.aiEnabled.checked,
    baseUrl: el.aiBaseUrl.value,
    model: el.aiModel.value,
    apiKey: apiKeyValue,
    prompt: el.aiPrompt.value
  });
}

function saveNonSecretAiSettings(): void {
  const settings = getAiSettingsFromUi();
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify({ ...settings, apiKey: "" }));
}

async function initialize(): Promise<void> {
  const settings = loadAiSettings(localStorage) || defaultAiSettings();
  el.aiEnabled.checked = !!settings.enabled;
  el.aiBaseUrl.value = settings.baseUrl || "";
  el.aiModel.value = settings.model || "";
  el.aiPrompt.value = settings.prompt || "";
  apiKeyValue = await loadApiKey();
  el.aiApiKey.type = "text";
  el.aiApiKey.value = apiKeyValue;
  el.aiApiKey.type = "password";
  outputFolder = await restoreOutputFolder();
  el.outputPath.value = outputFolder?.nativePath || storedOutputPath();
  await refreshSummary();
}

async function refreshSummary(): Promise<void> {
  try {
    const context = await getSequenceContext();
    el.sequenceName.textContent = context.sequenceName;
    el.markerCount.textContent = `${context.markers.length} ${context.markers.length === 1 ? "marker" : "markers"}`;
  } catch (error: any) {
    el.sequenceName.textContent = "No active sequence";
    el.markerCount.textContent = "0 markers";
    log(error.message, "error");
  }
}

async function chooseOutput(): Promise<void> {
  const chosen = await chooseOutputFolder();
  if (!chosen) return;
  outputFolder = chosen;
  el.outputPath.value = chosen.nativePath || chosen.name;
  log(`Output folder: ${el.outputPath.value}`, "ok");
}

async function maybePolishForReport(markers: ReviewMarker[]): Promise<ReviewMarker[]> {
  const settings = getAiSettingsFromUi();
  saveNonSecretAiSettings();
  await saveApiKey(settings.apiKey);
  if (!settings.enabled) return markers;
  if (!settings.baseUrl || !settings.model || !settings.apiKey) {
    log("AI polish is enabled, but Base URL, Model, or API Key is missing. Using original comments.", "error");
    return markers;
  }
  let failed = false;
  const polished = await polishMarkerComments(markers, settings, requestJsonWithFetch, (error: Error) => {
    failed = true;
    log(`AI polish failed: ${error.message}. Using original comments.`, "error");
  });
  if (!failed) log("AI polished marker comments for this report.", "ok");
  return polished as ReviewMarker[];
}

async function exportReport(): Promise<void> {
  clearLog();
  if (!outputFolder) {
    log("Choose an output folder first.", "error");
    return;
  }
  setBusy(true);
  let output: any | null = null;
  let reportMarkers: ReviewMarker[] = [];
  try {
    const context = await getSequenceContext();
    const markers = normalizeMarkers(context.markers) as ReviewMarker[];
    const videos = markers.filter((marker) => marker.mediaType === "video");
    if (videos.length && !ppro.EncoderManager.getManager().isAMEInstalled) {
      throw new Error("Adobe Media Encoder 26.3 or later is required for duration markers.");
    }
    reportMarkers = await maybePolishForReport(markers);
    output = await createOutputContext(outputFolder, context.projectName || context.sequenceName);
    log(`Export folder: ${output.rootPath}`, "ok");

    for (const marker of reportMarkers) marker.mediaAvailable = false;
    await writeText(output.root, "review.html", buildReportHtml({
      sequenceName: context.sequenceName,
      generatedAt: new Date().toISOString(),
      markers: reportMarkers
    }));

    const presetPath = videos.length ? await getVideoPresetPath() : "";
    await exportMarkerMedia({
      project: context.project,
      sequence: context.sequence,
      markers,
      assets: output.assets,
      presetPath,
      onProgress: log
    });

    const mediaByIndex = new Map(markers.map((marker) => [marker.index, marker]));
    reportMarkers = reportMarkers.map((marker) => ({ ...marker, ...mediaByIndex.get(marker.index), comment: marker.comment }));
    await writeText(output.root, "review.html", buildReportHtml({
      sequenceName: context.sequenceName,
      generatedAt: new Date().toISOString(),
      markers: reportMarkers
    }));
    log(`Report ready: ${output.rootPath}`, "ok");
  } catch (error: any) {
    log(error.message, "error");
    if (output && reportMarkers.length) {
      try {
        await writeText(output.root, "review.html", buildReportHtml({
          sequenceName: el.sequenceName.textContent || "Review",
          generatedAt: new Date().toISOString(),
          markers: reportMarkers
        }));
      } catch (_writeError) { /* preserve the primary error */ }
    }
  } finally {
    setBusy(false);
    await refreshSummary();
  }
}

async function polishPremiereMarkers(): Promise<void> {
  clearLog();
  cancelPolishPreview();
  if (!outputFolder) {
    log("Choose an output folder first so original comments can be backed up.", "error");
    return;
  }
  const settings = getAiSettingsFromUi(true);
  if (!settings.baseUrl || !settings.model || !settings.apiKey) {
    log("Fill in AI Base URL, Model, and API Key first.", "error");
    return;
  }
  setBusy(true);
  try {
    saveNonSecretAiSettings();
    await saveApiKey(settings.apiKey);
    const context = await getSequenceContext();
    const markers = normalizeMarkers(context.markers) as ReviewMarker[];
    if (!markers.some((marker) => marker.comment.trim())) {
      log("No non-empty marker comments to polish.", "ok");
      return;
    }
    let failed = false;
    const polished = await polishMarkerComments(markers, settings, requestJsonWithFetch, (error: Error) => {
      failed = true;
      log(`AI polish failed: ${error.message}. Premiere markers were not changed.`, "error");
    });
    if (failed) return;
    const replacements = buildMarkerCommentReplacements(markers, polished) as MarkerReplacement[];
    if (!replacements.length) {
      log("AI returned no changed comments.", "ok");
      return;
    }
    pendingPolishPreview = { sequenceName: context.sequenceName, projectName: context.projectName, replacements };
    renderPolishPreview();
    log("Review the AI polish preview, then apply or cancel.", "ok");
  } catch (error: any) {
    log(error.message, "error");
  } finally {
    setBusy(false);
  }
}

function renderPolishPreview(): void {
  el.polishPreviewList.innerHTML = "";
  for (const replacement of pendingPolishPreview?.replacements || []) {
    const item = document.createElement("article");
    item.className = "preview-item";
    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.textContent = `Marker ${replacement.index}`;
    const original = document.createElement("p");
    original.textContent = `Original: ${replacement.originalComment}`;
    const label = document.createElement("strong");
    label.textContent = "Polished";
    const textarea = document.createElement("sp-textarea") as unknown as SpectrumField;
    textarea.value = replacement.polishedComment;
    textarea.dataset.polishIndex = String(replacement.index);
    item.append(meta, original, label, textarea);
    el.polishPreviewList.appendChild(item);
  }
  el.polishPreview.classList.remove("is-hidden");
}

function syncPreviewEdits(): MarkerReplacement[] {
  if (!pendingPolishPreview) return [];
  const byIndex = new Map(pendingPolishPreview.replacements.map((item) => [item.index, item]));
  for (const field of el.polishPreviewList.querySelectorAll<SpectrumField>("sp-textarea[data-polish-index]")) {
    const item = byIndex.get(Number(field.dataset.polishIndex));
    if (item) item.polishedComment = field.value.replace(/\r\n/g, "\n");
  }
  return pendingPolishPreview.replacements.filter((item) => item.polishedComment !== item.originalComment);
}

async function applyPolishPreview(): Promise<void> {
  if (!pendingPolishPreview || !outputFolder) return;
  setBusy(true);
  try {
    const replacements = syncPreviewEdits();
    if (!replacements.length) {
      cancelPolishPreview();
      return;
    }
    const backup = buildMarkerPolishBackup({
      sequenceName: pendingPolishPreview.sequenceName,
      projectName: pendingPolishPreview.projectName,
      generatedAt: new Date().toISOString(),
      replacements
    });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `marker-polish-backup-${stamp}.json`;
    await writeText(outputFolder, backupName, JSON.stringify(backup, null, 2));
    log(`Backup written: ${backupName}`, "ok");
    const result = await applyMarkerReplacements(replacements);
    for (const message of result.messages) log(message, message.startsWith("Skipped") ? "error" : "ok");
    el.aiEnabled.checked = false;
    saveNonSecretAiSettings();
    cancelPolishPreview();
  } catch (error: any) {
    log(error.message, "error");
  } finally {
    setBusy(false);
    await refreshSummary();
  }
}

function cancelPolishPreview(): void {
  pendingPolishPreview = null;
  el.polishPreview.classList.add("is-hidden");
  el.polishPreviewList.innerHTML = "";
}

el.chooseOutput.addEventListener("click", () => void chooseOutput());
el.refresh.addEventListener("click", () => void refreshSummary());
el.export.addEventListener("click", () => void exportReport());
el.polishMarkers.addEventListener("click", () => void polishPremiereMarkers());
el.applyPolishPreview.addEventListener("click", () => void applyPolishPreview());
el.cancelPolishPreview.addEventListener("click", cancelPolishPreview);
for (const control of [el.aiEnabled, el.aiBaseUrl, el.aiModel, el.aiPrompt]) {
  control.addEventListener("change", saveNonSecretAiSettings);
}
el.aiApiKey.addEventListener("change", () => void saveApiKey(apiKeyValue));
el.aiApiKey.addEventListener("focus", () => {
  el.aiApiKey.type = "text";
  el.aiApiKey.value = apiKeyValue;
});
el.aiApiKey.addEventListener("input", () => { apiKeyValue = el.aiApiKey.value; });
el.aiApiKey.addEventListener("blur", () => {
  apiKeyValue = el.aiApiKey.value;
  el.aiApiKey.type = "password";
  void saveApiKey(apiKeyValue);
});

uxp.entrypoints.setup({
  panels: {
    // UXP's published panel typing is narrower than the runtime API.
    // @ts-expect-error
    reviewExportPanel: {
      show() { void initialize(); }
    }
  }
});
