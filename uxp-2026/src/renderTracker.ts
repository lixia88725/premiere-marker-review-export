export interface RenderResult {
  fileName: string;
  success: boolean;
  error?: string;
}

interface EventManagerLike {
  addEventListener(target: any, name: string, handler: (event?: any) => void): void;
  removeEventListener?(target: any, name: string, handler: (event?: any) => void): void;
}

interface EncoderEvents {
  queue: string;
  progress: string;
  complete: string;
  error: string;
  cancel: string;
}

function fileNameFromPath(path: string): string {
  return String(path || "").split(/[\\/]/).pop() || "";
}

export function createRenderTracker(options: {
  encoder: any;
  eventManager: EventManagerLike;
  events: EncoderEvents;
  expectedNames: string[];
  onProgress: (message: string) => void;
  timeoutMs: number;
}): {
  promise: Promise<RenderResult[]>;
  markFailed: (fileName: string, error: string) => void;
} {
  const { encoder, eventManager, events, expectedNames, onProgress, timeoutMs } = options;
  const pendingQueue = [...expectedNames];
  const byJob = new Map<string, string>();
  const results = new Map<string, RenderResult>();
  let resolvePromise: (value: RenderResult[]) => void = () => undefined;

  const promise = new Promise<RenderResult[]>((resolve) => { resolvePromise = resolve; });
  const finishIfDone = () => {
    if (results.size < expectedNames.length) return;
    clearTimeout(timeout);
    cleanup();
    resolvePromise(expectedNames.map((fileName) =>
      results.get(fileName) || { fileName, success: false, error: "No terminal event" }
    ));
  };
  const onQueue = (event: any) => {
    const fileName = pendingQueue.shift();
    if (fileName) byJob.set(String(event?.jobID || ""), fileName);
    onProgress(`${fileName || "Media"} queued in Adobe Media Encoder.`);
  };
  const onRenderProgress = (event: any) => {
    const fileName = byJob.get(String(event?.jobID || "")) || "Media";
    const percent = Math.round(Number(event?.progressAmount || 0) * 100);
    onProgress(`${fileName}: ${percent}%`);
  };
  const onComplete = (event: any) => {
    const mapped = byJob.get(String(event?.jobID || ""));
    const outputName = fileNameFromPath(event?.outputFiles?.[0] || "");
    const fileName = expectedNames.includes(outputName) ? outputName : mapped;
    if (fileName) results.set(fileName, { fileName, success: true });
    finishIfDone();
  };
  const terminalFailure = (kind: string) => (event: any) => {
    const fileName = byJob.get(String(event?.jobID || "")) || pendingQueue.shift();
    if (fileName) results.set(fileName, { fileName, success: false, error: kind });
    finishIfDone();
  };
  const onError = terminalFailure("AME render error");
  const onCancel = terminalFailure("AME render cancelled");
  const listeners: Array<[string, (event?: any) => void]> = [
    [events.queue, onQueue],
    [events.progress, onRenderProgress],
    [events.complete, onComplete],
    [events.error, onError],
    [events.cancel, onCancel]
  ];
  const cleanup = () => {
    if (!eventManager.removeEventListener) return;
    for (const [name, handler] of listeners) eventManager.removeEventListener(encoder, name, handler);
  };

  for (const [name, handler] of listeners) eventManager.addEventListener(encoder, name, handler);
  const timeout = setTimeout(() => {
    for (const name of expectedNames) {
      if (!results.has(name)) results.set(name, { fileName: name, success: false, error: "Timed out waiting for AME" });
    }
    finishIfDone();
  }, timeoutMs);

  return {
    markFailed(fileName: string, error: string) {
      results.set(fileName, { fileName, success: false, error });
      const pendingIndex = pendingQueue.indexOf(fileName);
      if (pendingIndex >= 0) pendingQueue.splice(pendingIndex, 1);
      finishIfDone();
    },
    promise
  };
}
