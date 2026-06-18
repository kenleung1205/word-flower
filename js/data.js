// 字族開花 — 字族資料
// 每朵花：base 花心字、petals 花瓣（部首 + 合成字 + 詞語 + emoji）
const RADICAL_NAMES = {
  '氵': '三點水',
  '亻': '企人邊',
  '女': '女字旁',
  '土': '土字旁',
  '馬': '馬字旁',
  '日': '日字旁',
  '言': '言字旁',
  '虫': '虫字旁',
  '忄': '豎心邊',
  '足': '足字旁',
  '扌': '提手旁',
  '飠': '食字旁',
  '口': '口字旁',
  '石': '石字旁',
  '父': '父字頭',
  '爪': '爪字頭',
  '木': '木字旁',
};

// 部首意思（用嚟「部首配意思」測驗同部首意思卡）
const RADICAL_MEANING = {
  '氵': '同「水」有關',
  '亻': '同「人」有關',
  '女': '同「女性、人」有關',
  '土': '同「泥土、地方」有關',
  '馬': '同「馬」有關',
  '日': '同「太陽、日子」有關',
  '言': '同「說話」有關',
  '虫': '同「昆蟲、小動物」有關',
  '忄': '同「心情、感覺」有關',
  '足': '同「腳、行動」有關',
  '扌': '同「手、動作」有關',
  '飠': '同「食物」有關',
  '口': '同「嘴巴、說話」有關',
  '石': '同「石頭」有關',
  '父': '同「爸爸、長輩」有關',
  '爪': '同「手、抓」有關',
  '木': '同「樹木」有關',
};

const FAMILIES = [
  {
    id: 'ye',
    base: '也',
    color: '#ec6ba5',
    petals: [
      { radical: '女', char: '她', word: '她們', emoji: '👧' },
      { radical: '亻', char: '他', word: '他們', emoji: '👦' },
      { radical: '土', char: '地', word: '土地', emoji: '🌍' },
      { radical: '氵', char: '池', word: '水池', emoji: '🐠' },
      { radical: '馬', char: '馳', word: '奔馳', emoji: '🐎' },
    ],
    distractors: ['足', '飠'],
  },
  {
    id: 'qing',
    base: '青',
    color: '#5b9bd5',
    petals: [
      { radical: '氵', char: '清', word: '清水', emoji: '💧' },
      { radical: '日', char: '晴', word: '晴天', emoji: '☀️' },
      { radical: '言', char: '請', word: '請坐', emoji: '🙏' },
      { radical: '虫', char: '蜻', word: '蜻蜓', emoji: '🪰' },
      { radical: '忄', char: '情', word: '心情', emoji: '❤️' },
    ],
    distractors: ['父', '爪'],
  },
  {
    id: 'bao',
    base: '包',
    color: '#f5a623',
    petals: [
      { radical: '足', char: '跑', word: '跑步', emoji: '🏃' },
      { radical: '扌', char: '抱', word: '擁抱', emoji: '🤗' },
      { radical: '飠', char: '飽', word: '食飽', emoji: '😋' },
      { radical: '氵', char: '泡', word: '泡泡', emoji: '🫧' },
    ],
    distractors: ['言', '父'],
  },
  {
    id: 'ma',
    base: '馬',
    color: '#8e6cc8',
    petals: [
      { radical: '女', char: '媽', word: '媽媽', emoji: '👩' },
      { radical: '口', char: '嗎', word: '好嗎', emoji: '❓' },
      { radical: '石', char: '碼', word: '號碼', emoji: '🔢' },
      { radical: '虫', char: '螞', word: '螞蟻', emoji: '🐜' },
    ],
    distractors: ['足', '飠'],
  },
  {
    id: 'ba',
    base: '巴',
    color: '#4cb88a',
    petals: [
      { radical: '父', char: '爸', word: '爸爸', emoji: '👨' },
      { radical: '扌', char: '把', word: '把手', emoji: '✋' },
      { radical: '口', char: '吧', word: '好吧', emoji: '😊' },
      { radical: '爪', char: '爬', word: '爬山', emoji: '🧗' },
    ],
    distractors: ['言', '石'],
  },
];

// ---------- 部首為主嘅花（手寫，內容較豐富）----------
// 花心 = 部首；拖「聲旁」（其他字）埋去砌成新字。
// 為咗共用同一個遊戲引擎，petal.radical 入面放嘅其實係要拖嘅「聲旁」積木。
const RADICAL_FAMILIES = [
  {
    id: 'rad-shui',
    base: '氵',
    color: '#4dabf7',
    mode: 'radical',
    petals: [
      { radical: '工', char: '江', word: '長江', emoji: '🏞️' },
      { radical: '可', char: '河', word: '河流', emoji: '🌊' },
      { radical: '胡', char: '湖', word: '湖水', emoji: '🏞️' },
      { radical: '羊', char: '洋', word: '海洋', emoji: '🌊' },
      { radical: '十', char: '汁', word: '果汁', emoji: '🥤' },
    ],
    distractors: ['白', '分'],
  },
  {
    id: 'rad-shou',
    base: '扌',
    color: '#f783ac',
    mode: 'radical',
    petals: [
      { radical: '丁', char: '打', word: '打波', emoji: '🏓' },
      { radical: '白', char: '拍', word: '拍手', emoji: '👏' },
      { radical: '包', char: '抱', word: '擁抱', emoji: '🤗' },
      { radical: '少', char: '抄', word: '抄寫', emoji: '✍️' },
      { radical: '分', char: '扮', word: '扮嘢', emoji: '🎭' },
    ],
    distractors: ['工', '羊'],
  },
  {
    id: 'rad-mu',
    base: '木',
    color: '#51cf66',
    mode: 'radical',
    petals: [
      { radical: '公', char: '松', word: '松樹', emoji: '🌲' },
      { radical: '反', char: '板', word: '木板', emoji: '🪵' },
      { radical: '兆', char: '桃', word: '桃花', emoji: '🍑' },
      { radical: '每', char: '梅', word: '梅花', emoji: '🌸' },
      { radical: '不', char: '杯', word: '水杯', emoji: '🥤' },
    ],
    distractors: ['丁', '胡'],
  },
];
