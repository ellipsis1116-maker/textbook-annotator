import {
  annotationsToCsvText,
  getUnitDataKey,
  getUnitFromRequest,
  json,
  normalizeAnnotations,
  requireKv
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
  let payload = { annotations: [] };
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { annotations: [] };
    }
  }
  const annotations = normalizeAnnotations(payload?.annotations);
  const csvText = annotationsToCsvText(annotations);

  const headers = new Headers();
  headers.set('content-type', 'text/csv; charset=utf-8');
  headers.set('content-disposition', `attachment; filename="unit${unit}.csv"`);
  headers.set('cache-control', 'no-store');

  return new Response(csvText, {
    status: 200,
    headers
  });
}