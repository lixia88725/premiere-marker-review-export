import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFfmpegArgs, buildPosterFileName, buildPosterFfmpegArgs, ticksToSeconds } from '../src/ffmpeg.mjs';

describe('ticksToSeconds', () => {
  it('converts Premiere ticks to seconds', () => {
    assert.equal(ticksToSeconds('254016000000'), 1);
  });
});

describe('buildFfmpegArgs', () => {
  it('builds video trim args for duration markers', () => {
    const args = buildFfmpegArgs({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      masterVideoPath: '/Users/xiali/Desktop/master.mp4',
      outputPath: '/Users/xiali/Desktop/feedback/assets/marker-001.mp4',
      marker: { mediaType: 'video', startTicks: '254016000000', durationTicks: '508032000000' }
    });
    assert.deepEqual(args.slice(0, 8), ['/opt/homebrew/bin/ffmpeg', '-y', '-ss', '1.000', '-i', '/Users/xiali/Desktop/master.mp4', '-t', '2.000']);
    assert.equal(args[args.indexOf('-vf') + 1], 'scale=540:-2');
    assert.equal(args[args.indexOf('-crf') + 1], '28');
    assert.equal(args[args.indexOf('-b:a') + 1], '64k');
    assert.equal(args.at(-1), '/Users/xiali/Desktop/feedback/assets/marker-001.mp4');
  });

  it('builds still frame args for point markers', () => {
    const args = buildFfmpegArgs({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      masterVideoPath: '/Users/xiali/Desktop/master.mp4',
      outputPath: '/Users/xiali/Desktop/feedback/assets/marker-002.jpg',
      marker: { mediaType: 'image', startTicks: '508032000000', durationTicks: '0' }
    });
    assert.deepEqual(args, ['/opt/homebrew/bin/ffmpeg', '-y', '-ss', '2.000', '-i', '/Users/xiali/Desktop/master.mp4', '-frames:v', '1', '-q:v', '2', '/Users/xiali/Desktop/feedback/assets/marker-002.jpg']);
  });
});


describe('buildPosterFfmpegArgs', () => {
  it('builds poster frame args for duration markers', () => {
    assert.equal(buildPosterFileName('marker-012.mp4'), 'marker-012-poster.jpg');
    const args = buildPosterFfmpegArgs({
      ffmpegPath: '/opt/homebrew/bin/ffmpeg',
      masterVideoPath: '/Users/xiali/Desktop/master.mp4',
      outputPath: '/Users/xiali/Desktop/feedback/assets/marker-012-poster.jpg',
      marker: { mediaType: 'video', startTicks: '254016000000', durationTicks: '508032000000' }
    });
    assert.deepEqual(args, ['/opt/homebrew/bin/ffmpeg', '-y', '-ss', '1.000', '-i', '/Users/xiali/Desktop/master.mp4', '-frames:v', '1', '-q:v', '3', '/Users/xiali/Desktop/feedback/assets/marker-012-poster.jpg']);
  });
});
