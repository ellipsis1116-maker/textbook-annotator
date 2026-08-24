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

  let raw = null;
  try {
    raw = await env.ANNOTATION_KV.get(getUnitDataKey(unit));
  } catch (error) {
    console.error('读取 ANNOTATION_KV 失败：', error);
    return json({ ok: false, error: '读取标注数据失败，请稍后重试。' }, { status: 500 });
  }
  let payload = { annotations: [] };
  if (raw !== null) {
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

  return new Response(new TextEncoder().encode(csvText), {
    status: 200,
    headers
  });
}