// 字族開花 — 主程式
const STORAGE_KEY = 'wordFlowerDone';
const CUSTOM_KEY = 'wordFlowerCustom';

const $ = (sel) => document.querySelector(sel);
const screens = {
  garden: $('#screen-garden'),
  game: $('#screen-game'),
  book: $('#screen-book'),
  add: $('#screen-add'),
};

let current = null;       // 目前嘅字族
let filled = new Set();   // 今朵花已拼好嘅字
let busy = false;         // 合成動畫進行中，暫停拖放判定

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
function getFamilies() {
  return [...FAMILIES, ...loadCustom()];
}

// ---------- 畫面切換 ----------
function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
  $('#nav-garden').classList.toggle('active', name === 'garden' || name === 'game');
  $('#nav-book').classList.toggle('active', name === 'book');
  $('#nav-add').classList.toggle('active', name === 'add');
  if (name === 'garden') renderGarden();
  if (name === 'book') renderBook();
  if (name === 'add') initAddForm();
}

$('#nav-garden').addEventListener('click', () => show('garden'));
$('#nav-book').addEventListener('click', () => show('book'));
$('#nav-add').addEventListener('click', () => show('add'));
$('#btn-back').addEventListener('click', () => show('garden'));

// ---------- 花園（選關） ----------
function renderGarden() {
  const done = loadDone();
  const grid = $('#garden-grid');
  grid.innerHTML = '';
  getFamilies().forEach((f) => {
    const card = document.createElement('div');
    card.className = 'flower-card' + (done.has(f.id) ? ' done' : '');
    card.innerHTML = `
      <div class="bud">${done.has(f.id) ? '🌸' : '🌱'}</div>
      <div class="base" style="color:${f.color}">${f.base}</div>
      <div class="chars">${done.has(f.id) ? f.petals.map(p => p.char).join('') : ''}</div>
      <div class="status">${done.has(f.id) ? '已開花！再玩一次？' : '輕按開始'}</div>`;
    card.addEventListener('click', () => startGame(f));
    if (f.custom) {
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
  const families = getFamilies();
  $('#book-hint').textContent = `你已經種出 ${done.size} / ${families.length} 朵字族花！`;
  const grid = $('#book-grid');
  grid.innerHTML = '';
  families.forEach((f) => {
    const got = done.has(f.id);
    const card = document.createElement('div');
    card.className = 'flower-card' + (got ? ' done' : ' locked-look');
    card.innerHTML = `
      <div class="bud">${got ? '🌸' : '❔'}</div>
      <div class="base" style="color:${f.color}">${f.base}</div>
      <div class="chars">${got ? f.petals.map(p => p.char).join('') : '？？？？'}</div>
      <div class="book-words">${got ? f.petals.map(p => p.word).join('・') : '快啲去種呢朵花啦！'}</div>`;
    if (!got) card.addEventListener('click', () => startGame(f));
    grid.appendChild(card);
  });
}

// ---------- 開始一朵花 ----------
function startGame(family) {
  current = family;
  filled = new Set();
  busy = false;
  $('#base-char').textContent = family.base;
  $('#game-hint').textContent = '將部首積木拖去花心啦！';
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
  const radicals = [...current.petals.map(p => p.radical), ...(current.distractors || [])];
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
    const radName = RADICAL_NAMES[match.radical] || `${match.radical}字旁`;
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
    filled.add(match.char);
    $('#game-hint').textContent = `${match.char} — ${match.word} ${match.emoji}`;
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
    speak(`好叻呀！${current.base}字族花開晒喇！`);
    $('#celebrate-title').textContent = `「${current.base}」字族花開晒喇！`;
    $('#celebrate-words').textContent = current.petals.map(p => `${p.char} ${p.word}`).join('　');
    const families = getFamilies();
    const idx = families.findIndex(f => f.id === current.id);
    $('#btn-next').textContent = idx < families.length - 1 ? '下一朵花 ➜' : '🌱 返回花園';
    $('#celebrate').classList.remove('hidden');
  }, 600);
}

$('#btn-next').addEventListener('click', () => {
  $('#celebrate').classList.add('hidden');
  const families = getFamilies();
  const idx = families.findIndex(f => f.id === current.id);
  if (idx >= 0 && idx < families.length - 1) startGame(families[idx + 1]);
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

// ---------- 自訂字族（加新字） ----------
const PETAL_LIMIT = 6;
const CUSTOM_COLORS = ['#e8590c', '#1098ad', '#9c36b5', '#2f9e44', '#e64980', '#5f3dc4'];

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

function initAddForm() {
  const rows = $('#add-rows');
  if (rows.children.length === 0) {
    for (let i = 0; i < 3; i++) rows.appendChild(makeRow());
  }
}

$('#btn-add-row').addEventListener('click', () => {
  const rows = $('#add-rows');
  if (rows.children.length >= PETAL_LIMIT) {
    alert(`最多 ${PETAL_LIMIT} 塊花瓣呀！`);
    return;
  }
  rows.appendChild(makeRow());
});

$('#btn-save-family').addEventListener('click', () => {
  const base = $('#add-base').value.trim();
  if (!base) { alert('要填花心字呀！'); return; }

  const petals = [];
  for (const row of $('#add-rows').children) {
    const radical = row.querySelector('.in-radical').value.trim();
    const char = row.querySelector('.in-char').value.trim();
    if (!radical && !char) continue; // 空行跳過
    if (!radical || !char) { alert('每塊花瓣都要有「部首」同「新字」呀！'); return; }
    petals.push({
      radical,
      char,
      word: row.querySelector('.in-word').value.trim() || char,
      emoji: row.querySelector('.in-emoji').value.trim() || '🌟',
    });
  }
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

  // 清空表單，即刻試玩
  $('#add-base').value = '';
  $('#add-rows').innerHTML = '';
  startGame(family);
});

// ---------- 啟動 ----------
renderGarden();
