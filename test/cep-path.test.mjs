import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeCepFilePath } from '../src/cepPath.mjs';

describe('normalizeCepFilePath', () => {
  it('converts CEP file URLs to macOS filesystem paths', () => {
    assert.equal(normalizeCepFilePath('file:///Users/xiali/Desktop/feedback/'), '/Users/xiali/Desktop/feedback');
  });

  it('keeps ordinary absolute paths and trims trailing slashes', () => {
    assert.equal(normalizeCepFilePath('/Users/xiali/Desktop/feedback/'), '/Users/xiali/Desktop/feedback');
  });

  it('decodes spaces and unicode characters', () => {
    assert.equal(normalizeCepFilePath('file:///Users/xiali/Desktop/My%20Feedback/%E6%89%B9%E6%B3%A8'), '/Users/xiali/Desktop/My Feedback/批注');
  });
});
