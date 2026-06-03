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

  it('contains AI marker writeback controls and host entry point', () => {
    const html = read('index.html');
    const main = read('js/main.js');
    const host = read('jsx/host.jsx');

    assert.match(html, /id="polishMarkers"/);
    assert.match(html, /Polish Premiere Markers/);
    assert.match(main, /polishPremiereMarkers/);
    assert.match(main, /buildMarkerCommentReplacements/);
    assert.match(main, /marker-polish-backup-/);
    assert.match(main, /aiEnabled\.checked = false/);
    assert.match(host, /function replaceMarkerComments/);
    assert.match(host, /marker\.comments = replacement\.polishedComment/);
  });

  it('previews AI marker polish before applying it to Premiere', () => {
    const html = read('index.html');
    const main = read('js/main.js');

    assert.match(html, /id="polishPreview"/);
    assert.match(html, /AI Polish Preview/);
    assert.match(html, /id="polishPreviewList"/);
    assert.match(html, /id="applyPolishPreview"/);
    assert.match(html, /Apply to Premiere Markers/);
    assert.match(html, /id="cancelPolishPreview"/);
    assert.match(main, /let pendingPolishPreview = null/);
    assert.match(main, /function renderPolishPreview/);
    assert.match(main, /function applyPolishPreview/);
    assert.match(main, /function cancelPolishPreview/);
    assert.match(main, /el\.applyPolishPreview\.addEventListener\('click', applyPolishPreview\)/);
    assert.match(main, /el\.cancelPolishPreview\.addEventListener\('click', cancelPolishPreview\)/);
  });

  it('defaults the output folder to the current Premiere project folder', () => {
    const main = read('js/main.js');
    const host = read('jsx/host.jsx');

    assert.match(host, /projectFolderOrEmpty/);
    assert.match(host, /projectFolder: projectFolderOrEmpty\(\)/);
    assert.match(host, /projectPath: projectPathOrEmpty\(\)/);
    assert.match(host, /productionPath: productionPathOrEmpty\(\)/);
    assert.match(host, /new File\(projectPath\)/);
    assert.match(host, /projectFile\.parent\.fsName/);
    assert.match(host, /projectFromOpenProjectsOrNull/);
    assert.match(host, /var seq = activeSequenceOrNull\(\)/);
    assert.match(host, /sequenceName: seq \? seq\.name : 'No active sequence'/);
    assert.match(main, /applyDefaultOutputFolder\(summary\.projectFolder\)/);
    assert.match(main, /logProjectPathDiagnostics\(summary\)/);
    assert.match(main, /function logProjectPathDiagnostics/);
    assert.match(main, /function applyDefaultOutputFolder/);
    assert.match(main, /if \(normalizeCepFilePath\(el\.outputPath\.value\)\) return/);
  });

  it('keeps default output folder on manual refresh without startup retry polling', () => {
    const main = read('js/main.js');

    assert.match(main, /loadHostScript\(\)\.then\(refreshSummary\)/);
    assert.match(main, /el\.refresh\.addEventListener\('click', refreshSummary\)/);
    assert.doesNotMatch(main, /runStartupRefresh/);
    assert.doesNotMatch(main, /STARTUP_REFRESH_INTERVAL_MS/);
    assert.doesNotMatch(main, /refreshDefaultOutputFolderWhenEmpty/);
    assert.doesNotMatch(main, /window\.addEventListener\('focus'/);
    assert.match(main, /async function refreshSummary\(options\)/);
    assert.match(main, /const diagnostics = options && options\.diagnostics !== false/);
    assert.match(main, /if \(diagnostics\) logProjectPathDiagnostics\(summary\)/);
  });
});
