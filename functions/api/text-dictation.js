import {
  getTextDictationKey,
  normalizeGradeKey,
  normalizeUnitKey,
  requireKv
} from '../_lib/common.js';

function responseHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function normalizeRows(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => {
    const row = typeof item === 'object' && item ? item : {};
    return {
      id: String(row.id || crypto.randomUUID()),
      text: String(row.text || ''),
      zh: String(row.zh || ''),
      createdAt: Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : Date.now()
    };
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const headers = responseHeaders();
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const kvError = requireKv(env);
  if (kvError) return kvError;

  const url = new URL(request.url);
  const grade = normalizeGradeKey(url.searchParams.get('grade'));
  const unit = normalizeUnitKey(url.searchParams.get('unit'));
  if (!unit) {
    return new Response(JSON.stringify({ ok: false, error: 'unit 参数无效（需为 1~8 或 unit1~unit8）。' }), {
      status: 400,
      headers
    });
  }

  const kvKey = getTextDictationKey(grade, unit);
  if (!kvKey) {
    return new Response(JSON.stringify({ ok: false, error: '生成 KV Key 失败。' }), {
      status: 400,
      headers
    });
  }

  if (request.method === 'GET') {
    try {
      const raw = await env.ANNOTATION_KV.get(kvKey);
      let payload = null;
      if (raw) {
        try {
          payload = JSON.parse(raw);
        } catch {
          payload = null;
        }
      }
      const rows = normalizeRows(payload?.rows);
      return new Response(JSON.stringify({
        ok: true,
        grade,
        unit,
        key: kvKey,
        exists: raw !== null && raw !== '',
        rows,
        total: rows.length,
        updatedAt: Number.isFinite(Number(payload?.updatedAt)) ? Number(payload.updatedAt) : null
      }), {
        status: 200,
        headers
      });
    } catch (error) {
      console.error('读取 text_dictation 数据失败：', error);
      return new Response(JSON.stringify({ ok: false, error: '读取课文默写数据失败，请稍后重试。' }), {
        status: 500,
        headers
      });
    }
  }

  if (request.method === 'POST') {
    try {
      const body = await request.json();
      const bodyGrade = normalizeGradeKey(body?.grade || grade);
      const bodyUnit = normalizeUnitKey(body?.unit || unit);
      if (!bodyUnit) {
        return new Response(JSON.stringify({ ok: false, error: '请求体 unit 参数无效。' }), {
          status: 400,
          headers
        });
      }
      const bodyKey = getTextDictationKey(bodyGrade, bodyUnit);
      const rows = normalizeRows(body?.rows);
      const now = Date.now();
      await env.ANNOTATION_KV.put(bodyKey, JSON.stringify({
        grade: bodyGrade,
        unit: bodyUnit,
        key: bodyKey,
        rows,
        updatedAt: now
      }));

      return new Response(JSON.stringify({
        ok: true,
        grade: bodyGrade,
        unit: bodyUnit,
        key: bodyKey,
        total: rows.length,
        updatedAt: now
      }), {
        status: 200,
        headers
      });
    } catch (error) {
      console.error('写入 text_dictation 数据失败：', error);
      return new Response(JSON.stringify({ ok: false, error: '保存课文默写数据失败，请稍后重试。' }), {
        status: 500,
        headers
      });
    }
  }

  return new Response(JSON.stringify({ ok: false, error: 'Method Not Allowed' }), {
    status: 405,
    headers
  });
}