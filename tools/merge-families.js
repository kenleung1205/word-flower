// One-off: merge new content from word-flower-families.md into public/js/data.js.
// Adds only families / radical-families / radical names+meanings that aren't already present.
const fs = require('fs');
const path = require('path');

const MD = '/Users/kkl/Documents/TEMP/word-flower-families.md';
const DATA = path.join(__dirname, '..', 'public', 'js', 'data.js');

const md = fs.readFileSync(MD, 'utf8');
const json = JSON.parse(md.slice(md.indexOf('```json') + 7, md.indexOf('```', md.indexOf('```json') + 7)).trim());

let data = fs.readFileSync(DATA, 'utf8');

// ---- discover what already exists ----
const existingFamilyIds = new Set([...data.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]));
const existingNameKeys = new Set();
{
  const block = data.slice(data.indexOf('RADICAL_NAMES'), data.indexOf('RADICAL_MEANING'));
  for (const m of block.matchAll(/'([^']+)':\s*'/g)) existingNameKeys.add(m[1]);
}
const existingMeaningKeys = new Set();
{
  const block = data.slice(data.indexOf('RADICAL_MEANING'), data.indexOf('const FAMILIES'));
  for (const m of block.matchAll(/'([^']+)':\s*'/g)) existingMeaningKeys.add(m[1]);
}

const PALETTE = ['#e8703a','#3ba7a0','#d4569b','#6b8e3d','#c0883a','#7c6ce0','#d65a5a','#4a9ad6','#5aa86a','#ec6ba5','#5b9bd5','#f5a623','#8e6cc8','#4cb88a'];

function petalsBlock(petals) {
  return petals.map(p =>
    `      { radical: '${p.radical}', char: '${p.char}', word: '${p.word}', emoji: '${p.emoji}' },`
  ).join('\n');
}
function familyBlock(f, color, radical) {
  return [
    '  {',
    `    id: '${f.id}',`,
    `    base: '${f.base}',`,
    `    color: '${color}',`,
    ...(radical ? ["    mode: 'radical',"] : []),
    '    petals: [',
    petalsBlock(f.petals),
    '    ],',
    `    distractors: [${(f.distractors || []).map(d => `'${d}'`).join(', ')}],`,
    '  },',
  ].join('\n');
}

// ---- new families ----
let ci = 0;
const newFamilies = json.families
  .filter(f => !existingFamilyIds.has(f.id))
  .map(f => familyBlock(f, PALETTE[ci++ % PALETTE.length], false));

const newRadFamilies = json.radicalFamilies
  .filter(f => !existingFamilyIds.has(f.id))
  .map(f => familyBlock(f, PALETTE[ci++ % PALETTE.length], true));

// ---- new radical names + meanings ----
const newNames = Object.entries(json.radicalNames)
  .filter(([k]) => !existingNameKeys.has(k))
  .map(([k, v]) => `  '${k}': '${v}',`);
const newMeanings = Object.entries(json.radicalMeaning)
  .filter(([k]) => !existingMeaningKeys.has(k))
  .map(([k, v]) => `  '${k}': '${v}',`);

// ---- splice into data.js ----
function insertBefore(text, anchor, insertion) {
  const i = text.indexOf(anchor);
  if (i === -1) throw new Error('anchor not found: ' + anchor.slice(0, 30));
  return text.slice(0, i) + insertion + text.slice(i);
}

// RADICAL_NAMES: before its closing `};`
data = insertBefore(data, "  '門': '門字框',\n};", newNames.join('\n') + '\n');
// RADICAL_MEANING: before its closing `};`
data = insertBefore(data, "  '門': '同「門戶、出入」有關',\n};", newMeanings.join('\n') + '\n');
// FAMILIES: before the closing `];` (which precedes the radical comment block)
data = insertBefore(data, "\n];\n\n// ---------- 部首為主嘅花", '\n' + newFamilies.join('\n') + data.slice(0,0));
// RADICAL_FAMILIES: append before the final `];` at end of file
{
  const lastClose = data.lastIndexOf('\n];');
  data = data.slice(0, lastClose) + '\n' + newRadFamilies.join('\n') + data.slice(lastClose);
}

fs.writeFileSync(DATA, data);
console.log(`families +${newFamilies.length}, radicalFamilies +${newRadFamilies.length}, names +${newNames.length}, meanings +${newMeanings.length}`);
