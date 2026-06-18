// 音效（Web Audio 合成，毋須音訊檔）+ 粵語語音
const SFX = (() => {
  let ctx = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = 'sine', vol = 0.25) {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + start);
    o.stop(c.currentTime + start + dur);
  }

  return {
    // 「叮！」— 合成成功
    ding() {
      tone(1318, 0, 0.18, 'sine', 0.3);   // E6
      tone(1760, 0.09, 0.35, 'sine', 0.3); // A6
    },
    // 「嘭」— 結合一刻
    bang() {
      const c = ac();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(220, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.25);
      g.gain.setValueAtTime(0.3, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
      o.connect(g).connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.3);
    },
    // 拼錯 — 輕輕「嗯嗯」聲
    buzz() {
      tone(160, 0, 0.12, 'sawtooth', 0.12);
      tone(140, 0.14, 0.15, 'sawtooth', 0.12);
    },
    // 煙花連環「啪啪」
    fireworks() {
      for (let i = 0; i < 6; i++) {
        tone(500 + Math.random() * 700, i * 0.18, 0.25, 'triangle', 0.18);
      }
    },
  };
})();

// 粵語讀字：「她！女字旁嘅她，她們嘅她！」
// onEnd：讀完（或讀唔到）之後嘅 callback，得閒先做（例如等讀完先彈慶祝）
function speak(text, onEnd) {
  if (!('speechSynthesis' in window)) { if (onEnd) setTimeout(onEnd, 800); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const canto = voices.find(v => /zh[-_]HK|yue/i.test(v.lang));
  if (canto) u.voice = canto;
  u.lang = canto ? canto.lang : 'zh-HK';
  u.rate = 0.85;
  if (onEnd) {
    let done = false;
    const finish = () => { if (done) return; done = true; onEnd(); };
    u.onend = finish;
    u.onerror = finish;
  }
  speechSynthesis.speak(u);
}

// 部分瀏覽器要等 voices 載入
if ('speechSynthesis' in window) speechSynthesis.getVoices();
