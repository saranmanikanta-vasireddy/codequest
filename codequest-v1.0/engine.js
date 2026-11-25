/* Checkers: JavaScript runs for real; SQL runs on a small built-in engine; Python is checked by pattern. */
const Engine = {};

Engine.runJS = function (code) {
  const logs = [];
  const fake = { log: (...a) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ')) };
  try { new Function('console', code)(fake); }
  catch (e) { return { ok: false, error: e.name + ': ' + e.message, out: logs.join('\n') }; }
  return { ok: true, out: logs.join('\n') };
};

Engine.checkPython = function (code, lvl) {
  const src = code.replace(/#.*$/gm, '');
  const q = (src.match(/(["'])/g) || []).length;
  const bal = s => (src.split(s[0]).length - 1) === (src.split(s[1]).length - 1);
  if (!src.trim()) return { ok: false, error: 'Write some code first.' };
  if (!bal('()') || !bal('[]') || !bal('{}')) return { ok: false, error: 'SyntaxError: a bracket is not closed.' };
  if (/^\s*(if|elif|else|for|while|def)\b[^\n]*[^:\s]\s*$/m.test(src)) return { ok: false, error: "SyntaxError: expected ':' at the end of the line." };
  for (const t of lvl.tests) {
    if (!new RegExp(t.re, 'i').test(src.replace(/\s+/g, ' '))) return { ok: false, error: t.msg };
  }
  return { ok: true, out: lvl.expected };
};

/* ---- tiny SQL engine ---- */
Engine.sql = function (query, tables) {
  const q = query.trim().replace(/;+\s*$/, '').replace(/\s+/g, ' ');
  const m = q.match(/^select (.+?) from (\w+)(?: where (.+?))?(?: order by (\w+)(?: (asc|desc))?)?(?: limit (\d+))?$/i);
  if (!m) throw new Error('Could not read this query. Form: SELECT columns FROM table [WHERE ...] [ORDER BY ...] [LIMIT n]');
  const [, colsRaw, tname, where, ord, dir, lim] = m;
  const t = tables[tname.toLowerCase()];
  if (!t) throw new Error('No such table: ' + tname + '. Tables: ' + Object.keys(tables).join(', '));
  let rows = t.rows.map(r => Object.fromEntries(t.cols.map((c, i) => [c, r[i]])));
  const val = s => { s = s.trim(); if (/^'.*'$/.test(s) || /^".*"$/.test(s)) return s.slice(1, -1); if (!isNaN(s)) return Number(s); throw new Error('Bad value: ' + s); };
  const col = c => { c = c.trim().toLowerCase(); if (!t.cols.includes(c)) throw new Error('No such column: ' + c); return c; };
  const test = (r, cond) => {
    const c = cond.trim().match(/^(\w+) *(>=|<=|<>|!=|=|>|<|like) *(.+)$/i);
    if (!c) throw new Error('Bad condition: ' + cond);
    const a = r[col(c[1])], op = c[2].toLowerCase(), b = val(c[3]);
    if (op === 'like') return new RegExp('^' + String(b).replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i').test(String(a));
    return { '=': a == b, '!=': a != b, '<>': a != b, '>': a > b, '<': a < b, '>=': a >= b, '<=': a <= b }[op];
  };
  if (where) {
    const ors = where.split(/ or /i);
    rows = rows.filter(r => ors.some(o => o.split(/ and /i).every(c => test(r, c))));
  }
  if (ord) { const k = col(ord), d = (dir || 'asc').toLowerCase() === 'desc' ? -1 : 1; rows.sort((x, y) => (x[k] > y[k] ? 1 : x[k] < y[k] ? -1 : 0) * d); }
  if (lim) rows = rows.slice(0, Number(lim));
  const agg = colsRaw.match(/^(count|sum|avg|max|min)\((\*|\w+)\)$/i);
  if (agg) {
    const f = agg[1].toLowerCase(), k = agg[2] === '*' ? null : col(agg[2]);
    const v = k ? rows.map(r => r[k]) : rows;
    const res = f === 'count' ? v.length : f === 'sum' ? v.reduce((a, b) => a + b, 0) : f === 'avg' ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : f === 'max' ? Math.max(...v) : Math.min(...v);
    return { cols: [f + '(' + agg[2] + ')'], rows: [[res]] };
  }
  const cols = colsRaw.trim() === '*' ? t.cols : colsRaw.split(',').map(col);
  return { cols, rows: rows.map(r => cols.map(c => r[c])) };
};

Engine.checkSQL = function (query, lvl, tables) {
  let got, want;
  try { got = Engine.sql(query, tables); } catch (e) { return { ok: false, error: e.message }; }
  want = Engine.sql(lvl.solution, tables);
  const same = JSON.stringify(got.rows) === JSON.stringify(want.rows) && got.cols.length === want.cols.length;
  return { ok: same, table: got, error: same ? null : 'Your result is not what the task asks for. Check the columns, filter and order.' };
};
