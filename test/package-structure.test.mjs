import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url))); 

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('CEP package structure', () => {
  it('contains the Premiere Pro 2022 panel manifest and host scripts', () => {
    for (const file of [
      'CSXS/manifest.xml',
      'index.html',
      'js/report.js',
      'js/ffmpeg.js',
      'js/aiPolish.js',
      'js/main.js',
      'jsx/host.jsx',
      'presets/review-720p.epr',
      'README.md'
    ]) {
      assert.ok(statSync(join(root, file)).isFile(), file);
    }
  });

  it('targets Premiere Pro CEP and wires required ExtendScript entry points', () => {
    const manifest = read('CSXS/manifest.xml');
    const host = read('jsx/host.jsx');

    assert.match(manifest, /Host Name="PPRO"/);
    assert.match(manifest, /ExtensionBundleId="com.xiali.premiere.reviewexport"/);
    assert.match(host, /function getSequenceSummary/);
    assert.match(host, /function collectMarkers/);
    assert.match(host, /function exportMarkerMedia/);
    assert.match(host, /function exportSingleMarkerMedia/);
    assert.match(host, /function startQueuedMedia/);
    assert.doesNotMatch(read('index.html'), /type="module"/);
    assert.match(read('js/report.js'), /window.ReviewReport/);
  });

  it('contains AI polish settings controls', () => {
    const html = read('index.html');
    const main = read('js/main.js');

    assert.match(html, /id="aiEnabled"/);
    assert.match(html, /id="aiBaseUrl"/);
    assert.match(html, /id="aiModel"/);
    assert.match(html, /id="aiApiKey"/);
    assert.match(html, /id="aiPrompt"/);
    assert.match(html, /js\/aiPolish\.js/);
    assert.match(main, /loadAiSettings/);
    assert.match(main, /saveAiSettings/);
    assert.match(main, /polishMarkerComments/);
  });
});
