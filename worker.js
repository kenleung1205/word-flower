// word-flower — Cloudflare Worker
// 一個 Worker 做兩件事：派靜態網頁（env.ASSETS）+ 共享內容 API（D1）。
// 讀取公開；寫入要老師密碼（header X-Write-Key 對 env.WRITE_KEY）。

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function withCors(resp) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type, X-Write-Key');
  return new Response(resp.body, { status: resp.status, headers: h });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
function parse(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }));
    if (url.pathname.startsWith('/api/')) {
      try { return withCors(await handleApi(request, env, url)); }
      catch (e) { return withCors(json({ error: String((e && e.message) || e) }, 500)); }
    }
    // 其餘交俾靜態資源
    return env.ASSETS.fetch(request);
  },
};

function authorized(request, env) {
  const key = request.headers.get('X-Write-Key') || '';
  return Boolean(env.WRITE_KEY) && key === env.WRITE_KEY;
}

async function handleApi(request, env, url) {
  const p = url.pathname;
  const method = request.method;

  // ---- 讀：所有共享內容（公開）----
  if (method === 'GET' && p === '/api/content') {
    const [flowersRes, extraRes, exRes] = await Promise.all([
      env.DB.prepare('SELECT * FROM flowers').all(),
      env.DB.prepare('SELECT flower_id, petals FROM extra_petals').all(),
      env.DB.prepare('SELECT ch, words, sentences FROM examples').all(),
    ]);
    const flowers = (flowersRes.results || []).map((r) => ({
      id: r.id,
      base: r.base,
      color: r.color,
      petals: parse(r.petals, []),
      distractors: parse(r.distractors, []),
      custom: true,
      ...(r.mode === 'radical' ? { mode: 'radical' } : {}),
    }));
    const extra = {};
    for (const r of (extraRes.results || [])) {
      extra[r.flower_id] = [...(extra[r.flower_id] || []), ...parse(r.petals, [])];
    }
    const examples = {};
    for (const r of (exRes.results || [])) {
      examples[r.ch] = { words: parse(r.words, []), sentences: parse(r.sentences, []) };
    }
    return json({ flowers, extra, examples });
  }

  // ---- 以下要老師密碼 ----
  if (method === 'POST' || method === 'DELETE') {
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);
  }

  // 新增 / 覆寫自訂花
  if (method === 'POST' && p === '/api/flowers') {
    const f = await request.json();
    if (!f || !f.id || !f.base || !Array.isArray(f.petals)) return json({ error: 'bad request' }, 400);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO flowers (id, base, color, mode, petals, distractors, created_at) VALUES (?,?,?,?,?,?,?)'
    ).bind(
      f.id, f.base, f.color || null, f.mode || null,
      JSON.stringify(f.petals), JSON.stringify(f.distractors || []), Date.now()
    ).run();
    return json({ ok: true });
  }

  // 刪除自訂花（連佢後加嘅字）
  if (method === 'DELETE' && p.startsWith('/api/flowers/')) {
    const id = decodeURIComponent(p.slice('/api/flowers/'.length));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM flowers WHERE id = ?').bind(id),
      env.DB.prepare('DELETE FROM extra_petals WHERE flower_id = ?').bind(id),
    ]);
    return json({ ok: true });
  }

  // 為現有花加字
  if (method === 'POST' && p === '/api/petals') {
    const { flowerId, petals } = await request.json();
    if (!flowerId || !Array.isArray(petals) || !petals.length) return json({ error: 'bad request' }, 400);
    await env.DB.prepare('INSERT INTO extra_petals (flower_id, petals, created_at) VALUES (?,?,?)')
      .bind(flowerId, JSON.stringify(petals), Date.now()).run();
    return json({ ok: true });
  }

  // 例詞例句 upsert
  if (method === 'POST' && p === '/api/examples') {
    const { char, words, sentences } = await request.json();
    if (!char) return json({ error: 'bad request' }, 400);
    await env.DB.prepare(
      'INSERT OR REPLACE INTO examples (ch, words, sentences, updated_at) VALUES (?,?,?,?)'
    ).bind(char, JSON.stringify(words || []), JSON.stringify(sentences || []), Date.now()).run();
    return json({ ok: true });
  }

  return json({ error: 'not found' }, 404);
}
