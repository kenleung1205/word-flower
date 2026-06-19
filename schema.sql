-- word-flower 共享內容 D1 schema
-- 注意：開花進度同測驗紀錄係個人嘢，留喺前端 localStorage，唔放呢度。

-- 自訂花（字族花 mode 為 NULL；部首花 mode = 'radical'）
CREATE TABLE IF NOT EXISTS flowers (
  id          TEXT PRIMARY KEY,
  base        TEXT NOT NULL,
  color       TEXT,
  mode        TEXT,            -- 'radical' 或 NULL（字族）
  petals      TEXT NOT NULL,   -- JSON array: [{radical,char,word,emoji}]
  distractors TEXT,            -- JSON array
  created_at  INTEGER
);

-- 為現有花（內置／自動倒推／自訂）後加嘅字，按批次儲存，讀取時併埋
CREATE TABLE IF NOT EXISTS extra_petals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  flower_id  TEXT NOT NULL,
  petals     TEXT NOT NULL,    -- JSON array
  created_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_extra_flower ON extra_petals(flower_id);

-- 例詞例句（每個字一行）
CREATE TABLE IF NOT EXISTS examples (
  ch         TEXT PRIMARY KEY,
  words      TEXT,             -- JSON array
  sentences  TEXT,             -- JSON array
  updated_at INTEGER
);
