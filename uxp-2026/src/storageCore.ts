export const OUTPUT_TOKEN_KEY = "premiereReviewExport.outputFolderToken";
export const OUTPUT_PATH_KEY = "premiereReviewExport.outputFolderPath";
export const API_KEY_STORAGE_KEY = "premiereReviewExport.apiKey";

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export async function rememberFolder(fileSystem: any, store: KeyValueStore, folder: any): Promise<void> {
  const token = await fileSystem.createPersistentToken(folder);
  store.setItem(OUTPUT_TOKEN_KEY, token);
  store.setItem(OUTPUT_PATH_KEY, folder.nativePath || folder.name || "Selected folder");
}

export async function restoreRememberedFolder(fileSystem: any, store: KeyValueStore): Promise<any | null> {
  const token = store.getItem(OUTPUT_TOKEN_KEY);
  if (!token) return null;
  try {
    return await fileSystem.getEntryForPersistentToken(token);
  } catch (_error) {
    store.removeItem(OUTPUT_TOKEN_KEY);
    return null;
  }
}

export async function saveSecret(secureStorage: any, key: string, value: string): Promise<void> {
  if (value) {
    await secureStorage.setItem(key, value);
    return;
  }
  try {
    await secureStorage.removeItem(key);
  } catch (_error) {
    // Removing an already-empty key is harmless.
  }
}

export async function loadSecret(secureStorage: any, key: string): Promise<string> {
  try {
    const value = await secureStorage.getItem(key);
    return Array.from(value as Uint8Array, (byte) => String.fromCharCode(byte)).join("");
  } catch (_error) {
    return "";
  }
}
