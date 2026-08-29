const UNIT_COUNT = 8;
export const UNIT_IDS = Array.from({ length: UNIT_COUNT }, (_, i) => i + 1);
export const UNIT_CSV_COLUMNS = [
  '类型',
  '序号',
  '英文',
  '中文'
];
export const CSV_SHARE_KEY_PREFIX = 'share:csv:';
export const CSV_PRINT_GRADE = 'G5';

export function csvShareKey(key) {
  return `${CSV_SHARE_KEY_PREFIX}${key}`;
}

export function newShareKey() {
  const arr = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < arr.length; i += 1) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function unitCsvTitle(unit) {
  return `${CSV_PRINT_GRADE.toUpperCase()} Unit ${Number(unit)}`;
}

export function corsHeaders(extra = {}) {
  const headers = new Headers(extra);
  if (!headers.has('Access-Control-Allow-Origin')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  if (!headers.has('Access-Control-Allow-Methods')) {
    headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (!headers.has('Access-Control-Allow-Headers')) {
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return headers;
}

export function json(data, init = {}) {
  const headers = corsHeaders(init.headers || {});
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export function isValidUnit(unit) {
  return Number.isInteger(unit) && unit >= 1 && unit <= UNIT_COUNT;
}

export function getUnitFromRequest(request) {
  const url = new URL(request.url);
  const unit = Number(url.searchParams.get('unit'));
  return isValidUnit(unit) ? unit : null;
}

export function getUnitDataKey(unit) {
  return `unit_${unit}_data`;
}

export function normalizeGradeKey(grade) {
  const raw = String(grade || '').trim().toLowerCase();
  const matched = raw.match(/^g\d+$/);
  if (matched) return matched[0];
  return 'g5';
}

export function normalizeUnitKey(unit) {
  const raw = String(unit || '').trim().toLowerCase();
  const fromNamed = raw.match(/^unit\s*(\d+)$/);
  const fromNumber = raw.match(/^\d+$/);
  const parsed = Number(fromNamed ? fromNamed[1] : fromNumber ? raw : NaN);
  if (!Number.isInteger(parsed) || !isValidUnit(parsed)) return null;
  return `unit${parsed}`;
}

export function getTextDictationKey(grade, unit) {
  const gradeKey = normalizeGradeKey(grade);
  const unitKey = normalizeUnitKey(unit);
  if (!unitKey) return null;
  return `${gradeKey}_text_dictation_${unitKey}`;
}

export function normalizeAnnotationRow(raw = {}) {
  const row = typeof raw === 'object' && raw ? raw : {};
  const rects = Array.isArray(row.rects) ? row.rects : [];
  return {
    id: String(row.id || crypto.randomUUID()),
    pen: String(row.pen || 'core_word'),
    pageNum: Number.isFinite(Number(row.pageNum)) ? Number(row.pageNum) : 1,
    text: String(row.text || ''),
    sourceText: String(row.sourceText || row.text || ''),
    zh: String(row.zh || ''),
    createdAt: Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : Date.now(),
    manualOrder: Number.isFinite(Number(row.manualOrder)) ? Number(row.manualOrder) : null,
    rects
  };
}

export function normalizeAnnotations(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => normalizeAnnotationRow(item));
}

export function summarizeAnnotations(annotations) {
  const rows = normalizeAnnotations(annotations);
  const byPen = {};
  for (const row of rows) {
    const penId = String(row.pen || '').trim();
    if (!penId) continue;
    byPen[penId] = (byPen[penId] || 0) + 1;
  }
  return {
    total: rows.length,
    byPen
  };
}

export function escapeCsvField(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function annotationsToCsvText(annotations) {
  const rows = normalizeAnnotations(annotations);
  const typeIndexes = {};
  const lines = [UNIT_CSV_COLUMNS.map((item) => escapeCsvField(item)).join(',')];
  for (const row of rows) {
    const type = String(row.pen || '');
    typeIndexes[type] = (typeIndexes[type] || 0) + 1;
    const cols = [
      type,
      typeIndexes[type],
      row.text,
      row.zh
    ];
    lines.push(cols.map((item) => escapeCsvField(item)).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function requireKv(env) {
  if (!env?.ANNOTATION_KV) {
    return json(
      {
        ok: false,
        error: 'KV binding ANNOTATION_KV 不存在，请在 Cloudflare Pages 项目中配置。'
      },
      { status: 500 }
    );
  }
  return null;
}