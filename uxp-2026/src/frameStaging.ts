function frameCandidates(entries: any[], requestedName: string): any[] {
  const extension = requestedName.split(".").pop();
  return [
    entries.find((entry) => entry.isFile && entry.name === requestedName),
    entries.find((entry) => entry.isFile && entry.name === `${requestedName}.${extension}`),
    entries.find((entry) => entry.isFile && entry.name.startsWith(requestedName))
  ].filter(Boolean);
}

export async function copyStagedFrame(options: {
  staging: any;
  destination: any;
  requestedName: string;
  binaryFormat: symbol;
  attempts?: number;
  retryDelayMs?: number;
}): Promise<string | null> {
  const { staging, destination, requestedName, binaryFormat } = options;
  const attempts = Math.max(1, options.attempts ?? 10);
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? 75);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidates = frameCandidates(await staging.getEntries(), requestedName);
    const source = candidates[0];
    if (source) {
      const data = await source.read({ format: binaryFormat });
      const output = await destination.createFile(requestedName, { overwrite: true });
      await output.write(data, { format: binaryFormat });
      try { await source.delete(); } catch (_error) { /* temporary files are disposed with the plugin */ }
      return requestedName;
    }
    if (attempt + 1 < attempts && retryDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  return null;
}
