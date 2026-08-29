import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextReviewFolderName, reviewDateStamp, sanitizeFolderName } from '../src/exportPath.mjs';

describe('export path helpers', () => {
  it('sanitizes project names for folder paths', () => {
    assert.equal(sanitizeFolderName(' LHSN: Reel/RE?.prproj '), 'LHSN_Reel_RE');
  });

  it('formats review date stamps', () => {
    assert.equal(reviewDateStamp(new Date('2026-05-29T12:00:00Z')), '20260529');
  });

  it('uses V1 when no previous matching folders exist', () => {
    const name = nextReviewFolderName({
      parentPath: '/tmp/out',
      projectName: 'LHSN.prproj',
      date: new Date('2026-05-29T12:00:00Z'),
      existingNames: []
    });
    assert.equal(name, 'LHSN_Review_20260529_V1');
  });

  it('increments the next version from existing matching folders', () => {
    const name = nextReviewFolderName({
      parentPath: '/tmp/out',
      projectName: 'LHSN.prproj',
      date: new Date('2026-05-29T12:00:00Z'),
      existingNames: ['LHSN_Review_20260529_V1', 'LHSN_Review_20260529_V2', 'Other_Review_20260529_V9']
    });
    assert.equal(name, 'LHSN_Review_20260529_V3');
  });
});
