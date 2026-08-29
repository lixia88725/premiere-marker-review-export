import { describe, expect, it, vi } from "vitest";
import { copyStagedFrame } from "../src/frameStaging";

describe("Premiere frame-export staging", () => {
  it("normalizes Premiere's doubled extension and copies binary data to the authorized folder", async () => {
    const bytes = new ArrayBuffer(4);
    const source = {
      isFile: true,
      name: "marker-001.jpg.jpg",
      read: vi.fn().mockResolvedValue(bytes),
      delete: vi.fn().mockResolvedValue(undefined)
    };
    const output = { write: vi.fn().mockResolvedValue(4) };
    const staging = { getEntries: vi.fn().mockResolvedValue([source]) };
    const destination = { createFile: vi.fn().mockResolvedValue(output) };
    const binaryFormat = Symbol("binary");

    await expect(copyStagedFrame({
      staging, destination, requestedName: "marker-001.jpg", binaryFormat, attempts: 1
    })).resolves.toBe("marker-001.jpg");
    expect(destination.createFile).toHaveBeenCalledWith("marker-001.jpg", { overwrite: true });
    expect(output.write).toHaveBeenCalledWith(bytes, { format: binaryFormat });
    expect(source.delete).toHaveBeenCalled();
  });

  it("returns null when Premiere reports success but creates no frame", async () => {
    const staging = { getEntries: vi.fn().mockResolvedValue([]) };
    await expect(copyStagedFrame({
      staging,
      destination: {},
      requestedName: "marker-001.jpg",
      binaryFormat: Symbol("binary"),
      attempts: 2,
      retryDelayMs: 0
    })).resolves.toBeNull();
  });
});
