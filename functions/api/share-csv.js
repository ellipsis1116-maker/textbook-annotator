import {
  annotationsToCsvText,
  corsHeaders,
  csvShareKey,
  json,
  requireKv
} from '../_lib/common.js';

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const kvError = requireKv(env);
  if (kvError) return kvError;

  const url = new URL(request.url);
  const key = String(url.searchParams.get('key') || '').trim();
  if (!key) {
    return json({ ok: false, error: '缺少 key 参数。' }, { status: 400 });
  }

  const raw = await env.ANNOTATION_KV.get(csvShareKey(key));
  if (raw === null) {
    return json({ ok: false, error: '分享记录不存在或已失效。' }, { status: 404 });
  }

  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: '分享记录数据损坏。' }, { status: 500 });
  }

  const csvText = payload?.csvText || annotationsToCsvText(payload?.annotations || []);
  const title = String(payload?.title || '');

  // 供排版站跨域读取时可获取标题
  const format = url.searchParams.get('format');
  if (format === 'json') {
    return json({
      ok: true,
      key,
      unit: Number(payload?.unit) || 0,
      title,
      total: Array.isArray(payload?.annotations) ? payload.annotations.length : 0,
      csvText,
      createdAt: Number(payload?.createdAt) || null
    });
  }

  const headers = corsHeaders();
  headers.set('content-type', 'text/csv; charset=utf-8');
  headers.set('content-disposition', `attachment; filename="share-${key}.csv"`);
  headers.set('cache-control', 'no-store');
  headers.set('X-Csv-Title', encodeURIComponent(title));

  return new Response(csvText, {
    status: 200,
    headers
  });
}
