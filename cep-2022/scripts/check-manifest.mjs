import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const manifest = readFileSync('CSXS/manifest.xml', 'utf8');
assert.match(manifest, /ExtensionBundleId="com\.xiali\.premiere\.reviewexport"/);
assert.match(manifest, /Host Name="PPRO" Version="\[22\.0,23\.0\]"/);
for (const file of ['index.html', 'js/main.js', 'jsx/host.jsx', 'presets/review-720p.epr', 'presets/review-frame.epr']) {
  assert.equal(statSync(file).isFile(), true, file);
}
console.log('CEP manifest/package check passed.');
