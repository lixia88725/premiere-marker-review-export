import { describe, expect, it } from "vitest";
import { markerReplacementConflict } from "../src/markerGuard";

const replacement = {
  index: 1,
  guid: "guid-1",
  startTicks: "100",
  durationTicks: "20",
  originalComment: "before",
  polishedComment: "after"
};

describe("Premiere marker writeback guard", () => {
  it("accepts the same GUID, time, duration, and original comment", () => {
    expect(markerReplacementConflict(replacement, {
      guid: "guid-1", startTicks: "100", durationTicks: "20", comment: "before"
    })).toBeNull();
  });

  it("rejects missing GUIDs and concurrent marker edits", () => {
    expect(markerReplacementConflict(replacement, undefined)).toBe("marker no longer exists");
    expect(markerReplacementConflict(replacement, {
      guid: "guid-1", startTicks: "101", durationTicks: "20", comment: "before"
    })).toBe("marker changed after AI polish");
    expect(markerReplacementConflict(replacement, {
      guid: "guid-1", startTicks: "100", durationTicks: "20", comment: "edited"
    })).toBe("marker changed after AI polish");
  });
});
