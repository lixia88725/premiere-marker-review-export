import { describe, expect, it, vi } from "vitest";
import { createRenderTracker } from "../src/renderTracker";

const events = { queue: "queue", progress: "progress", complete: "complete", error: "error", cancel: "cancel" };

function fakeEvents() {
  const handlers = new Map<string, (event?: any) => void>();
  return {
    handlers,
    manager: {
      addEventListener: vi.fn((_target, name, handler) => { handlers.set(name, handler); }),
      removeEventListener: vi.fn((_target, name) => { handlers.delete(name); })
    }
  };
}

describe("AME render event tracker", () => {
  it("maps queue job IDs to completion output and reports progress", async () => {
    const bus = fakeEvents();
    const messages: string[] = [];
    const tracker = createRenderTracker({
      encoder: {}, eventManager: bus.manager, events,
      expectedNames: ["marker-001.mp4"], onProgress: (message) => messages.push(message), timeoutMs: 1000
    });
    bus.handlers.get("queue")?.({ jobID: "job-1" });
    bus.handlers.get("progress")?.({ jobID: "job-1", progressAmount: 0.5 });
    bus.handlers.get("complete")?.({ jobID: "job-1", outputFiles: ["/tmp/marker-001.mp4"] });
    await expect(tracker.promise).resolves.toEqual([{ fileName: "marker-001.mp4", success: true }]);
    expect(messages).toContain("marker-001.mp4: 50%");
    expect(bus.manager.removeEventListener).toHaveBeenCalledTimes(5);
  });

  it.each([
    ["error", "AME render error"],
    ["cancel", "AME render cancelled"]
  ])("turns an AME %s terminal event into a failed-media result", async (eventName, error) => {
    const bus = fakeEvents();
    const tracker = createRenderTracker({
      encoder: {}, eventManager: bus.manager, events,
      expectedNames: ["marker-001.mp4"], onProgress: () => undefined, timeoutMs: 1000
    });
    bus.handlers.get("queue")?.({ jobID: "job-1" });
    bus.handlers.get(eventName)?.({ jobID: "job-1" });
    await expect(tracker.promise).resolves.toEqual([{ fileName: "marker-001.mp4", success: false, error }]);
  });

  it("records a queue failure without waiting for an AME event", async () => {
    const bus = fakeEvents();
    const tracker = createRenderTracker({
      encoder: {}, eventManager: bus.manager, events,
      expectedNames: ["marker-001.mp4"], onProgress: () => undefined, timeoutMs: 1000
    });
    tracker.markFailed("marker-001.mp4", "Could not queue in AME");
    await expect(tracker.promise).resolves.toEqual([
      { fileName: "marker-001.mp4", success: false, error: "Could not queue in AME" }
    ]);
  });
});
