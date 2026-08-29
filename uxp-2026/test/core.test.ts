import { describe, expect, it } from "vitest";
import { buildMarkerCommentReplacements, buildMarkerPolishBackup } from "../src/core/aiPolish.js";
import { buildReportHtml, normalizeMarkers } from "../src/core/report.js";

describe("UXP review report core", () => {
  it("preserves Premiere 26.3 marker GUIDs while normalizing", () => {
    const markers = normalizeMarkers([{
      guid: "marker-guid-1",
      name: "Fix",
      comment: "Original",
      startSeconds: 2,
      durationSeconds: 1,
      startTicks: "508032000000",
      endTicks: "762048000000",
      durationTicks: "254016000000",
      startTimecode: "00:00:02.000",
      durationText: "00:00:01.000"
    }]);
    expect(markers[0]).toMatchObject({ guid: "marker-guid-1", mediaType: "video", assetFileName: "marker-001.mp4" });
  });

  it("renders an explicit placeholder for failed media", () => {
    const html = buildReportHtml({
      sequenceName: "Review",
      generatedAt: "2026-08-29T00:00:00Z",
      markers: [{
        index: 1,
        name: "",
        comment: "Needs work",
        startTimecode: "00:00:01.000",
        durationText: "00:00:00.000",
        mediaType: "image",
        assetFileName: "marker-001.jpg",
        mediaAvailable: false
      }]
    });
    expect(html).toContain("Preview unavailable");
    expect(html).not.toContain('src="assets/marker-001.jpg"');
  });

  it("omits a broken poster URL when only the video export succeeds", () => {
    const html = buildReportHtml({
      sequenceName: "Review",
      generatedAt: "2026-08-29T00:00:00Z",
      markers: [{
        index: 1,
        name: "",
        comment: "Video note",
        startTimecode: "00:00:01.000",
        durationText: "00:00:02.000",
        mediaType: "video",
        assetFileName: "marker-001.mp4",
        posterFileName: "",
        mediaAvailable: true
      }]
    });
    expect(html).toContain('src="assets/marker-001.mp4"');
    expect(html).not.toContain('poster="');
  });
});

describe("GUID-safe AI writeback payload", () => {
  it("carries GUID through replacements and backup", () => {
    const original = [{ index: 1, guid: "guid-1", startTicks: "10", durationTicks: "5", comment: "old" }];
    const polished = [{ ...original[0], comment: "new" }];
    const replacements = buildMarkerCommentReplacements(original, polished);
    expect(replacements[0].guid).toBe("guid-1");
    const backup = buildMarkerPolishBackup({ sequenceName: "S", projectName: "P", generatedAt: "now", replacements });
    expect(backup.replacements[0].guid).toBe("guid-1");
  });
});
