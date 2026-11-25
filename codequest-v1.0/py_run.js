/* Mini Python: runtime. Part 2 of 3. */
(function (Py) {
  const { F, PyErr } = Py;
  class NPArr { constructor(data) { this.data = data; } }
  class PyFunc { constructor(name, params, body, closure, lam) { Object.assign(this, { name, params, body, closure, lam }); } }
  class SliceArg { constructor(v) { this.v = v; } }
  class Return { constructor(v) { this.v = v; } }
  const BREAK = { brk: 1 }, CONT = { cont: 1 };
  Py.NPArr = NPArr; Py.modules = {};
  const err = (t, m, l) => new PyErr(t, m, l);
  const isF = x => x instanceof F;
  const isNum = x => typeof x === 'number' || isF(x) || typeof x === 'boolean';
  const nv = x => isF(x) ? x.v : typeof x === 'boolean' ? +x : x;
  const isInt = x => typeof x === 'number' || typeof x === 'boolean';
  Py.nv = nv; Py.isNum = isNum;
  function typeName(x) {
    if (x === null) return 'NoneType'; if (typeof x === 'boolean') return 'bool'; if (typeof x === 'number') return 'int'; if (isF(x)) return 'float';
    if (typeof x === 'string') return 'str'; if (Array.isArray(x)) return x.tuple ? 'tuple' : 'list'; if (x instanceof Map) return 'dict';
    if (x instanceof NPArr) return 'ndarray'; if (x instanceof PyFunc || typeof x === 'function') return 'function'; return (x && x.cls) || 'object';
  }
  const truthy = x => x === null || x === undefined || x === false ? false : typeof x === 'number' ? x !== 0 : isF(x) ? x.v !== 0 : typeof x === 'string' ? x.length > 0 : Array.isArray(x) ? x.length > 0 : x instanceof Map ? x.size > 0 : true;
  function fmtFloat(v) {
    if (Number.isNaN(v)) return 'nan'; if (!Number.isFinite(v)) return v > 0 ? 'inf' : '-inf';
    let s = String(v); if (/e/.test(s)) return s.replace(/e([+-])(\d)$/, 'e$10$2'); if (!s.includes('.')) s += '.0'; return s;
  }
  function quote(s) {
    const q = s.includes("'") && !s.includes('"') ? '"' : "'";
    return q + s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t').split(q).join('\\' + q) + q;
  }
  function npRepr(a) {
    const d = a.data; if (!d.length) return '[]';
    if (d.some(x => Array.isArray(x) || x instanceof NPArr)) return '[' + d.map(repr).join(', ') + ']';
    if (!d.some(isF)) return '[' + d.map(x => String(nv(x))).join(' ') + ']';
    const vals = d.map(nv); let dec = 0;
    vals.forEach(v => { const s = String(+v.toPrecision(8)); const i = s.indexOf('.'); if (i >= 0 && !/e/.test(s)) dec = Math.max(dec, s.length - i - 1); });
    const strs = vals.map(v => { let s = (+v.toPrecision(8)).toFixed(dec); s = dec === 0 ? s + '.' : s.replace(/0+$/, ''); return s; });
    const w = Math.max(...strs.map(s => s.length)); return '[' + strs.map(s => s.padEnd(w)).join(' ') + ']';
  }
  function repr(x) {
    if (x === null) return 'None'; if (x === true) return 'True'; if (x === false) return 'False';
    if (typeof x === 'number') return String(x); if (isF(x)) return fmtFloat(x.v); if (typeof x === 'string') return quote(x);
    if (Array.isArray(x)) return x.tuple ? '(' + x.map(repr).join(', ') + (x.length === 1 ? ',' : '') + ')' : '[' + x.map(repr).join(', ') + ']';
    if (x instanceof Map) return '{' + [...x].map(([k, v]) => repr(k) + ': ' + repr(v)).join(', ') + '}';
    if (x instanceof NPArr) return npRepr(x);
    if (x instanceof PyFunc) return '<function ' + x.name + '>'; if (typeof x === 'function') return '<built-in function>';
    if (x && x.repr) return x.repr(); return '<object>';
  }
  const str = x => typeof x === 'string' ? x : repr(x);
  Py.repr = repr; Py.str = str;
  function eq(a, b) {
    if (isNum(a) && isNum(b)) return nv(a) === nv(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && !!a.tuple === !!b.tuple && a.every((x, i) => eq(x, b[i]));
    if (a instanceof Map && b instanceof Map) return a.size === b.size && [...a].every(([k, v]) => b.has(k) && eq(v, b.get(k)));
    return a === b;
  }
  function order(a, b, op, line) {
    if (isNum(a) && isNum(b)) { const x = nv(a), y = nv(b); return x < y ? -1 : x > y ? 1 : 0; }
    if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
    if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = order(a[i], b[i], op, line); if (c) return c; } return a.length - b.length; }
    throw err('TypeError', "'" + op + "' not supported between instances of '" + typeName(a) + "' and '" + typeName(b) + "'", line);
  }
  function fmtSpec(v, spec) {
    if (!spec) return str(v);
    const m = /^(?:(.)?([<>^=]))?([+\- ])?(0)?(\d+)?(,)?(?:\.(\d+))?([bdeEfFgGosxX%])?$/.exec(spec);
    if (!m) throw err('ValueError', "Invalid format specifier '" + spec + "'");
    const [, fill, align, sign, zero, width, comma, prec, type] = m; let s; const x = nv(v);
    if ('fFe%'.includes(type || '-') && type) {
      if (typeof x !== 'number') throw err('ValueError', "Unknown format code '" + type + "' for object of type '" + typeName(v) + "'");
      const p = prec === undefined ? 6 : +prec; s = type === '%' ? (x * 100).toFixed(p) + '%' : type === 'e' ? x.toExponential(p).replace(/e([+-])(\d)$/, 'e$10$2') : x.toFixed(p);
    } else if (type === 'd') {
      if (!isInt(v)) throw err('ValueError', "Unknown format code 'd' for object of type '" + typeName(v) + "'"); s = String(x);
    } else if (type === 'x') s = x.toString(16); else if (type === 'b') s = x.toString(2);
    else { s = str(v); if (prec !== undefined && typeof v === 'string') s = s.slice(0, +prec); }
    if (comma) { const p = s.split('.'); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','); s = p.join('.'); }
    if (sign === '+' && isNum(v) && x >= 0) s = '+' + s;
    if (width && s.length < +width) {
      const pad = +width - s.length, num = isNum(v), al = align || (num ? '>' : '<'), f = fill || ' ';
      if (zero && !align && num) { const ng = s[0] === '-' || s[0] === '+'; s = (ng ? s[0] : '') + '0'.repeat(pad) + (ng ? s.slice(1) : s); }
      else if (al === '<') s += f.repeat(pad); else if (al === '^') { const l = Math.floor(pad / 2); s = f.repeat(l) + s + f.repeat(pad - l); } else s = f.repeat(pad) + s;
    }
    return s;
  }
  function arith(op, a, b, line) {
    const x = nv(a), y = nv(b), fl = isF(a) || isF(b); let r;
    switch (op) {
      case '+': r = x + y; break; case '-': r = x - y; break; case '*': r = x * y; break;
      case '/': if (y === 0) throw err('ZeroDivisionError', 'division by zero', line); return new F(x / y);
      case '//': if (y === 0) throw err('ZeroDivisionError', 'integer division or modulo by zero', line); r = Math.floor(x / y); break;
      case '%': if (y === 0) throw err('ZeroDivisionError', 'integer modulo by zero', line); r = ((x % y) + y) % y; break;
      case '**': r = Math.pow(x, y); if (!fl && y < 0) return new F(r); break;
    }
    return fl ? new F(r) : r;
  }
  function binop(op, a, b, line) {
    if (a instanceof NPArr || b instanceof NPArr) {
      const da = a instanceof NPArr ? a.data : null, db = b instanceof NPArr ? b.data : null, n = (da || db).length;
      return new NPArr(Array.from({ length: n }, (_, i) => binop(op, da ? da[i] : a, db ? db[i] : b, line)));
    }
    if (isNum(a) && isNum(b)) return arith(op, a, b, line);
    if (op === '+') {
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b) && !!a.tuple === !!b.tuple) { const r = a.concat(b); if (a.tuple) r.tuple = true; return r; }
      if (typeof a === 'string') throw err('TypeError', 'can only concatenate str (not "' + typeName(b) + '") to str', line);
    }
    if (op === '*') {
      const rep = (s, n) => { if (!isInt(n)) throw err('TypeError', "can't multiply sequence by non-int of type '" + typeName(n) + "'", line); return nv(n); };
      if (typeof a === 'string' && isNum(b)) return a.repeat(Math.max(0, rep(a, b))); if (typeof b === 'string' && isNum(a)) return b.repeat(Math.max(0, rep(b, a)));
      if (Array.isArray(a) && isNum(b)) { let r = []; for (let i = 0; i < rep(a, b); i++) r = r.concat(a); return r; }
    }
    if (op === '%' && typeof a === 'string') throw err('TypeError', "% formatting is not supported here. Use an f-string like f\"{x}\" instead", line);
    throw err('TypeError', "unsupported operand type(s) for " + op + ": '" + typeName(a) + "' and '" + typeName(b) + "'", line);
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  class Scope {
    constructor(parent) { this.vars = new Map(); this.parent = parent || null; this.gl = null; }
    find(n) { for (let s = this; s; s = s.parent) if (s.vars.has(n)) return s.vars.get(n); return NOTFOUND; }
    root() { let s = this; while (s.parent) s = s.parent; return s; }
    set(n, v) { (this.gl && this.gl.has(n) ? this.root() : this).vars.set(n, v); }
    names() { const o = []; for (let s = this; s; s = s.parent) o.push(...s.vars.keys()); return o; }
  }
  const NOTFOUND = Symbol('nf');
  const toList = (x, line) => {
    if (Array.isArray(x)) return x.slice(); if (typeof x === 'string') return [...x]; if (x instanceof Map) return [...x.keys()]; if (x instanceof NPArr) return x.data.slice();
    throw err('TypeError', "'" + typeName(x) + "' object is not iterable", line);
  };
  const tup = a => { a.tuple = true; return a; };
  const intArg = (x, line) => { if (!isInt(x)) throw err('TypeError', "'" + typeName(x) + "' object cannot be interpreted as an integer", line); return nv(x); };
  function sortList(arr, key, rev, I, line) {
    const k = arr.map(x => ({ x, k: key ? I.call(key, [x], {}, line) : x }));
    k.sort((p, q) => order(p.k, q.k, '<', line)); if (rev) k.reverse(); return k.map(p => p.x);
  }
  const BUILTINS = {
    print(a, kw, I) { I.out += a.map(str).join(kw.sep === undefined || kw.sep === null ? ' ' : kw.sep) + (kw.end === undefined || kw.end === null ? '\n' : kw.end); return null; },
    len(a, kw, I, line) { const x = a[0]; if (typeof x === 'string' || Array.isArray(x)) return x.length; if (x instanceof Map) return x.size; if (x instanceof NPArr) return x.data.length; throw err('TypeError', "object of type '" + typeName(x) + "' has no len()", line); },
    range(a, kw, I, line) {
      const v = a.map(x => intArg(x, line)); let s = 0, e, st = 1; if (v.length === 1) e = v[0]; else { s = v[0]; e = v[1]; if (v.length > 2) st = v[2]; }
      if (st === 0) throw err('ValueError', 'range() arg 3 must not be zero', line); const r = [];
      for (let i = s; st > 0 ? i < e : i > e; i += st) { r.push(i); if (r.length > 1e6) throw err('MemoryError', 'range is too large', line); } return r;
    },
    round(a, kw, I, line) {
      const x = nv(a[0]); if (typeof x !== 'number') throw err('TypeError', "type " + typeName(a[0]) + " doesn't define __round__ method", line);
      if (a.length < 2 || a[1] === null) { const f = Math.floor(x), d = x - f; return d === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(x); }
      const n = nv(a[1]), m = Math.pow(10, n); let r; const nn = Math.max(0, n), ex = x.toFixed(Math.min(100, nn + 40)), tail = ex.slice(ex.indexOf('.') + 1 + nn);
        if (/^50*$/.test(tail)) { const lo = Number(ex.slice(0, ex.indexOf('.') + 1 + nn).replace(/\.$/, '')), last = Math.abs(Math.round(lo * m)) % 2; r = last === 0 ? lo : lo + (x < 0 ? -1 : 1) / m; r = Number(r.toFixed(nn)); } else r = Number(x.toFixed(nn)); return isF(a[0]) ? new F(r) : a[0];
    },
    int(a, kw, I, line) {
      const x = a[0]; if (x === undefined) return 0; if (typeof x === 'string') { if (!/^\s*[+-]?\d+\s*$/.test(x)) throw err('ValueError', 'invalid literal for int() with base 10: ' + quote(x), line); return parseInt(x, 10); }
      if (isNum(x)) return Math.trunc(nv(x)); throw err('TypeError', "int() argument must be a string or a number, not '" + typeName(x) + "'", line);
    },
    float(a, kw, I, line) {
      const x = a[0]; if (x === undefined) return new F(0); if (typeof x === 'string') { if (!/^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?\s*$/.test(x)) throw err('ValueError', 'could not convert string to float: ' + quote(x), line); return new F(parseFloat(x)); }
      if (isNum(x)) return new F(nv(x)); throw err('TypeError', "float() argument must be a string or a number, not '" + typeName(x) + "'", line);
    },
    str(a) { return a.length ? str(a[0]) : ''; },
    bool(a) { return a.length ? truthy(a[0]) : false; },
    repr(a) { return repr(a[0]); },
    abs(a, kw, I, line) { const x = a[0]; if (!isNum(x)) throw err('TypeError', "bad operand type for abs(): '" + typeName(x) + "'", line); return isF(x) ? new F(Math.abs(x.v)) : Math.abs(nv(x)); },
    sum(a, kw, I, line) { let t = a.length > 1 ? a[1] : 0; for (const x of toList(a[0], line)) t = binop('+', t, x, line); return t; },
    min(a, kw, I, line) { return mm(a, kw, I, line, -1, 'min'); }, max(a, kw, I, line) { return mm(a, kw, I, line, 1, 'max'); },
    sorted(a, kw, I, line) { return sortList(toList(a[0], line), kw.key, truthy(kw.reverse), I, line); },
    list(a, kw, I, line) { return a.length ? toList(a[0], line) : []; },
    tuple(a, kw, I, line) { return tup(a.length ? toList(a[0], line) : []); },
    dict(a, kw, I, line) { const m = new Map(); if (a[0] instanceof Map) a[0].forEach((v, k) => m.set(k, v)); else if (a[0]) toList(a[0], line).forEach(p => m.set(p[0], p[1])); Object.keys(kw).forEach(k => m.set(k, kw[k])); return m; },
    enumerate(a, kw, I, line) { const st = a.length > 1 ? nv(a[1]) : 0; return toList(a[0], line).map((x, i) => tup([i + st, x])); },
    zip(a, kw, I, line) { const ls = a.map(x => toList(x, line)), n = Math.min(...ls.map(l => l.length)); return Array.from({ length: ls.length ? n : 0 }, (_, i) => tup(ls.map(l => l[i]))); },
    reversed(a, kw, I, line) { return toList(a[0], line).reverse(); },
    any(a, kw, I, line) { return toList(a[0], line).some(truthy); }, all(a, kw, I, line) { return toList(a[0], line).every(truthy); },
    map(a, kw, I, line) { return toList(a[1], line).map(x => I.call(a[0], [x], {}, line)); },
    filter(a, kw, I, line) { return toList(a[1], line).filter(x => truthy(a[0] === null ? x : I.call(a[0], [x], {}, line))); },
    input() { throw err('RuntimeError', 'input() is not supported in this game. Use a variable instead.'); },
    chr(a) { return String.fromCharCode(nv(a[0])); }, ord(a) { return a[0].charCodeAt(0); },
    pow(a, kw, I, line) { return arith('**', a[0], a[1], line); },
    type(a) { const t = typeName(a[0]); return { cls: 'type', repr: () => "<class '" + t + "'>" }; },
    isinstance() { return true; }
  };
  function mm(a, kw, I, line, dir, nm) {
    const items = a.length === 1 ? toList(a[0], line) : a; if (!items.length) throw err('ValueError', nm + '() arg is an empty sequence', line);
    let best = items[0], bk = kw.key ? I.call(kw.key, [best], {}, line) : best;
    for (const x of items.slice(1)) { const k = kw.key ? I.call(kw.key, [x], {}, line) : x; if (order(k, bk, '<', line) * dir > 0) { best = x; bk = k; } } return best;
  }
  const STR = {
    upper: s => s.toUpperCase(), lower: s => s.toLowerCase(), title: s => s.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (m, a, b) => a + b.toUpperCase()),
    capitalize: s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(), strip: (s, a) => a.length ? s.replace(new RegExp('^[' + a[0].replace(/[\]\\^-]/g, '\\$&') + ']+|[' + a[0].replace(/[\]\\^-]/g, '\\$&') + ']+$', 'g'), '') : s.trim(),
    lstrip: s => s.trimStart(), rstrip: s => s.trimEnd(),
    split: (s, a) => (a.length && a[0] !== null ? s.split(a[0]) : s.split(/\s+/).filter(Boolean)),
    join: (s, a, kw, I, line) => toList(a[0], line).map((x, i) => { if (typeof x !== 'string') throw err('TypeError', 'sequence item ' + i + ': expected str instance, ' + typeName(x) + ' found', line); return x; }).join(s),
    replace: (s, a) => s.split(a[0]).join(a[1]), startswith: (s, a) => s.startsWith(a[0]), endswith: (s, a) => s.endsWith(a[0]),
    find: (s, a) => s.indexOf(a[0]), count: (s, a) => (a[0] === '' ? s.length + 1 : s.split(a[0]).length - 1),
    isdigit: s => /^\d+$/.test(s), isalpha: s => /^[A-Za-z]+$/.test(s), ljust: (s, a) => s.padEnd(nv(a[0])), rjust: (s, a) => s.padStart(nv(a[0])),
    format: (s, a) => { let auto = 0; return s.replace(/\{(\d*)(?::([^}]*))?\}/g, (m, i, sp) => fmtSpec(a[i === '' ? auto++ : +i], sp)); }
  };
  const LIST = {
    append: (l, a) => { l.push(a[0]); return null; }, extend: (l, a, kw, I, line) => { l.push(...toList(a[0], line)); return null; },
    insert: (l, a) => { l.splice(nv(a[0]), 0, a[1]); return null; },
    pop: (l, a, kw, I, line) => { if (!l.length) throw err('IndexError', 'pop from empty list', line); const i = a.length ? nv(a[0]) : -1; const j = i < 0 ? l.length + i : i; if (j < 0 || j >= l.length) throw err('IndexError', 'pop index out of range', line); return l.splice(j, 1)[0]; },
    remove: (l, a, kw, I, line) => { const i = l.findIndex(x => eq(x, a[0])); if (i < 0) throw err('ValueError', 'list.remove(x): x not in list', line); l.splice(i, 1); return null; },
    index: (l, a, kw, I, line) => { const i = l.findIndex(x => eq(x, a[0])); if (i < 0) throw err('ValueError', repr(a[0]) + ' is not in list', line); return i; },
    count: (l, a) => l.filter(x => eq(x, a[0])).length,
    sort: (l, a, kw, I, line) => { const r = sortList(l, kw.key, truthy(kw.reverse), I, line); l.splice(0, l.length, ...r); return null; },
    reverse: l => { l.reverse(); return null; }, copy: l => l.slice(), clear: l => { l.length = 0; return null; }
  };
  const DICT = {
    keys: d => [...d.keys()], values: d => [...d.values()], items: d => [...d].map(([k, v]) => tup([k, v])),
    get: (d, a) => (d.has(a[0]) ? d.get(a[0]) : a.length > 1 ? a[1] : null),
    pop: (d, a, kw, I, line) => { if (d.has(a[0])) { const v = d.get(a[0]); d.delete(a[0]); return v; } if (a.length > 1) return a[1]; throw err('KeyError', repr(a[0]), line); },
    update: (d, a) => { if (a[0] instanceof Map) a[0].forEach((v, k) => d.set(k, v)); return null; }, copy: d => new Map(d),
    setdefault: (d, a) => { if (!d.has(a[0])) d.set(a[0], a.length > 1 ? a[1] : null); return d.get(a[0]); }
  };
  const TUP = { count: LIST.count, index: LIST.index };
  const NPM = {
    mean: (x) => new F(x.data.reduce((s, v) => s + nv(v), 0) / x.data.length), sum: (x) => x.data.reduce((s, v) => binop('+', s, v), 0),
    max: x => x.data.reduce((m, v) => (nv(v) > nv(m) ? v : m)), min: x => x.data.reduce((m, v) => (nv(v) < nv(m) ? v : m)), tolist: x => x.data.slice()
  };
  class Interp {
    constructor() { this.out = ''; this.steps = 0; this.depth = 0; this.feat = new Set(); this.globals = new Scope(null); }
    tick(line) { if (++this.steps > 400000) throw err('RuntimeError', 'Your code ran for too long. Is there an infinite loop?', line); }
    exec(body, sc) { for (const s of body) this.stmt(s, sc); }
    stmt(s, sc) {
      this.tick(s.line);
      switch (s.k) {
        case 'expr': this.ev(s.e, sc); break;
        case 'assign': { const v = this.ev(s.value, sc); for (const t of s.targets) this.assign(t, v, sc, s.line); break; }
        case 'aug': {
          const cur = this.ev(s.target, sc), v = this.ev(s.value, sc);
          if (s.op === '+' && Array.isArray(cur) && !cur.tuple) cur.push(...toList(v, s.line)); else this.assign(s.target, binop(s.op, cur, v, s.line), sc, s.line); break;
        }
        case 'if': if (truthy(this.ev(s.c, sc))) this.exec(s.body, sc); else this.exec(s.orelse, sc); break;
        case 'while': while (truthy(this.ev(s.c, sc))) { this.tick(s.line); try { this.exec(s.body, sc); } catch (e) { if (e === BREAK) break; if (e === CONT) continue; throw e; } } break;
        case 'for': for (const x of toList(this.ev(s.it, sc), s.line)) { this.tick(s.line); this.assign(s.target, x, sc, s.line); try { this.exec(s.body, sc); } catch (e) { if (e === BREAK) break; if (e === CONT) continue; throw e; } } break;
        case 'def': sc.set(s.name, new PyFunc(s.name, s.params, s.body, sc, false)); break;
        case 'return': throw new Return(s.v ? this.ev(s.v, sc) : null);
        case 'pass': break; case 'break': throw BREAK; case 'continue': throw CONT;
        case 'global': sc.gl = sc.gl || new Set(); s.names.forEach(n => sc.gl.add(n)); break;
        case 'import': for (const [m, al] of s.names) { const mod = Py.modules[m]; if (!mod) throw err('ModuleNotFoundError', "No module named '" + m + "'", s.line); sc.set(al || m.split('.')[0], al ? mod : Py.modules[m.split('.')[0]] || mod); } break;
        case 'from': {
          const mod = Py.modules[s.mod]; if (!mod) throw err('ModuleNotFoundError', "No module named '" + s.mod + "'", s.line);
          for (const [n, al] of s.names) { if (!(n in mod.attrs)) throw err('ImportError', "cannot import name '" + n + "' from '" + s.mod + "'", s.line); sc.set(al || n, mod.attrs[n]); } break;
        }
      }
    }
    assign(t, v, sc, line) {
      if (t.k === 'name') return sc.set(t.v, v);
      if (t.k === 'idx') {
        const o = this.ev(t.o, sc), key = this.ev(t.i, sc);
        if (o instanceof Map) o.set(key, v); else if (Array.isArray(o) && !o.tuple || o instanceof NPArr) { const a = o instanceof NPArr ? o.data : o, i = nv(key), j = i < 0 ? a.length + i : i; if (j < 0 || j >= a.length) throw err('IndexError', 'list assignment index out of range', line); a[j] = v; }
        else throw err('TypeError', "'" + typeName(o) + "' object does not support item assignment", line); return;
      }
      if (t.k === 'attr') { const o = this.ev(t.o, sc); if (o && o.attrs) { o.attrs[t.n] = v; return; } throw err('AttributeError', "can't set attribute '" + t.n + "'", line); }
      const items = toList(v, line), targets = t.items;
      if (items.length !== targets.length) throw err('ValueError', items.length < targets.length ? 'not enough values to unpack (expected ' + targets.length + ', got ' + items.length + ')' : 'too many values to unpack (expected ' + targets.length + ')', line);
      targets.forEach((x, i) => this.assign(x, items[i], sc, line));
    }
    lookup(name, sc, line) {
      const v = sc.find(name); if (v !== NOTFOUND) return v;
      if (Object.prototype.hasOwnProperty.call(BUILTINS, name)) return BUILTINS[name];
      const cands = [...sc.names(), ...Object.keys(BUILTINS)].filter(n => lev(n.toLowerCase(), name.toLowerCase()) <= (name.length > 4 ? 2 : 1));
      throw err('NameError', "name '" + name + "' is not defined" + (cands.length ? ". Did you mean '" + cands[0] + "'?" : '. Create it first or check the spelling'), line);
    }
    call(f, args, kw, line) {
      if (f instanceof PyFunc) return this.callFunc(f, args, kw, line);
      if (typeof f === 'function') return f(args, kw, this, line);
      throw err('TypeError', "'" + typeName(f) + "' object is not callable", line);
    }
    callFunc(fn, args, kw, line) {
      if (++this.depth > 300) { this.depth = 0; throw err('RecursionError', 'maximum recursion depth exceeded (the function keeps calling itself)', line); }
      try {
        const sc = new Scope(fn.closure), ps = fn.params;
        if (args.length > ps.length) throw err('TypeError', fn.name + '() takes ' + ps.length + ' positional argument' + (ps.length === 1 ? '' : 's') + ' but ' + args.length + ' were given', line);
        for (const k of Object.keys(kw)) if (!ps.some(p => p.n === k)) throw err('TypeError', fn.name + "() got an unexpected keyword argument '" + k + "'", line);
        const missing = [];
        ps.forEach((p, i) => { if (i < args.length) sc.vars.set(p.n, args[i]); else if (p.n in kw) sc.vars.set(p.n, kw[p.n]); else if (p.def) sc.vars.set(p.n, this.ev(p.def, fn.closure)); else missing.push("'" + p.n + "'"); });
        if (missing.length) throw err('TypeError', fn.name + '() missing ' + missing.length + ' required positional argument' + (missing.length > 1 ? 's' : '') + ': ' + missing.join(' and '), line);
        if (fn.lam) return this.ev(fn.body, sc);
        try { this.exec(fn.body, sc); } catch (e) { if (e instanceof Return) return e.v; throw e; }
        return null;
      } finally { this.depth--; }
    }
    getattr(o, n, line) {
      this.feat.add(n);
      if (o && o.__py) {
        if (n in o.attrs) return o.attrs[n];
        if (o.methods && n in o.methods) return (a, k, I, l) => o.methods[n](o, a, k, I, l);
        throw err('AttributeError', "'" + (o.cls || 'object') + "' object has no attribute '" + n + "'", line);
      }
      let tbl = null; const t = typeName(o);
      if (t === 'str') tbl = STR; else if (t === 'list') tbl = LIST; else if (t === 'tuple') tbl = TUP; else if (t === 'dict') tbl = DICT; else if (t === 'ndarray') {
        if (n === 'shape') return tup([o.data.length]); if (NPM[n]) return (a, k, I, l) => NPM[n](o, a, k, I, l);
      }
      if (tbl && tbl[n]) return (a, k, I, l) => tbl[n](o, a, k, I, l);
      throw err('AttributeError', "'" + t + "' object has no attribute '" + n + "'" + (tbl ? '. Did you mean ' + (Object.keys(tbl).sort((x, y) => lev(x, n) - lev(y, n))[0]) + '?' : ''), line);
    }
    iterGen(e, sc, cb) {
      const rec = (gi, scope) => {
        if (gi === e.gens.length) return cb(scope); const g = e.gens[gi];
        for (const x of toList(this.ev(g.it, scope), 0)) { this.tick(0); const inner = new Scope(scope); this.assign(g.target, x, inner, 0); if (g.conds.every(c => truthy(this.ev(c, inner)))) rec(gi + 1, inner); }
      };
      rec(0, sc);
    }
    ev(e, sc) {
      switch (e.k) {
        case 'num': return e.float ? new F(e.v) : e.v;
        case 'str': case 'const': return e.v;
        case 'fstr': return e.parts.map(p => { if (typeof p === 'string') return p; let v = this.ev(p.e, sc); if (p.conv === 'r') v = repr(v); return fmtSpec(v, p.spec); }).join('');
        case 'name': return this.lookup(e.v, sc, e.line);
        case 'list': return e.items.map(x => this.ev(x, sc));
        case 'tuple': return tup(e.items.map(x => this.ev(x, sc)));
        case 'dict': { const m = new Map(); e.pairs.forEach(([k, v]) => { const kk = this.ev(k, sc), vv = this.ev(v, sc); m.set(isF(kk) && Number.isInteger(kk.v) ? kk.v : kk, vv); }); return m; }
        case 'ifx': return truthy(this.ev(e.c, sc)) ? this.ev(e.a, sc) : this.ev(e.b, sc);
        case 'bool': { const l = this.ev(e.l, sc); return e.op === 'and' ? (truthy(l) ? this.ev(e.r, sc) : l) : (truthy(l) ? l : this.ev(e.r, sc)); }
        case 'not': return !truthy(this.ev(e.e, sc));
        case 'un': {
          const v = this.ev(e.e, sc); if (v instanceof NPArr) return new NPArr(v.data.map(x => (e.op === '-' ? (isF(x) ? new F(-x.v) : 0 - x) : x)));
          if (!isNum(v)) throw err('TypeError', "bad operand type for unary " + e.op + ": '" + typeName(v) + "'");
          if (e.op === '+') return isF(v) ? v : nv(v); return isF(v) ? new F(-v.v) : 0 - nv(v);
        }
        case 'bin': return binop(e.op, this.ev(e.l, sc), this.ev(e.r, sc), e.line);
        case 'cmp': {
          let l = this.ev(e.first, sc);
          for (const [op, re] of e.ops) { const r = this.ev(re, sc); if (!this.compare(op, l, r, e.line)) return false; l = r; } return true;
        }
        case 'call': {
          let f; if (e.f.k === 'attr') f = this.getattr(this.ev(e.f.o, sc), e.f.n, e.f.line); else f = this.ev(e.f, sc);
          const args = e.args.map(a => this.ev(a, sc)), kw = {}; for (const [n, x] of e.kw) kw[n] = this.ev(x, sc);
          return this.call(f, args, kw, e.line);
        }
        case 'attr': return this.getattr(this.ev(e.o, sc), e.n, e.line);
        case 'idx': return this.index(this.ev(e.o, sc), e.i && e.i.k === 'slice' ? new SliceArg([e.i.a, e.i.b, e.i.c].map(x => (x ? nv(this.ev(x, sc)) : null))) : this.ev(e.i, sc), e.line);
        case 'lam': return new PyFunc('<lambda>', e.params, e.body, sc, true);
        case 'comp': {
          if (e.kind === 'dict') { const m = new Map(); this.iterGen(e, sc, s => m.set(this.ev(e.elt, s), this.ev(e.elt2, s))); return m; }
          const r = []; this.iterGen(e, sc, s => r.push(this.ev(e.elt, s))); return r;
        }
      }
      throw err('SyntaxError', 'this kind of code is not supported yet');
    }
    compare(op, a, b, line) {
      switch (op) {
        case '==': return eq(a, b); case '!=': return !eq(a, b);
        case '<': return order(a, b, op, line) < 0; case '>': return order(a, b, op, line) > 0;
        case '<=': return order(a, b, op, line) <= 0; case '>=': return order(a, b, op, line) >= 0;
        case 'is': return a === b; case 'is not': return a !== b;
        case 'in': return this.contains(b, a, line); case 'not in': return !this.contains(b, a, line);
      }
    }
    contains(c, x, line) {
      if (typeof c === 'string') { if (typeof x !== 'string') throw err('TypeError', "'in <string>' requires string as left operand, not " + typeName(x), line); return c.includes(x); }
      if (Array.isArray(c)) return c.some(y => eq(y, x)); if (c instanceof Map) return c.has(x); if (c instanceof NPArr) return c.data.some(y => eq(y, x));
      throw err('TypeError', "argument of type '" + typeName(c) + "' is not iterable", line);
    }
    index(o, i, line) {
      const arr = Array.isArray(o) ? o : o instanceof NPArr ? o.data : null;
      if (i instanceof SliceArg) {
        if (!(arr || typeof o === 'string')) throw err('TypeError', "'" + typeName(o) + "' object is not subscriptable", line);
        const len = o.length !== undefined ? o.length : arr.length; let [a, b, c] = i.v; c = c === null ? 1 : c;
        const norm = (x, d) => (x === null ? d : x < 0 ? Math.max(0, len + x) : Math.min(x, len)); const r = [];
        if (c > 0) for (let k = norm(a, 0); k < norm(b, len); k += c) r.push(arr ? arr[k] : o[k]); else for (let k = a === null ? len - 1 : (a < 0 ? len + a : Math.min(a, len - 1)); k > (b === null ? -1 : (b < 0 ? len + b : b)); k += c) r.push(arr ? arr[k] : o[k]);
        return typeof o === 'string' ? r.join('') : o instanceof NPArr ? new NPArr(r) : (o.tuple ? tup(r) : r);
      }
      if (o instanceof Map) { const k = isF(i) && Number.isInteger(i.v) ? i.v : i; if (!o.has(k)) throw err('KeyError', repr(i), line); return o.get(k); }
      if (arr || typeof o === 'string') {
        if (!isInt(i)) throw err('TypeError', (typeof o === 'string' ? 'string' : 'list') + ' indices must be integers, not ' + typeName(i), line);
        const n = nv(i), len = o.length !== undefined ? o.length : arr.length, j = n < 0 ? len + n : n;
        if (j < 0 || j >= len) throw err('IndexError', (typeof o === 'string' ? 'string' : 'list') + ' index out of range', line);
        return arr ? arr[j] : o[j];
      }
      throw err('TypeError', "'" + typeName(o) + "' object is not subscriptable", line);
    }
  }
  Py.Interp = Interp; Py.Scope = Scope; Py.PyFunc = PyFunc; Py.tup = tup; Py.toList = toList; Py.binop = binop; Py.typeName = typeName; Py.eq = eq;
  Py.run = function (code) {
    const I = new Interp(); let parsed;
    const fail = e => {
      if (e instanceof PyErr) return { ok: false, type: e.pyType, msg: e.message, line: e.line, out: I.out };
      if (e === BREAK || e === CONT) return { ok: false, type: 'SyntaxError', msg: "'break' or 'continue' outside a loop", out: I.out };
      if (e instanceof Return) return { ok: false, type: 'SyntaxError', msg: "'return' outside a function", out: I.out };
      if (e instanceof RangeError) return { ok: false, type: 'RecursionError', msg: 'maximum recursion depth exceeded', out: I.out };
      return { ok: false, internal: true, msg: String(e && e.message || e), out: I.out };
    };
    try { parsed = Py.parse(code); } catch (e) { return fail(e); }
    I.feat = parsed.feat;
    try { I.exec(parsed.ast, I.globals); } catch (e) { return fail(e); }
    return {
      ok: true, out: I.out, vars: I.globals.vars, feat: I.feat, interp: I,
      call(name, args) { const f = I.globals.vars.get(name); if (!(f instanceof PyFunc)) throw err('NameError', "function '" + name + "' is not defined"); return I.callFunc(f, args, {}, 0); }
    };
  };
})(Py);
