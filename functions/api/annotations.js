import {
  getUnitDataKey,
  isValidUnit,
  normalizeAnnotations,
  summarizeAnnotations
} from '../_lib/common.js';

export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (!env?.ANNOTATION_KV) {
    return new Response(JSON.stringify({ ok: false, error: 'KV binding ANNOTATION_KV 不存在。' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  const url = new URL(request.url);
  const unit = Number(url.searchParams.get('unit') || '1');
  if (!isValidUnit(unit)) {
    return new Response(JSON.stringify({ ok: false, error: 'unit 参数无效（需为 1~8）。' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  const responseHeaders = { ...headers, 'Content-Type': 'application/json; charset=utf-8' };

  if (request.method === 'GET') {
    try {
      const raw = await env.ANNOTATION_KV.get(getUnitDataKey(unit));
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }
      const annotations = normalizeAnnotations(payload?.annotations);
      const summary = summarizeAnnotations(annotations);
      return new Response(JSON.stringify({
        ok: true,
        unit,
        exists: raw !== null && raw !== '',
        annotations,
        total: summary.total,
        byPen: summary.byPen,
        updatedAt: Number.isFinite(Number(payload?.updatedAt)) ? Number(payload.updatedAt) : null
      }), { status: 200, headers: responseHeaders });
    } catch (error) {
      console.error('读取 ANNOTATION_KV 失败：', error);
      return new Response(JSON.stringify({ ok: false, error: '读取标注数据失败，请稍后重试。' }), {
        status: 500,
        headers: responseHeaders
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const annotations = normalizeAnnotations(body?.annotations);
      const now = Date.now();
      await env.ANNOTATION_KV.put(getUnitDataKey(unit), JSON.stringify({ unit, annotations, updatedAt: now }));
      const summary = summarizeAnnotations(annotations);
      return new Response(JSON.stringify({ ok: true, unit, total: summary.total, byPen: summary.byPen, updatedAt: now }), {
        status: 200,
        headers: responseHeaders
      });
    } catch (error) {
      console.error('写入 ANNOTATION_KV 失败：', error);
      return new Response(JSON.stringify({ ok: false, error: '保存标注数据失败，请稍后重试。' }), {
        status: 500,
        headers: responseHeaders
      });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), {
    status: 405,
    headers: responseHeaders
  });
}