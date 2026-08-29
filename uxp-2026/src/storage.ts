import type { OutputContext } from "./types";
import { reviewDateStamp, sanitizeFolderName } from "./core/exportPath.js";
import {
  API_KEY_STORAGE_KEY,
  OUTPUT_PATH_KEY,
  loadSecret,
  rememberFolder,
  restoreRememberedFolder,
  saveSecret
} from "./storageCore";

const uxp: any = require("uxp");

export async function chooseOutputFolder(): Promise<any | null> {
  const folder = await uxp.storage.localFileSystem.getFolder();
  if (!folder) return null;
  await rememberFolder(uxp.storage.localFileSystem, localStorage, folder);
  return folder;
}

export async function restoreOutputFolder(): Promise<any | null> {
  return restoreRememberedFolder(uxp.storage.localFileSystem, localStorage);
}

export function storedOutputPath(): string {
  return localStorage.getItem(OUTPUT_PATH_KEY) || "";
}

export async function createOutputContext(parent: any, projectName: string): Promise<OutputContext> {
  const base = `${sanitizeFolderName(projectName)}_Review_${reviewDateStamp(new Date())}`;
  const existing = new Set((await parent.getEntries()).map((entry: any) => entry.name));
  let version = 1;
  while (existing.has(`${base}_V${version}`)) version += 1;
  const root = await parent.createFolder(`${base}_V${version}`);
  const assets = await root.createFolder("assets");
  return { root, assets, rootPath: root.nativePath || root.name };
}

export async function writeText(folder: any, name: string, content: string): Promise<void> {
  const file = await folder.createFile(name, { overwrite: true });
  await file.write(content);
}

export async function getVideoPresetPath(): Promise<string> {
  const entry = await uxp.storage.localFileSystem.getEntryWithUrl("plugin:/presets/review-720p.epr");
  if (!entry?.nativePath) throw new Error("The bundled AME preset could not be found.");
  return entry.nativePath;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await saveSecret(uxp.storage.secureStorage, API_KEY_STORAGE_KEY, apiKey);
}

export async function loadApiKey(): Promise<string> {
  return loadSecret(uxp.storage.secureStorage, API_KEY_STORAGE_KEY);
}
