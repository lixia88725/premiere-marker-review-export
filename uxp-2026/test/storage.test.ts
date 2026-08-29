import { describe, expect, it, vi } from "vitest";
import {
  API_KEY_STORAGE_KEY,
  OUTPUT_PATH_KEY,
  OUTPUT_TOKEN_KEY,
  loadSecret,
  rememberFolder,
  restoreRememberedFolder,
  saveSecret
} from "../src/storageCore";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); }
  };
}

describe("UXP persistent file permission", () => {
  it("stores a persistent token and restores the selected folder", async () => {
    const store = memoryStore();
    const folder = { nativePath: "/review/output" };
    const fileSystem = {
      createPersistentToken: vi.fn().mockResolvedValue("folder-token"),
      getEntryForPersistentToken: vi.fn().mockResolvedValue(folder)
    };
    await rememberFolder(fileSystem, store, folder);
    expect(store.getItem(OUTPUT_TOKEN_KEY)).toBe("folder-token");
    expect(store.getItem(OUTPUT_PATH_KEY)).toBe("/review/output");
    await expect(restoreRememberedFolder(fileSystem, store)).resolves.toBe(folder);
  });

  it("forgets a token after UXP reports that permission is no longer valid", async () => {
    const store = memoryStore();
    store.setItem(OUTPUT_TOKEN_KEY, "stale-token");
    const fileSystem = { getEntryForPersistentToken: vi.fn().mockRejectedValue(new Error("permission denied")) };
    await expect(restoreRememberedFolder(fileSystem, store)).resolves.toBeNull();
    expect(store.getItem(OUTPUT_TOKEN_KEY)).toBeNull();
  });
});

describe("UXP SecureStorage adapter", () => {
  it("writes the API key and decodes the encrypted store response", async () => {
    const bytes = Uint8Array.from(Array.from("secret-key", (character) => character.charCodeAt(0)));
    const secureStorage = {
      setItem: vi.fn().mockResolvedValue(undefined),
      getItem: vi.fn().mockResolvedValue(bytes),
      removeItem: vi.fn()
    };
    await saveSecret(secureStorage, API_KEY_STORAGE_KEY, "secret-key");
    expect(secureStorage.setItem).toHaveBeenCalledWith(API_KEY_STORAGE_KEY, "secret-key");
    await expect(loadSecret(secureStorage, API_KEY_STORAGE_KEY)).resolves.toBe("secret-key");
  });
});
