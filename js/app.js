// 字族開花 — 主程式
const STORAGE_KEY = 'wordFlowerDone';
const CUSTOM_KEY = 'wordFlowerCustom';
const EXTRA_KEY = 'wordFlowerExtra';     // 為現有的花後加的花瓣 { [familyId]: [petal,...] }
const EXAMPLES_KEY = 'wordFlowerExamples'; // 老師加嘅例詞例句 { [char]: {words:[], sentences:[]} }
const STATS_KEY = 'wordFlowerStats';       // 測驗統計

const $ = (sel) => document.querySelector(sel);
const screens = {
  garden: $('#screen-garden'),
  game: $('#screen-game'),
  book: $('#screen-book'),
  quiz: $('#screen-quiz'),
  add: $('#screen-add'),
};

let current = null;       // 目前嘅花
let filled = new Set();   // 今朵花已拼好嘅字
let busy = false;         // 合成動畫進行中，暫停拖放判定
let gardenMode = 'family'; // 'family' = 字族開花；'radical' = 部首開花

// ---------- 進度 ----------
function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveDone(done) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
}

// 自訂字族（「➕ 加字」頁面整嘅花）
function loadCustom() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); }
  catch { return []; }
}
function saveCustom(list) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

// 後加花瓣（任何一朵花都可以加，不限數目）
function loadExtra() {
  try { return JSON.parse(localStorage.getItem(EXTRA_KEY) || '{}'); }
  catch { return {}; }
}
function saveExtra(map) {
  localStorage.setItem(EXTRA_KEY, JSON.stringify(map));
}
function withExtra(f, extra) {
  const ex = extra[f.id];
  return ex && ex.length ? { ...f, petals: [...f.petals, ...ex] } : f;
}
function getFamilies() {
  const extra = loadExtra();
  return [...FAMILIES, ...loadCustom()].map(f => withExtra(f, extra));
}
function getFamily(id) {
  return getFamilies().find(f => f.id === id) || null;
}

// ---------- 部首為主嘅花 ----------
// 把字族資料反轉：花心 = 部首，拖「聲旁」砌字；再同手寫嘅 RADICAL_FAMILIES 合併。
const RADICAL_COLORS = ['#4dabf7', '#f783ac', '#51cf66', '#ffa94d', '#b197fc', '#ff8787', '#3bc9db'];
function getRadicalFamilies() {
  // 1. 由現有字族倒推：每個部首收集所有用到佢嘅字
  const map = new Map(); // radical -> petals[{radical:聲旁, char, word, emoji}]
  getFamilies().forEach((f) => {
    f.petals.forEach((p) => {
      if (!map.has(p.radical)) map.set(p.radical, []);
      map.get(p.radical).push({ radical: f.base, char: p.char, word: p.word, emoji: p.emoji });
    });
  });

  // 2. 同手寫嘅部首花合併（手寫優先，再補返倒推到嘅字，按 char 去重）
  const authored = new Map(RADICAL_FAMILIES.map(rf => [rf.base, rf]));
  const result = [];
  const seen = new Set();

  RADICAL_FAMILIES.forEach((rf) => {
    const petals = [...rf.petals];
    const have = new Set(petals.map(p => p.char));
    (map.get(rf.base) || []).forEach(p => { if (!have.has(p.char)) { petals.push(p); have.add(p.char); } });
    result.push({ ...rf, petals });
    seen.add(rf.base);
  });

  // 3. 淨係倒推到、又夠字（≥2）嘅部首，自動整一朵花
  let ci = 0;
  for (const [radical, petals] of map) {
    if (seen.has(radical) || petals.length < 2) continue;
    // char 去重
    const uniq = [];
    const have = new Set();
    petals.forEach(p => { if (!have.has(p.char)) { uniq.push(p); have.add(p.char); } });
    result.push({
      id: 'rad-' + radical,
      base: radical,
      color: RADICAL_COLORS[ci++ % RADICAL_COLORS.length],
      mode: 'radical',
      petals: uniq,
      distractors: [],
    });
  }
  return result;
}

// 按目前模式攞花列表
function flowersForMode(mode) {
  return mode === 'radical' ? getRadicalFamilies() : getFamilies();
}
function getAllFlowers() {
  return [...getFamilies(), ...getRadicalFamilies()];
}
function findFlower(id) {
  return getAllFlowers().find(f => f.id === id) || null;
}

// ---------- 例詞 / 例句 ----------
function loadExamples() {
  try { return JSON.parse(localStorage.getItem(EXAMPLES_KEY) || '{}'); }
  catch { return {}; }
}
function saveExamples(map) {
  localStorage.setItem(EXAMPLES_KEY, JSON.stringify(map));
}

// ---------- 測驗統計 ----------
function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
    return { char: s.char || {}, radical: s.radical || {}, quizzes: s.quizzes || 0 };
  } catch { return { char: {}, radical: {}, quizzes: 0 }; }
}
function saveStats(s) {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}
function recordAnswer(kind, key, correct) {
  const s = loadStats();
  const bucket = s[kind];
  if (!bucket[key]) bucket[key] = { right: 0, wrong: 0 };
  bucket[key][correct ? 'right' : 'wrong']++;
  saveStats(s);
}

// ---------- 畫面切換 ----------
function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  $('#nav-garden').classList.toggle('active', name === 'garden' || name === 'game');
  $('#nav-book').classList.toggle('active', name === 'book');
  $('#nav-quiz').classList.toggle('active', name === 'quiz');
  $('#nav-add').classList.toggle('active', name === 'add');
  if (name === 'garden') renderGarden();
  if (name === 'book') renderBook();
  if (name === 'quiz') openQuizMenu();
}

$('#nav-garden').addEventListener('click', () => show('garden'));
$('#nav-book').addEventListener('click', () => show('book'));
$('#nav-quiz').addEventListener('click', () => show('quiz'));
$('#nav-add').addEventListener('click', () => openAddNew());
$('#btn-back').addEventListener('click', () => show('garden'));

// 花園模式切換：字族 / 部首
function setGardenMode(mode) {
  gardenMode = mode;
  $('#mode-family').classList.toggle('active', mode === 'family');
  $('#mode-radical').classList.toggle('active', mode === 'radical');
  $('#garden-hint').textContent = mode === 'radical'
    ? '揀一個部首，拖「聲旁」砌字，睇下部首點樣表意！'
    : '揀一朵花蕾，幫佢開花啦！';
  renderGarden();
}
$('#mode-family').addEventListener('click', () => setGardenMode('family'));
$('#mode-radical').addEventListener('click', () => setGardenMode('radical'));

// ---------- 花園（選關） ----------
function renderGarden() {
  const done = loadDone();
  const grid = $('#garden-grid');
  grid.innerHTML = '';
  flowersForMode(gardenMode).forEach((f) => {
    const card = document.createElement('div');
    card.className = 'flower-card' + (done.has(f.id) ? ' done' : '');
    card.innerHTML = `
      <div class="bud">${done.has(f.id) ? '🌸' : '🌱'}</div>
      <div class="base" style="color:${f.color}">${f.base}</div>
      <div class="chars">${done.has(f.id) ? f.petals.map(p => p.char).join('') : ''}</div>
      <div class="status">${done.has(f.id) ? '已開花！再玩一次？' : '輕按開始'}</div>`;
    card.addEventListener('click', () => startGame(f));

    // 加花瓣 / 刪除 淨係喺字族模式先有（部首花係自動由字族砌出嚟）
    if (gardenMode === 'family') {
      const addP = document.createElement('button');
      addP.className = 'add-petal-btn';
      addP.textContent = '＋';
      addP.title = '加多塊花瓣';
      addP.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddPetals(f.id);
      });
      card.appendChild(addP);
    }

    if (gardenMode === 'family' && f.custom) {
      const del = document.createElement('button');
      del.className = 'del-btn';
      del.textContent = '✕';
      del.title = '刪除呢朵花';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!confirm(`刪除「${f.base}」字族花？`)) return;
        saveCustom(loadCustom().filter(c => c.id !== f.id));
        const d = loadDone();
        d.delete(f.id);
        saveDone(d);
        renderGarden();
      });
      card.appendChild(del);
    }
    grid.appendChild(card);
  });
}

// ---------- 魔法圖鑑 ----------
function renderBook() {
  const done = loadDone();
  const flowers = getAllFlowers();
  const doneCount = flowers.filter(f => done.has(f.id)).length;
  $('#book-hint').textContent = `你已經種出 ${doneCount} / ${flowers.length} 朵花！㩒一㩒學過嘅字，睇例詞例句。`;
  const grid = $('#book-grid');
  grid.innerHTML = '';
  flowers.forEach((f) => {
    const got = done.has(f.id);
    const card = document.createElement('div');
    card.className = 'flower-card' + (got ? ' done' : ' locked-look');
    const label = f.mode === 'radical' ? '部首' : '字族';
    card.innerHTML = `
      <div class="bud">${got ? '🌸' : '❔'}</div>
      <div class="base" style="color:${f.color}">${f.base}<small style="font-size:.5em;color:#aaa"> ${label}</small></div>
      <div class="chars"></div>
      <div class="book-words">${got ? f.petals.map(p => p.word).join('・') : '快啲去種呢朵花啦！'}</div>`;
    const charsEl = card.querySelector('.chars');
    if (got) {
      // 每個字做一個可㩒嘅 span → 開例詞例句
      f.petals.forEach((p) => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = p.char;
        span.addEventListener('click', (e) => { e.stopPropagation(); openExamples(p.char); });
        charsEl.appendChild(span);
      });
    } else {
      charsEl.textContent = '？？？？';
      card.addEventListener('click', () => startGame(f));
    }
    grid.appendChild(card);
  });
}

// ---------- 開始一朵花 ----------
function startGame(family) {
  current = family;
  filled = new Set();
  busy = false;
  $('#base-char').textContent = family.base;
  $('#game-hint').textContent = family.mode === 'radical'
    ? '將「聲旁」積木拖去部首花心啦！'
    : '將部首積木拖去花心啦！';
  buildPetals();
  buildTray();
  show('game');
}

function petalAngle(i, n) {
  return -90 + (360 / n) * i; // 由正上方開始平均分佈
}

function buildPetals() {
  const wrap = $('#petals');
  wrap.innerHTML = '';
  const n = current.petals.length;
  current.petals.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'petal';
    el.dataset.char = p.char;
    const angle = petalAngle(i, n);
    // 花瓣推離花心，並保持文字正向
    el.style.transform = `rotate(${angle}deg) translate(110%) rotate(${-angle}deg)`;
    wrap.appendChild(el);
  });
}

function buildTray() {
  const tray = $('#tray');
  tray.innerHTML = '';
  const TILE_COLORS = ['#ff8fab', '#74c0fc', '#ffd43b', '#8ce99a', '#b197fc', '#ffa94d', '#63e6be'];
  const petalRadicals = current.petals.map(p => p.radical);
  const used = new Set(petalRadicals);
  const distractors = (current.distractors || []).filter(r => !used.has(r));
  const radicals = [...petalRadicals, ...distractors];
  radicals.sort(() => Math.random() - 0.5);
  radicals.forEach((r, i) => {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.textContent = r;
    tile.dataset.radical = r;
    tile.style.background = TILE_COLORS[i % TILE_COLORS.length];
    tile.addEventListener('pointerdown', onDragStart);
    tray.appendChild(tile);
  });
}

// ---------- 拖曳 ----------
function onDragStart(e) {
  if (busy) return;
  const tile = e.currentTarget;
  if (tile.classList.contains('gone')) return;
  e.preventDefault();

  const ghost = document.createElement('div');
  ghost.className = 'tile-ghost';
  ghost.textContent = tile.dataset.radical;
  ghost.style.background = tile.style.background;
  ghost.style.left = e.clientX + 'px';
  ghost.style.top = e.clientY + 'px';
  document.body.appendChild(ghost);
  tile.classList.add('dragging');

  const center = $('#flower-center');

  function nearCenter(x, y) {
    const r = center.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy) < r.width * 1.1;
  }

  function onMove(ev) {
    ghost.style.left = ev.clientX + 'px';
    ghost.style.top = ev.clientY + 'px';
    center.classList.toggle('glow', nearCenter(ev.clientX, ev.clientY));
  }

  function onUp(ev) {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    center.classList.remove('glow');
    tile.classList.remove('dragging');

    if (ev.type !== 'pointercancel' && nearCenter(ev.clientX, ev.clientY)) {
      tryCombine(tile, ghost);
    } else {
      returnGhost(tile, ghost, false);
    }
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

// 積木放手後飛返原位（拼錯就加震動 + buzz）
function returnGhost(tile, ghost, wrong) {
  const r = tile.getBoundingClientRect();
  ghost.classList.add('returning');
  requestAnimationFrame(() => {
    ghost.style.left = r.left + r.width / 2 + 'px';
    ghost.style.top = r.top + r.height / 2 + 'px';
  });
  if (wrong) {
    SFX.buzz();
    const flower = $('#flower');
    flower.classList.add('shake');
    flower.addEventListener('animationend', () => flower.classList.remove('shake'), { once: true });
    $('#game-hint').textContent = '唔啱呀，試下另一塊積木！';
  }
  setTimeout(() => ghost.remove(), 350);
}

// ---------- 合成 ----------
function tryCombine(tile, ghost) {
  const radical = tile.dataset.radical;
  const match = current.petals.find(p => p.radical === radical && !filled.has(p.char));
  if (!match) {
    returnGhost(tile, ghost, true);
    return;
  }

  busy = true;
  ghost.remove();
  tile.classList.add('gone');

  const centerRect = $('#flower-center').getBoundingClientRect();
  const cx = centerRect.left + centerRect.width / 2;
  const cy = centerRect.top + centerRect.height / 2;

  // 1. 「嘭」一聲結合
  SFX.bang();
  const bang = document.createElement('div');
  bang.className = 'bang';
  bang.textContent = '嘭！';
  bang.style.left = cx + 'px';
  bang.style.top = cy + 'px';
  document.body.appendChild(bang);
  setTimeout(() => bang.remove(), 650);

  // 2. 合成字喺花心彈出
  const big = document.createElement('div');
  big.className = 'combined-char';
  big.textContent = match.char;
  big.style.left = cx + 'px';
  big.style.top = cy + 'px';
  document.body.appendChild(big);

  // 3. 「叮！」+ 粵語讀字
  setTimeout(() => {
    SFX.ding();
    // 部首模式：花心係部首，要讀花心嘅部首名；字族模式：讀拖入嘅部首
    const radChar = current.mode === 'radical' ? current.base : match.radical;
    const radName = RADICAL_NAMES[radChar] || `${radChar}字旁`;
    speak(`${match.char}！${radName}嘅${match.char}，${match.word}嘅${match.char}！`);
  }, 350);

  // 4. emoji 小動畫彈出
  setTimeout(() => {
    const emo = document.createElement('div');
    emo.className = 'emoji-pop';
    emo.textContent = match.emoji;
    emo.style.left = cx + 'px';
    emo.style.top = (cy - centerRect.height) + 'px';
    document.body.appendChild(emo);
    setTimeout(() => emo.remove(), 1600);
  }, 400);

  // 5. 個字飛去花瓣
  const petal = [...document.querySelectorAll('.petal')].find(p => p.dataset.char === match.char);
  setTimeout(() => {
    const pr = petal.getBoundingClientRect();
    big.style.left = pr.left + pr.width / 2 + 'px';
    big.style.top = pr.top + pr.height / 2 + 'px';
    big.style.fontSize = '2.2rem';
    big.style.color = '#fff';
  }, 900);

  setTimeout(() => {
    big.remove();
    petal.textContent = match.char;
    petal.style.background = current.color;
    petal.classList.add('filled');
    petal.style.cursor = 'pointer';
    petal.title = '㩒入去睇例詞例句';
    petal.addEventListener('click', () => openExamples(match.char));
    filled.add(match.char);
    $('#game-hint').textContent = `${match.char} — ${match.word} ${match.emoji}（㩒個字睇例句）`;
    busy = false;
    if (filled.size === current.petals.length) flowerComplete();
  }, 1650);
}

// ---------- 開晒花！ ----------
function flowerComplete() {
  const done = loadDone();
  done.add(current.id);
  saveDone(done);

  setTimeout(() => {
    SFX.fireworks();
    launchFireworks(3000);
    const kind = current.mode === 'radical' ? '部首' : '字族';
    const name = current.mode === 'radical' ? (RADICAL_NAMES[current.base] || current.base) : current.base;
    speak(`好叻呀！${name}${kind}花開晒喇！`);
    $('#celebrate-title').textContent = `「${current.base}」${kind}花開晒喇！`;
    $('#celebrate-words').textContent = current.petals.map(p => `${p.char} ${p.word}`).join('　');
    const list = flowersForMode(current.mode === 'radical' ? 'radical' : 'family');
    const idx = list.findIndex(f => f.id === current.id);
    $('#btn-next').textContent = idx < list.length - 1 ? '下一朵花 ➜' : '🌱 返回花園';
    $('#celebrate').classList.remove('hidden');
  }, 600);
}

$('#btn-next').addEventListener('click', () => {
  $('#celebrate').classList.add('hidden');
  const list = flowersForMode(current && current.mode === 'radical' ? 'radical' : 'family');
  const idx = list.findIndex(f => f.id === current.id);
  if (idx >= 0 && idx < list.length - 1) startGame(list[idx + 1]);
  else show('garden');
});
$('#btn-book').addEventListener('click', () => {
  $('#celebrate').classList.add('hidden');
  show('book');
});

// ---------- 煙花 ----------
function launchFireworks(duration) {
  const canvas = $('#fireworks');
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const parts = [];
  const colors = ['#ff5d5d', '#ffd166', '#74c0fc', '#8ce99a', '#b197fc', '#ff8fab'];
  const end = Date.now() + duration;

  function burst() {
    const x = canvas.width * (0.2 + Math.random() * 0.6);
    const y = canvas.height * (0.15 + Math.random() * 0.4);
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < 36; i++) {
      const a = (Math.PI * 2 * i) / 36;
      const sp = 2 + Math.random() * 3.5;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 70, color });
    }
  }

  const burstTimer = setInterval(() => { if (Date.now() < end) burst(); }, 450);
  burst();

  (function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life--;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (parts.length || Date.now() < end) requestAnimationFrame(frame);
    else { clearInterval(burstTimer); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  })();
}

// ---------- 重設進度 ----------
$('#btn-reset').addEventListener('click', () => {
  if (!confirm('確定要重設？所有花會變返花蕾，可以重新再玩。\n（自訂嘅字族花唔會刪除）')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderBook();
});

// ---------- 自訂字族 / 加花瓣 ----------
const CUSTOM_COLORS = ['#e8590c', '#1098ad', '#9c36b5', '#2f9e44', '#e64980', '#5f3dc4'];

let editingId = null; // null = 整新花；否則 = 為呢朵現有花加花瓣

function makeRow(values = {}) {
  const row = document.createElement('div');
  row.className = 'add-row';
  row.innerHTML = `
    <input class="in-radical" maxlength="2" placeholder="氵" value="${values.radical || ''}" />
    <input class="in-char" maxlength="1" placeholder="清" value="${values.char || ''}" />
    <input class="in-word" maxlength="4" placeholder="清水" value="${values.word || ''}" />
    <input class="in-emoji" maxlength="2" placeholder="💧" value="${values.emoji || ''}" />
    <button class="row-del" title="刪除呢行">✕</button>`;
  row.querySelector('.row-del').addEventListener('click', () => {
    if ($('#add-rows').children.length > 1) row.remove();
  });
  return row;
}

function resetRows(n = 3) {
  const rows = $('#add-rows');
  rows.innerHTML = '';
  for (let i = 0; i < n; i++) rows.appendChild(makeRow());
}

// 整一朵全新嘅花
function openAddNew() {
  editingId = null;
  $('#add-hint').textContent = '自己種一朵新嘅字族花！輸入花心字，再加花瓣（部首 + 新字）。';
  const base = $('#add-base');
  base.value = '';
  base.disabled = false;
  $('#add-existing').classList.add('hidden');
  $('#add-existing').innerHTML = '';
  $('#btn-save-family').textContent = '💾 儲存呢朵花';
  resetRows(3);
  show('add');
}

// 為現有嘅花加多啲花瓣
function openAddPetals(id) {
  const family = getFamily(id);
  if (!family) return;
  editingId = id;
  $('#add-hint').textContent = `為「${family.base}」字族花加多啲花瓣！部首唔可以同已有嘅重複。`;
  const base = $('#add-base');
  base.value = family.base;
  base.disabled = true;
  const existing = $('#add-existing');
  existing.classList.remove('hidden');
  existing.innerHTML = '已有：' +
    family.petals.map(p => `<span class="chip">${p.radical}→${p.char}</span>`).join('');
  $('#btn-save-family').textContent = '💾 加落呢朵花';
  resetRows(2);
  show('add');
}

$('#btn-add-row').addEventListener('click', () => {
  $('#add-rows').appendChild(makeRow());
});

// 由表單收集花瓣；error 回傳字串，成功回傳陣列
function collectPetals() {
  const petals = [];
  for (const row of $('#add-rows').children) {
    const radical = row.querySelector('.in-radical').value.trim();
    const char = row.querySelector('.in-char').value.trim();
    if (!radical && !char) continue; // 空行跳過
    if (!radical || !char) return '每塊花瓣都要有「部首」同「新字」呀！';
    petals.push({
      radical,
      char,
      word: row.querySelector('.in-word').value.trim() || char,
      emoji: row.querySelector('.in-emoji').value.trim() || '🌟',
    });
  }
  return petals;
}

$('#btn-save-family').addEventListener('click', () => {
  if (editingId) return savePetalsToExisting();
  saveNewFamily();
});

function saveNewFamily() {
  const base = $('#add-base').value.trim();
  if (!base) { alert('要填花心字呀！'); return; }

  const petals = collectPetals();
  if (typeof petals === 'string') { alert(petals); return; }
  if (petals.length < 2) { alert('至少要兩塊花瓣先開到花呀！'); return; }
  if (new Set(petals.map(p => p.radical)).size !== petals.length) {
    alert('每塊花瓣嘅部首唔可以重複呀！');
    return;
  }

  const custom = loadCustom();
  const family = {
    id: 'custom-' + Date.now(),
    base,
    color: CUSTOM_COLORS[custom.length % CUSTOM_COLORS.length],
    petals,
    distractors: [],
    custom: true,
  };
  custom.push(family);
  saveCustom(custom);

  $('#add-base').value = '';
  resetRows(3);
  startGame(family);
}

function savePetalsToExisting() {
  const family = getFamily(editingId);
  if (!family) { openAddNew(); return; }

  const petals = collectPetals();
  if (typeof petals === 'string') { alert(petals); return; }
  if (petals.length < 1) { alert('填至少一塊新花瓣先得呀！'); return; }

  // 部首唔可以同呢朵花已有嘅、或者新加嘅重複
  const existingRadicals = new Set(family.petals.map(p => p.radical));
  const newRadicals = new Set();
  for (const p of petals) {
    if (existingRadicals.has(p.radical) || newRadicals.has(p.radical)) {
      alert(`部首「${p.radical}」喺呢朵花已經有喇，唔可以重複！`);
      return;
    }
    newRadicals.add(p.radical);
  }

  const extra = loadExtra();
  extra[editingId] = [...(extra[editingId] || []), ...petals];
  saveExtra(extra);

  // 加咗新花瓣，等佢可以重新開花
  const done = loadDone();
  done.delete(editingId);
  saveDone(done);

  startGame(getFamily(editingId));
}

// ---------- 例詞 / 例句彈窗 ----------
let exChar = null;

function openExamples(char) {
  exChar = char;
  const data = loadExamples()[char] || { words: [], sentences: [] };
  $('#ex-char').textContent = char;
  renderExList('#ex-words', data.words);
  renderExList('#ex-sentences', data.sentences);
  $('#ex-words-input').value = (data.words || []).join('\n');
  $('#ex-sentences-input').value = (data.sentences || []).join('\n');
  $('#ex-edit-area').classList.add('hidden');
  $('#examples-modal').classList.remove('hidden');
}

function renderExList(sel, items) {
  const box = $(sel);
  box.innerHTML = '';
  if (!items || items.length === 0) {
    const none = document.createElement('div');
    none.className = 'none';
    none.textContent = '（未有，㩒下面「編輯」加返）';
    box.appendChild(none);
    return;
  }
  items.forEach((t) => {
    const it = document.createElement('div');
    it.className = 'item';
    it.textContent = t;
    it.title = '㩒一㩒讀出嚟';
    it.addEventListener('click', () => speak(t));
    box.appendChild(it);
  });
}

$('#ex-close').addEventListener('click', () => $('#examples-modal').classList.add('hidden'));
$('#examples-modal').addEventListener('click', (e) => {
  if (e.target.id === 'examples-modal') $('#examples-modal').classList.add('hidden');
});
$('#ex-edit').addEventListener('click', () => $('#ex-edit-area').classList.toggle('hidden'));
$('#ex-save').addEventListener('click', () => {
  if (!exChar) return;
  const parse = (v) => v.split('\n').map(s => s.trim()).filter(Boolean);
  const map = loadExamples();
  map[exChar] = {
    words: parse($('#ex-words-input').value),
    sentences: parse($('#ex-sentences-input').value),
  };
  saveExamples(map);
  openExamples(exChar); // 重新渲染
});

// ---------- 測驗 ----------
const QUIZ_LEN = 8;
let quiz = null; // { type, questions:[], idx, score }

function openQuizMenu() {
  $('#quiz-menu').classList.remove('hidden');
  $('#quiz-play').classList.add('hidden');
  $('#quiz-result').classList.add('hidden');
}

document.querySelectorAll('.quiz-type-btn').forEach((btn) => {
  btn.addEventListener('click', () => startQuiz(btn.dataset.type));
});
$('#btn-quiz-again').addEventListener('click', () => startQuiz(quiz && quiz.type));
$('#btn-quiz-menu').addEventListener('click', openQuizMenu);

function shuffle(arr) { return arr.slice().sort(() => Math.random() - 0.5); }
function sample(arr, n) { return shuffle(arr).slice(0, n); }

// 所有學過/可考嘅字（兩個模式嘅花瓣合埋，按字去重）
function allChars() {
  const seen = new Map();
  getAllFlowers().forEach(f => f.petals.forEach(p => { if (!seen.has(p.char)) seen.set(p.char, p); }));
  return [...seen.values()];
}

function startQuiz(type) {
  if (!type) return;
  const questions = type === 'word' ? buildWordQuiz() : buildRadicalQuiz();
  if (!questions || questions.length === 0) {
    alert('暫時未夠資料出題，先去種多幾朵花啦！');
    return;
  }
  quiz = { type, questions, idx: 0, score: 0 };
  $('#quiz-menu').classList.add('hidden');
  $('#quiz-result').classList.add('hidden');
  $('#quiz-play').classList.remove('hidden');
  renderQuestion();
}

// 聽詞揀字
function buildWordQuiz() {
  const pool = allChars().filter(p => p.word);
  if (pool.length < 4) return [];
  return sample(pool, Math.min(QUIZ_LEN, pool.length)).map((p) => {
    const wrong = sample(pool.filter(q => q.char !== p.char), 3).map(q => q.char);
    return {
      kind: 'char',
      key: p.char,
      prompt: { word: p.word },
      answer: p.char,
      options: shuffle([p.char, ...wrong]),
    };
  });
}

// 部首配意思
function buildRadicalQuiz() {
  const present = new Set();
  getFamilies().forEach(f => f.petals.forEach(p => present.add(p.radical)));
  getRadicalFamilies().forEach(f => present.add(f.base));
  const radicals = [...present].filter(r => RADICAL_MEANING[r]);
  if (radicals.length < 4) return [];
  return sample(radicals, Math.min(QUIZ_LEN, radicals.length)).map((r) => {
    const wrong = sample(radicals.filter(x => x !== r), 3).map(x => RADICAL_MEANING[x]);
    return {
      kind: 'radical',
      key: r,
      prompt: { radical: r },
      answer: RADICAL_MEANING[r],
      options: shuffle([RADICAL_MEANING[r], ...wrong]),
    };
  });
}

function renderQuestion() {
  const q = quiz.questions[quiz.idx];
  $('#quiz-progress').textContent = `第 ${quiz.idx + 1} / ${quiz.questions.length} 題　・　分數 ${quiz.score}`;
  $('#quiz-feedback').textContent = '';

  const qBox = $('#quiz-question');
  if (q.kind === 'char') {
    qBox.innerHTML = `聽下，撳啱嘅字：<button class="quiz-replay" id="quiz-replay">🔊 再聽一次</button>`;
    $('#quiz-replay').addEventListener('click', () => speak(q.prompt.word));
    speak(q.prompt.word);
  } else {
    qBox.innerHTML = `<span class="big">${q.prompt.radical}</span>呢個部首同咩有關？`;
  }

  const optBox = $('#quiz-options');
  optBox.innerHTML = '';
  q.options.forEach((opt) => {
    const b = document.createElement('button');
    b.className = 'quiz-opt';
    b.textContent = opt;
    b.addEventListener('click', () => answerQuestion(b, opt, q));
    optBox.appendChild(b);
  });
}

function answerQuestion(btn, opt, q) {
  const buttons = [...$('#quiz-options').children];
  buttons.forEach(b => { b.disabled = true; });
  const correct = opt === q.answer;
  recordAnswer(q.kind, q.key, correct);

  if (correct) {
    btn.classList.add('correct');
    quiz.score++;
    SFX.ding();
    $('#quiz-feedback').textContent = '叮！啱晒！👍';
    if (q.kind === 'char') speak(q.answer);
  } else {
    btn.classList.add('wrong');
    buttons.find(b => b.textContent === q.answer)?.classList.add('correct');
    SFX.buzz();
    $('#quiz-feedback').textContent = q.kind === 'char'
      ? `應該係「${q.answer}」呀！`
      : `「${q.key}」${q.answer}。`;
  }

  setTimeout(() => {
    quiz.idx++;
    if (quiz.idx < quiz.questions.length) renderQuestion();
    else finishQuiz();
  }, correct ? 900 : 1600);
}

function finishQuiz() {
  const s = loadStats();
  s.quizzes++;
  saveStats(s);
  $('#quiz-play').classList.add('hidden');
  $('#quiz-result').classList.remove('hidden');
  const total = quiz.questions.length;
  const pct = Math.round((quiz.score / total) * 100);
  const face = pct >= 80 ? '🏆' : pct >= 50 ? '😊' : '💪';
  $('#quiz-score').innerHTML = `${face}<br>你答啱咗 ${quiz.score} / ${total} 題<br>（${pct} 分）`;
  if (pct >= 80) { SFX.fireworks(); launchFireworks(2000); }
  speak(pct >= 80 ? '好叻呀！' : '繼續努力！');
}

// ---------- 老師報告 ----------
$('#btn-report-toggle').addEventListener('click', () => {
  const panel = $('#report-panel');
  const showing = panel.classList.toggle('hidden');
  if (!showing) renderReport();
});
$('#btn-reset-stats').addEventListener('click', () => {
  if (!confirm('清除所有測驗紀錄？（開花進度唔受影響）')) return;
  localStorage.removeItem(STATS_KEY);
  renderReport();
});

function renderReport() {
  const done = loadDone();
  const flowers = getAllFlowers();
  const learnedChars = new Set();
  flowers.forEach(f => { if (done.has(f.id)) f.petals.forEach(p => learnedChars.add(p.char)); });

  const stats = loadStats();
  const sum = (bucket) => Object.values(bucket).reduce((a, x) => ({ right: a.right + x.right, wrong: a.wrong + x.wrong }), { right: 0, wrong: 0 });
  const charT = sum(stats.char);
  const radT = sum(stats.radical);
  const totalRight = charT.right + radT.right;
  const totalAns = totalRight + charT.wrong + radT.wrong;
  const acc = totalAns ? Math.round((totalRight / totalAns) * 100) : 0;

  const topWrong = (bucket) => Object.entries(bucket)
    .filter(([, v]) => v.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)
    .slice(0, 5);

  const wrongChars = topWrong(stats.char);
  const wrongRads = topWrong(stats.radical);

  const listHtml = (entries, suffix) => entries.length
    ? `<ul class="report-list">${entries.map(([k, v]) => `<li>${k}${suffix || ''}　錯 ${v.wrong} 次（啱 ${v.right}）</li>`).join('')}</ul>`
    : `<div class="report-empty">未有錯題 🎉</div>`;

  $('#report-content').innerHTML = `
    <h3>📊 學習報告</h3>
    <div class="report-stat"><span>已開花</span><span class="v">${flowers.filter(f => done.has(f.id)).length} / ${flowers.length} 朵</span></div>
    <div class="report-stat"><span>學過嘅字</span><span class="v">${learnedChars.size} 個</span></div>
    <div class="report-stat"><span>測驗次數</span><span class="v">${stats.quizzes} 次</span></div>
    <div class="report-stat"><span>測驗總正確率</span><span class="v">${totalAns ? acc + '%' : '—'}（${totalRight}/${totalAns}）</span></div>
    <h3 style="margin-top:14px">最常錯嘅字</h3>
    ${listHtml(wrongChars, '')}
    <h3 style="margin-top:14px">最常錯嘅部首</h3>
    ${listHtml(wrongRads.map(([k, v]) => [`${k}（${RADICAL_MEANING[k] || ''}）`, v]), '')}
  `;
}

// ---------- 啟動 ----------
setGardenMode('family');
