import {
  getUnitDataKey,
  getUnitFromRequest,
  isValidUnit,
  json,
  normalizeAnnotations,
  requireKv,
  summarizeAnnotations
} from '../_lib/common.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const kvError = requireKv(env);
  if (kvError) return kvError;

  const unit = getUnitFromRequest(request);
  if (!unit) {
    return json({ ok: false, error: 'unit 参数无效（需为 1~8）。' }, { status: 400 });
  }

  const raw = await env.ANNOTATION_KV.get(getUnitDataKey(unit));
  if (raw === null) {
    return json({
      ok: true,
      unit,
      exists: false,
      annotations: [],
      total: 0,
      byPen: {},
      updatedAt: null
    });
  }

  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  const annotations = normalizeAnnotations(payload?.annotations);
  const summary = summarizeAnnotations(annotations);
  return json({
    ok: true,
    unit,
    exists: true,
    annotations,
    total: summary.total,
    byPen: summary.byPen,
    updatedAt: Number.isFinite(Number(payload?.updatedAt)) ? Number(payload.updatedAt) : null
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const kvError = requireKv(env);
  if (kvError) return kvError;

  let body = null;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '请求体必须为 JSON。' }, { status: 400 });
  }

  const unit = Number(body?.unit);
  if (!isValidUnit(unit)) {
    return json({ ok: false, error: 'unit 参数无效（需为 1~8）。' }, { status: 400 });
  }

  const annotations = normalizeAnnotations(body?.annotations);
  const summary = summarizeAnnotations(annotations);
  const now = Date.now();
  await env.ANNOTATION_KV.put(
    getUnitDataKey(unit),
    JSON.stringify({
      unit,
      annotations,
      updatedAt: now
    })
  );

  return json({
    ok: true,
    unit,
    total: summary.total,
    byPen: summary.byPen,
    updatedAt: now
  });
}