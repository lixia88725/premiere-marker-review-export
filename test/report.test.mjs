import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildReportHtml, mediaFileNameForMarker, normalizeMarkers } from '../src/report.mjs';

describe('normalizeMarkers', () => {
  it('sorts markers and classifies point versus duration media', () => {
    const markers = normalizeMarkers([
      { index: 2, name: 'B', comment: 'range', startTicks: '200', endTicks: '300', durationTicks: '100', startTimecode: '00:00:02:00', durationText: '00:00:01:00' },
      { index: 1, name: 'A', comment: 'point', startTicks: '100', endTicks: '100', durationTicks: '0', startTimecode: '00:00:01:00', durationText: '00:00:00:00' }
    ]);

    assert.deepEqual(markers.map((m) => m.mediaType), ['image', 'video']);
    assert.deepEqual(markers.map((m) => m.assetFileName), ['marker-001.jpg', 'marker-002.mp4']);
  });
});

describe('buildReportHtml', () => {
  it('renders video posters and translucent play overlays for duration markers', () => {
    const html = buildReportHtml({
      sequenceName: 'Poster Seq',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: normalizeMarkers([
        { name: '', comment: 'range', startTicks: '1', endTicks: '11', durationTicks: '10', startTimecode: '00:00:01.000', durationText: '00:00:00.010' }
      ])
    });

    assert.ok(html.includes('poster="assets/marker-001-poster.jpg"'));
    assert.doesNotMatch(html, /<video[^>]*\scontrols\b/);
    assert.match(html, /class="video-frame"/);
    assert.match(html, /class="play-overlay"/);
    assert.match(html, /opacity: .5/);
    assert.ok(html.includes('video.controls = true'));
  });

  it('does not wrap image markers in video frames', () => {
    const html = buildReportHtml({
      sequenceName: 'Image Seq',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: normalizeMarkers([
        { name: '', comment: 'point', startTicks: '1', endTicks: '1', durationTicks: '0', startTimecode: '00:00:01.000', durationText: '00:00:00.000' }
      ])
    });

    assert.doesNotMatch(html, /class="video-frame"/);
    assert.ok(html.includes('<img src="assets/marker-001.jpg"'));
  });

  it('uses the paper review visual style', () => {
    const html = buildReportHtml({
      sequenceName: 'Paper Seq',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: []
    });

    assert.ok(!html.includes('Option B / Paper Notes'));
    assert.ok(!html.includes('A carefully prepared review memo for production feedback.'));
    assert.match(html, /--page-bg: #f3efe5/);
  });

  it('omits the marker column when all marker names are empty or untitled', () => {
    const html = buildReportHtml({
      sequenceName: 'No marker names',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: normalizeMarkers([
        { name: '', comment: 'first', startTicks: '1', endTicks: '1', durationTicks: '0', startTimecode: '00:00:01.000', durationText: '00:00:00.000' },
        { name: '(Untitled marker)', comment: 'second', startTicks: '2', endTicks: '2', durationTicks: '0', startTimecode: '00:00:02.000', durationText: '00:00:00.000' }
      ])
    });

    assert.equal(html.includes('<th class="col-marker">Marker</th>'), false);
    assert.doesNotMatch(html, /marker-name/);
    assert.equal((html.match(/<th class=/g) || []).length, 4);
    assert.equal(html.includes('<th>Comment</th>'), true);
    assert.equal((html.match(/<td/g) || []).length, 10);
  });

  it('keeps the marker column when any marker has a real name', () => {
    const html = buildReportHtml({
      sequenceName: 'Named marker',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: normalizeMarkers([
        { name: '', comment: 'first', startTicks: '1', endTicks: '1', durationTicks: '0', startTimecode: '00:00:01.000', durationText: '00:00:00.000' },
        { name: 'Act 03', comment: 'second', startTicks: '2', endTicks: '2', durationTicks: '0', startTimecode: '00:00:02.000', durationText: '00:00:00.000' }
      ])
    });

    assert.equal(html.includes('<th class="col-marker">Marker</th>'), true);
    assert.match(html, /Act 03/);
  });

  it('renders escaped marker data and relative media assets', () => {
    const html = buildReportHtml({
      sequenceName: 'Seq <Main>',
      generatedAt: '2026-06-02T00:00:00.000Z',
      markers: normalizeMarkers([
        { index: 1, name: '<Title>', comment: '中文 & notes', startTicks: '10', endTicks: '20', durationTicks: '10', startTimecode: '00:00:10:00', durationText: '00:00:00:10' }
      ])
    });

    assert.match(html, /Seq &lt;Main&gt;/);
    assert.match(html, /&lt;Title&gt;/);
    assert.match(html, /中文 &amp; notes/);
    assert.match(html, new RegExp("assets/marker-001\.mp4"));
    assert.doesNotMatch(html, /<Title>/);
  });
});

describe('mediaFileNameForMarker', () => {
  it('uses deterministic padded names', () => {
    assert.equal(mediaFileNameForMarker(12, 'video'), 'marker-012.mp4');
    assert.equal(mediaFileNameForMarker(12, 'image'), 'marker-012.jpg');
  });
});
