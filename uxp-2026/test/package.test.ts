import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Premiere 2026 UXP package", () => {
  it("targets Premiere 26.3 with request-scoped files and HTTPS-compatible networking", () => {
    const manifest = JSON.parse(read("public/manifest.json"));
    expect(manifest.manifestVersion).toBe(5);
    expect(manifest.host).toEqual({ app: "premierepro", minVersion: "26.3.0" });
    expect(manifest.requiredPermissions.localFileSystem).toBe("request");
    expect(manifest.requiredPermissions.network.domains).toBe("all");
  });

  it("ships required panel and AME preset files", () => {
    for (const path of ["public/index.html", "public/styles.css", "public/presets/review-720p.epr", "index.ts"]) {
      expect(statSync(join(root, path)).isFile()).toBe(true);
    }
  });

  it("contains no CEP bridge, ExtendScript, FFmpeg, or child process dependency", () => {
    const runtime = ["index.ts", "src/media.ts", "src/premiere.ts", "src/storage.ts", "src/ai.ts"].map(read).join("\n");
    expect(runtime).not.toMatch(/CSInterface|evalScript|window\.cep|child_process|ffmpeg/i);
    expect(runtime).toMatch(/EncoderManager/);
    expect(runtime).toMatch(/secureStorage/);
  });

  it("uses Premiere-compatible Spectrum controls and avoids unsupported CSS Grid", () => {
    const html = read("public/index.html");
    const css = read("public/styles.css");
    for (const control of ["sp-button", "sp-checkbox", "sp-textfield", "sp-textarea"]) {
      expect(html).toContain(`<${control}`);
    }
    expect(css).not.toMatch(/display\s*:\s*grid|grid-template/i);
  });
});
