(function () {
const AI_SETTINGS_KEY = 'premiereReviewExport.aiSettings';
const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_AI_PROMPT = '请帮我润色这些剪辑反馈：修正语音输入造成的错别字、错误断句和不合适的语气，在不改变原意的前提下，让表达更清晰、准确、易懂。';

function defaultAiSettings() {
  return {
    enabled: false,
    baseUrl: DEFAULT_AI_BASE_URL,
    model: '',
    apiKey: '',
    prompt: DEFAULT_AI_PROMPT
  };
}

function loadAiSettings(storage = globalThis.localStorage) {
  const defaults = defaultAiSettings();
  if (!storage || typeof storage.getItem !== 'function') return defaults;
  try {
    const parsed = JSON.parse(storage.getItem(AI_SETTINGS_KEY) || '{}');
    return normalizeAiSettings(Object.assign({}, defaults, parsed));
  } catch (_error) {
    return defaults;
  }
}

function saveAiSettings(settings, storage = globalThis.localStorage) {
  if (!storage || typeof storage.setItem !== 'function') return;
  storage.setItem(AI_SETTINGS_KEY, JSON.stringify(normalizeAiSettings(settings)));
}

async function polishMarkerComments(markers, settings, requestJson = requestJsonWithNode, onError) {
  const normalizedSettings = normalizeAiSettings(settings);
  if (!normalizedSettings.enabled) return markers;

  const request = buildPolishRequest(markers, normalizedSettings);
  if (!request) return markers;

  try {
    const responseText = await requestJson(request);
    const polished = parsePolishResponse(responseText);
    const byIndex = new Map(polished.map((item) => [Number(item.index), String(item.comment)]));
    return markers.map((marker) => byIndex.has(Number(marker.index))
      ? Object.assign({}, marker, { comment: byIndex.get(Number(marker.index)) })
      : marker);
  } catch (error) {
    if (typeof onError === 'function') onError(error);
    return markers;
  }
}

function buildPolishRequest(markers, settings) {
  const normalizedSettings = normalizeAiSettings(settings);
  if (!normalizedSettings.enabled || !normalizedSettings.baseUrl || !normalizedSettings.model || !normalizedSettings.apiKey) return null;

  const comments = markers
    .filter((marker) => String(marker.comment || '').trim() !== '')
    .map((marker) => ({ index: Number(marker.index), comment: String(marker.comment) }));
  if (comments.length === 0) return null;

  const body = {
    model: normalizedSettings.model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: normalizedSettings.prompt + '\n\n只返回 JSON，不要解释。格式必须是：{"items":[{"index":1,"comment":"润色后的批注"}]}。index 必须沿用输入。'
      },
      {
        role: 'user',
        content: JSON.stringify({ items: comments })
      }
    ]
  };

  return {
    url: normalizedSettings.baseUrl,
    headers: {
      Authorization: 'Bearer ' + normalizedSettings.apiKey,
      'Content-Type': 'application/json'
    },
    body
  };
}

function parsePolishResponse(responseText) {
  const outer = JSON.parse(responseText);
  const content = typeof outer?.choices?.[0]?.message?.content === 'string'
    ? outer.choices[0].message.content
    : responseText;
  const parsed = JSON.parse(stripJsonFence(content));
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items) || items.length === 0) throw new Error('AI polish response did not include any comments.');

  return items.map((item) => {
    if (!Number.isFinite(Number(item?.index)) || typeof item?.comment !== 'string') {
      throw new Error('AI polish response format is invalid.');
    }
    return { index: Number(item.index), comment: item.comment };
  });
}

function normalizeAiSettings(settings) {
  const defaults = defaultAiSettings();
  const value = Object.assign({}, defaults, settings || {});
  return {
    enabled: !!value.enabled,
    baseUrl: String(value.baseUrl || defaults.baseUrl).trim(),
    model: String(value.model || '').trim(),
    apiKey: String(value.apiKey || '').trim(),
    prompt: String(value.prompt || defaults.prompt).trim() || defaults.prompt
  };
}

function stripJsonFence(value) {
  return String(value || '')
    .trim()
    .replace(new RegExp('^\\x60{3}(?:json)?\\s*', 'i'), '')
    .replace(new RegExp('\\s*\\x60{3}$', 'i'), '')
    .trim();
}

function requestJsonWithNode(request) {
  return new Promise((resolve, reject) => {
    if (typeof require !== 'function') {
      reject(new Error('Node require is not available in this CEP panel.'));
      return;
    }
    const urlModule = require('url');
    const parsedUrl = new urlModule.URL(request.url);
    const transport = parsedUrl.protocol === 'http:' ? require('http') : require('https');
    const bodyText = JSON.stringify(request.body);
    const req = transport.request({
      method: 'POST',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || undefined,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: Object.assign({}, request.headers, { 'Content-Length': Buffer.byteLength(bodyText) })
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error('AI polish API returned HTTP ' + res.statusCode + ': ' + data));
      });
    });
    req.on('error', reject);
    req.write(bodyText);
    req.end();
  });
}


window.ReviewAiPolish = {
  AI_SETTINGS_KEY: AI_SETTINGS_KEY,
  DEFAULT_AI_BASE_URL: DEFAULT_AI_BASE_URL,
  DEFAULT_AI_PROMPT: DEFAULT_AI_PROMPT,
  defaultAiSettings: defaultAiSettings,
  loadAiSettings: loadAiSettings,
  saveAiSettings: saveAiSettings,
  polishMarkerComments: polishMarkerComments,
  buildPolishRequest: buildPolishRequest,
  parsePolishResponse: parsePolishResponse,
  normalizeAiSettings: normalizeAiSettings
};

}());
