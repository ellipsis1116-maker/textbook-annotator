import {
  annotationsToCsvText,
  csvShareKey,
  getUnitDataKey,
  isValidUnit,
  json,
  newShareKey,
  normalizeAnnotations,
  requireKv,
  unitCsvTitle
} from '../_lib/common.js';

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

  // 以 KV 为唯一数据源：读取该单元最新 JSON 再转 CSV（= 保存动作）
  const raw = await env.ANNOTATION_KV.get(getUnitDataKey(unit));
  let annotations = [];
  if (raw) {
    try {
      annotations = normalizeAnnotations(JSON.parse(raw)?.annotations);
    } catch {
      annotations = [];
    }
  }

  const csvText = annotationsToCsvText(annotations);
  const key = newShareKey();
  const title = unitCsvTitle(unit);
  const createdAt = Date.now();

  // 持久写入 KV（非临时）
  await env.ANNOTATION_KV.put(
    csvShareKey(key),
    JSON.stringify({
      key,
      unit,
      title,
      annotations,
      csvText,
      createdAt
    })
  );

  return json({
    ok: true,
    key,
    unit,
    title,
    total: annotations.length,
    url: `/api/share-csv?key=${encodeURIComponent(key)}`
  });
}
