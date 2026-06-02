import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_PROMPT,
  buildPolishRequest,
  loadAiSettings,
  parsePolishResponse,
  polishMarkerComments,
  saveAiSettings
} from '../src/aiPolish.mjs';

const markers = [
  { index: 1, comment: '这礼速度有点太快了', name: '', mediaType: 'image' },
  { index: 2, comment: '', name: '', mediaType: 'image' },
  { index: 3, comment: '断句 不太对', name: '', mediaType: 'video' }
];

const enabledSettings = {
  enabled: true,
  baseUrl: DEFAULT_AI_BASE_URL,
  model: 'gpt-test',
  apiKey: 'sk-test',
  prompt: DEFAULT_AI_PROMPT
};

describe('AI polish settings', () => {
  it('loads defaults and saves normalized settings', () => {
    const data = new Map();
    const storage = {
      getItem(key) { return data.get(key) || null; },
      setItem(key, value) { data.set(key, value); }
    };

    assert.equal(loadAiSettings(storage).baseUrl, DEFAULT_AI_BASE_URL);
    saveAiSettings({ enabled: true, model: ' gpt-4o-mini ', apiKey: ' key ', prompt: '' }, storage);
    const loaded = loadAiSettings(storage);

    assert.equal(loaded.enabled, true);
    assert.equal(loaded.model, 'gpt-4o-mini');
    assert.equal(loaded.apiKey, 'key');
    assert.equal(loaded.prompt, DEFAULT_AI_PROMPT);
  });
});

describe('buildPolishRequest', () => {
  it('returns null when disabled', () => {
    assert.equal(buildPolishRequest(markers, { ...enabledSettings, enabled: false }), null);
  });

  it('omits empty comments and builds an OpenAI-compatible payload', () => {
    const request = buildPolishRequest(markers, enabledSettings);

    assert.equal(request.url, DEFAULT_AI_BASE_URL);
    assert.equal(request.headers.Authorization, 'Bearer sk-test');
    assert.equal(request.body.model, 'gpt-test');
    assert.match(request.body.messages[0].content, /不改变原意/);
    const payload = JSON.parse(request.body.messages[1].content);
    assert.deepEqual(payload.items.map((item) => item.index), [1, 3]);
    assert.equal(payload.items[0].comment, '这礼速度有点太快了');
  });
});

describe('parsePolishResponse', () => {
  it('parses OpenAI chat completion JSON content', () => {
    const response = JSON.stringify({ choices: [{ message: { content: '{"items":[{"index":1,"comment":"这里速度有点太快了。"}]}' } }] });

    assert.deepEqual(parsePolishResponse(response), [{ index: 1, comment: '这里速度有点太快了。' }]);
  });

  it('rejects invalid or empty responses', () => {
    assert.throws(() => parsePolishResponse('not json'));
    assert.throws(() => parsePolishResponse('{"items":[]}'));
    assert.throws(() => parsePolishResponse('{"items":[{"index":1}]}'));
  });
});

describe('polishMarkerComments', () => {
  it('returns markers unchanged when AI is disabled', async () => {
    const result = await polishMarkerComments(markers, { ...enabledSettings, enabled: false }, async () => {
      throw new Error('should not request');
    });

    assert.equal(result, markers);
  });

  it('replaces comments by index and preserves other marker fields', async () => {
    const result = await polishMarkerComments(markers, enabledSettings, async () => JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ items: [{ index: 1, comment: '这里速度有点太快了。' }] }) } }]
    }));

    assert.equal(result[0].comment, '这里速度有点太快了。');
    assert.equal(result[1].comment, '');
    assert.equal(result[2].comment, '断句 不太对');
    assert.equal(result[0].mediaType, 'image');
  });

  it('keeps original comments and reports errors when polishing fails', async () => {
    let errorMessage = '';
    const result = await polishMarkerComments(markers, enabledSettings, async () => 'not json', (error) => {
      errorMessage = error.message;
    });

    assert.deepEqual(result, markers);
    assert.ok(errorMessage);
  });
});
