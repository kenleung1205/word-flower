// 一次性遷移：把瀏覽器 localStorage 入面嘅自訂內容 upload 去 D1。
// 用法：開 https://word-flower.aigptken.workers.dev → 開 DevTools Console → 貼晒以下成段 → Enter。
// 先決條件：Worker 已設 WRITE_KEY secret；你會被要求輸入老師密碼（會記喺本機）。
// 注意：只跑一次。自訂花同例句係 upsert（重跑安全），但「後加字」(extra) 會每次再 append，重跑會整多份。
// 個人進度／測驗統計（wordFlowerDone / wordFlowerStats）係本機嘢，唔會 upload。
(async () => {
  const KEY = (localStorage.getItem('wordFlowerWriteKey') || prompt('老師密碼：') || '').trim();
  if (!KEY) return console.warn('冇密碼，取消。');
  localStorage.setItem('wordFlowerWriteKey', KEY);

  const post = async (path, body) => {
    const r = await fetch('/api' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Write-Key': KEY },
      body: JSON.stringify(body),
    });
    if (r.status === 401) throw new Error('老師密碼唔啱');
    if (!r.ok) throw new Error(path + ' → ' + r.status);
  };
  const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k) || fb); } catch { return JSON.parse(fb); } };

  const flowers = read('wordFlowerCustom', '[]');
  const extra = read('wordFlowerExtra', '{}');
  const examples = read('wordFlowerExamples', '{}');
  let n = 0;

  for (const f of flowers) {
    if (!f || !f.id || !f.base || !Array.isArray(f.petals)) continue;
    await post('/flowers', f); n++;
    console.log('花 ✓', f.base, '(' + f.id + ')');
  }
  for (const [flowerId, petals] of Object.entries(extra)) {
    if (Array.isArray(petals) && petals.length) { await post('/petals', { flowerId, petals }); n++; console.log('後加字 ✓', flowerId, petals.length); }
  }
  for (const [char, ex] of Object.entries(examples)) {
    await post('/examples', { char, words: (ex && ex.words) || [], sentences: (ex && ex.sentences) || [] }); n++;
    console.log('例句 ✓', char);
  }

  console.log(`✅ 完成，共 upload ${n} 項。Refresh 一下就會見到（人人都見到）。`);
})();
