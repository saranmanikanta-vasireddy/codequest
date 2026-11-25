/* Mini Python: tokenizer and parser. Part 1 of 3 (py_parse.js, py_run.js, py_ml.js). */
const Py = {};
(function (Py) {
  class F { constructor(v) { this.v = v; } }            // a Python float (ints are plain JS numbers)
  class PyErr extends Error { constructor(type, msg, line) { super(msg); this.pyType = type; this.line = line; } }
  Py.F = F; Py.PyErr = PyErr;
  const UNSUPPORTED = ['class', 'try', 'except', 'finally', 'with', 'del', 'assert', 'raise', 'yield', 'nonlocal', 'async', 'await'];

  function tokenize(src) {
    const toks = [], n = src.length, indents = [0];
    let i = 0, line = 1, depth = 0, bol = true;
    const push = (t, v, extra) => toks.push(Object.assign({ t, v, line }, extra));
    const OPS = ['**=', '//=', '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '->'];
    while (i < n) {
      if (bol && depth === 0) {
        let col = 0, j = i;
        while (j < n && (src[j] === ' ' || src[j] === '\t')) { col += src[j] === '\t' ? 4 : 1; j++; }
        if (j >= n) break;
        if (src[j] === '\r') { i = j + 1; continue; }
        if (src[j] === '\n') { i = j + 1; line++; continue; }
        if (src[j] === '#') { while (j < n && src[j] !== '\n') j++; i = j; continue; }
        if (col > indents[indents.length - 1]) { indents.push(col); push('INDENT'); }
        else {
          while (col < indents[indents.length - 1]) { indents.pop(); push('DEDENT'); }
          if (col !== indents[indents.length - 1]) throw new PyErr('IndentationError', 'unindent does not match any outer indentation level', line);
        }
        i = j; bol = false; continue;
      }
      const c = src[i];
      if (c === '\n') { if (depth === 0) { push('NEWLINE'); bol = true; } line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '\\' && src[i + 1] === '\n') { i += 2; line++; continue; }
      const sm = /^([fFrRbBuU]{0,2})(['"])/.exec(src.substr(i, 3));
      if (sm) {
        const prefix = sm[1], q = sm[2], raw = /r/i.test(prefix), isF = /f/i.test(prefix);
        let k = i + prefix.length; const triple = src.substr(k, 3) === q + q + q; k += triple ? 3 : 1;
        let buf = '';
        for (;;) {
          if (k >= n) throw new PyErr('SyntaxError', 'unterminated string (missing closing quote)', line);
          const ch = src[k];
          if (triple ? src.substr(k, 3) === q + q + q : ch === q) { k += triple ? 3 : 1; break; }
          if (ch === '\n' && !triple) throw new PyErr('SyntaxError', 'unterminated string (missing closing quote)', line);
          if (ch === '\\' && !raw) {
            const e = src[k + 1];
            const map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"', r: '\r', 0: '\0' };
            if (e === '\n') { k += 2; line++; continue; }
            if (e in map) { buf += map[e]; k += 2; continue; }
            buf += ch; k++; continue;
          }
          if (ch === '\n') line++;
          buf += ch; k++;
        }
        push('STR', buf, { f: isF }); i = k; continue;
      }
      let m = /^(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?/.exec(src.substr(i, 40));
      if (m && !(c === '.' && !/\d/.test(src[i + 1]))) {
        const isFloat = /[.eE]/.test(m[0]); push('NUM', parseFloat(m[0]), { float: isFloat }); i += m[0].length; continue;
      }
      m = /^[A-Za-z_]\w*/.exec(src.substr(i, 80));
      if (m) { push('NAME', m[0]); i += m[0].length; continue; }
      const three = src.substr(i, 3), two = src.substr(i, 2);
      if (OPS.includes(three)) { push('OP', three); i += 3; continue; }
      if (OPS.includes(two)) { push('OP', two); i += 2; continue; }
      if ('+-*/%<>=()[]{},:.;@'.includes(c)) {
        if ('([{'.includes(c)) depth++; if (')]}'.includes(c)) depth = Math.max(0, depth - 1);
        push('OP', c); i++; continue;
      }
      throw new PyErr('SyntaxError', "invalid character '" + c + "'" + (/[‘’“”]/.test(c) ? ' (use straight quotes " or \' instead of curly quotes)' : ''), line);
    }
    if (toks.length && toks[toks.length - 1].t !== 'NEWLINE') push('NEWLINE');
    while (indents.length > 1) { indents.pop(); push('DEDENT'); }
    push('EOF');
    return toks;
  }

  class Parser {
    constructor(toks) { this.t = toks; this.p = 0; this.feat = new Set(); }
    peek() { return this.t[this.p]; }
    next() { return this.t[this.p++]; }
    is(t, v) { const k = this.t[this.p]; return k.t === t && (v === undefined || k.v === v); }
    eat(t, v) { return this.is(t, v) ? this.next() : null; }
    err(msg, k) { throw new PyErr('SyntaxError', msg, (k || this.peek()).line); }
    expect(t, v, msg) { const k = this.eat(t, v); if (!k) this.err(msg || 'expected ' + (v ? "'" + v + "'" : t)); return k; }
    program() { const out = []; while (!this.is('EOF')) out.push(...this.statement()); return out; }
    statement() {
      const k = this.peek();
      if (k.t === 'INDENT') this.err('unexpected indent');
      if (k.t === 'DEDENT') { this.next(); return []; }
      if (k.t === 'NAME') {
        if (UNSUPPORTED.includes(k.v)) this.err("'" + k.v + "' is not supported in this game yet");
        if (k.v === 'if') return [this.ifStmt()];
        if (k.v === 'while') { this.next(); this.feat.add('while'); const c = this.cond(); return [{ k: 'while', c, body: this.block(), line: k.line }]; }
        if (k.v === 'for') {
          this.next(); this.feat.add('for'); const target = this.targets(); this.expect('NAME', 'in', "expected 'in' in the for loop");
          const it = this.testlist(); return [{ k: 'for', target, it, body: this.block(), line: k.line }];
        }
        if (k.v === 'def') {
          this.next(); this.feat.add('def'); const name = this.expect('NAME').v; this.expect('OP', '(', "expected '(' after the function name");
          const params = [];
          while (!this.is('OP', ')')) {
            const pn = this.expect('NAME', undefined, 'expected a parameter name').v; let def = null;
            if (this.eat('OP', '=')) def = this.test(); params.push({ n: pn, def });
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')', "expected ')'"); return [{ k: 'def', name, params, body: this.block(), line: k.line }];
        }
      }
      return this.simpleLine();
    }
    cond() { const c = this.test(); if (this.is('OP', '=')) this.err("invalid syntax. Maybe you meant '==' instead of '='?"); return c; }
    ifStmt() {
      const k = this.next(); this.feat.add('if');
      const node = { k: 'if', c: this.cond(), body: null, orelse: [], line: k.line }; node.body = this.block(); let cur = node;
      while (this.is('NAME', 'elif')) {
        const e = this.next(); this.feat.add('elif'); const n2 = { k: 'if', c: this.cond(), body: null, orelse: [], line: e.line }; n2.body = this.block(); cur.orelse = [n2]; cur = n2;
      }
      if (this.is('NAME', 'else')) { this.next(); this.feat.add('else'); cur.orelse = this.block(); }
      return node;
    }
    block() {
      this.expect('OP', ':', "expected ':' at the end of this line");
      if (this.eat('NEWLINE')) {
        if (!this.eat('INDENT')) this.err('expected an indented block (indent the next line by 4 spaces)');
        const body = [];
        while (!this.is('DEDENT') && !this.is('EOF')) body.push(...this.statement());
        this.eat('DEDENT'); return body;
      }
      return this.simpleLine();
    }
    simpleLine() {
      const out = [this.simple()];
      while (this.eat('OP', ';')) { if (this.is('NEWLINE')) break; out.push(this.simple()); }
      if (!this.is('EOF')) { if (!this.eat('NEWLINE')) this.err('invalid syntax (check for a missing operator, comma or bracket)'); }
      return out;
    }
    simple() {
      const k = this.peek(), line = k.line;
      if (k.t === 'NAME') {
        if (UNSUPPORTED.includes(k.v)) this.err("'" + k.v + "' is not supported in this game yet");
        if (k.v === 'pass' || k.v === 'break' || k.v === 'continue') { this.next(); return { k: k.v, line }; }
        if (k.v === 'return') { this.next(); this.feat.add('return'); const v = this.endOfExpr() ? null : this.testlist(); return { k: 'return', v, line }; }
        if (k.v === 'global') { this.next(); const names = [this.expect('NAME').v]; while (this.eat('OP', ',')) names.push(this.expect('NAME').v); return { k: 'global', names, line }; }
        if (k.v === 'import') {
          this.next(); this.feat.add('import'); const names = [];
          do { let mod = this.expect('NAME').v; while (this.eat('OP', '.')) mod += '.' + this.expect('NAME').v; let alias = null; if (this.eat('NAME', 'as')) alias = this.expect('NAME').v; names.push([mod, alias]); } while (this.eat('OP', ','));
          return { k: 'import', names, line };
        }
        if (k.v === 'from') {
          this.next(); this.feat.add('import'); let mod = this.expect('NAME').v; while (this.eat('OP', '.')) mod += '.' + this.expect('NAME').v;
          this.expect('NAME', 'import'); const names = [];
          do { const nm = this.expect('NAME').v; let alias = null; if (this.eat('NAME', 'as')) alias = this.expect('NAME').v; names.push([nm, alias]); } while (this.eat('OP', ','));
          return { k: 'from', mod, names, line };
        }
      }
      const first = this.testlist();
      if (this.is('OP', '=')) {
        const targets = [first]; let value;
        while (this.eat('OP', '=')) { value = this.testlist(); targets.push(value); }
        targets.pop(); targets.forEach(t => this.checkTarget(t, line));
        return { k: 'assign', targets, value, line };
      }
      const k2 = this.peek();
      if (k2.t === 'OP' && ['+=', '-=', '*=', '/=', '//=', '%=', '**='].includes(k2.v)) {
        this.next(); this.checkTarget(first, line); return { k: 'aug', op: k2.v.slice(0, -1), target: first, value: this.testlist(), line };
      }
      return { k: 'expr', e: first, line };
    }
    checkTarget(t, line) {
      if (['name', 'idx', 'attr'].includes(t.k)) return;
      if (t.k === 'tuple' || t.k === 'list') return t.items.forEach(x => this.checkTarget(x, line));
      throw new PyErr('SyntaxError', 'cannot assign to this expression (the left side of = must be a variable)', line);
    }
    targets() {
      const first = this.arith();
      if (!this.is('OP', ',')) return first;
      const items = [first]; while (this.eat('OP', ',')) { if (this.is('NAME', 'in')) break; items.push(this.arith()); }
      return { k: 'tuple', items };
    }
    endOfExpr() { const k = this.peek(); return k.t === 'NEWLINE' || k.t === 'EOF' || (k.t === 'OP' && [')', ']', '}', '=', ':', ';'].includes(k.v)); }
    testlist() {
      const first = this.test(); if (!this.is('OP', ',')) return first;
      const items = [first]; while (this.eat('OP', ',')) { if (this.endOfExpr()) break; items.push(this.test()); }
      return { k: 'tuple', items };
    }
    test() {
      if (this.is('NAME', 'lambda')) {
        this.next(); this.feat.add('lambda'); const params = [];
        while (!this.is('OP', ':')) { params.push({ n: this.expect('NAME').v, def: null }); if (!this.eat('OP', ',')) break; }
        this.expect('OP', ':'); return { k: 'lam', params, body: this.test() };
      }
      const c = this.orTest();
      if (this.is('NAME', 'if')) { this.next(); const cond = this.orTest(); this.expect('NAME', 'else', "expected 'else' in the one-line if"); return { k: 'ifx', c: cond, a: c, b: this.test() }; }
      return c;
    }
    orTest() { let l = this.andTest(); while (this.is('NAME', 'or')) { this.next(); l = { k: 'bool', op: 'or', l, r: this.andTest() }; } return l; }
    andTest() { let l = this.notTest(); while (this.is('NAME', 'and')) { this.next(); l = { k: 'bool', op: 'and', l, r: this.notTest() }; } return l; }
    notTest() { if (this.is('NAME', 'not')) { this.next(); return { k: 'not', e: this.notTest() }; } return this.comparison(); }
    comparison() {
      const line = this.peek().line, first = this.arith(), ops = [];
      for (;;) {
        const k = this.peek(); let op = null;
        if (k.t === 'OP' && ['==', '!=', '<', '>', '<=', '>='].includes(k.v)) { op = k.v; this.next(); }
        else if (k.t === 'NAME' && k.v === 'in') { op = 'in'; this.next(); }
        else if (k.t === 'NAME' && k.v === 'not' && this.t[this.p + 1].t === 'NAME' && this.t[this.p + 1].v === 'in') { this.next(); this.next(); op = 'not in'; }
        else if (k.t === 'NAME' && k.v === 'is') { this.next(); op = this.eat('NAME', 'not') ? 'is not' : 'is'; }
        else break;
        ops.push([op, this.arith()]);
      }
      return ops.length ? { k: 'cmp', first, ops, line } : first;
    }
    arith() {
      let l = this.term();
      while (this.is('OP', '+') || this.is('OP', '-')) { const op = this.next().v, line = this.t[this.p - 1].line; l = { k: 'bin', op, l, r: this.term(), line }; }
      return l;
    }
    term() {
      let l = this.factor();
      while (['*', '/', '//', '%'].some(o => this.is('OP', o))) { const tk = this.next(); l = { k: 'bin', op: tk.v, l, r: this.factor(), line: tk.line }; }
      return l;
    }
    factor() {
      if (this.is('OP', '-') || this.is('OP', '+')) { const op = this.next().v; return { k: 'un', op, e: this.factor() }; }
      return this.power();
    }
    power() {
      const l = this.trailer();
      if (this.is('OP', '**')) { const tk = this.next(); return { k: 'bin', op: '**', l, r: this.factor(), line: tk.line }; }
      return l;
    }
    trailer() {
      let e = this.atom();
      for (;;) {
        const k = this.peek();
        if (k.t === 'OP' && k.v === '(') {
          this.next(); const args = [], kw = [];
          while (!this.is('OP', ')')) {
            if (this.peek().t === 'NAME' && this.t[this.p + 1].t === 'OP' && this.t[this.p + 1].v === '=') { const nm = this.next().v; this.next(); kw.push([nm, this.test()]); }
            else {
              const a = this.test();
              if (this.is('NAME', 'for')) args.push(this.comprehension('gen', a)); else args.push(a);
            }
            if (!this.eat('OP', ',')) break;
          }
          this.expect('OP', ')', "expected ')' (a bracket is not closed)"); e = { k: 'call', f: e, args, kw, line: k.line };
        } else if (k.t === 'OP' && k.v === '[') {
          this.next(); e = { k: 'idx', o: e, i: this.subscript(), line: k.line }; this.expect('OP', ']', "expected ']'");
        } else if (k.t === 'OP' && k.v === '.') {
          this.next(); e = { k: 'attr', o: e, n: this.expect('NAME', undefined, 'expected a name after the dot').v, line: k.line };
        } else break;
      }
      return e;
    }
    subscript() {
      let a = null, b = null, c = null, isSlice = false;
      if (!this.is('OP', ':')) a = this.test();
      if (this.eat('OP', ':')) {
        isSlice = true; if (!this.is('OP', ']') && !this.is('OP', ':')) b = this.test();
        if (this.eat('OP', ':')) { if (!this.is('OP', ']')) c = this.test(); }
      }
      return isSlice ? { k: 'slice', a, b, c } : a;
    }
    comprehension(kind, elt, elt2) {
      const gens = [];
      while (this.is('NAME', 'for')) {
        this.next(); const target = this.targets(); this.expect('NAME', 'in'); const it = this.orTest(); const conds = [];
        while (this.is('NAME', 'if')) { this.next(); conds.push(this.orTest()); }
        gens.push({ target, it, conds });
      }
      this.feat.add('comprehension'); return { k: 'comp', kind, elt, elt2, gens };
    }
    atom() {
      const k = this.next(), line = k.line;
      if (k.t === 'NUM') return { k: 'num', v: k.v, float: k.float };
      if (k.t === 'STR') {
        let s = k.v, f = k.f, parts = null;
        const list = [k]; while (this.peek().t === 'STR') list.push(this.next());
        if (list.some(x => x.f)) { this.feat.add('fstring'); return { k: 'fstr', parts: list.flatMap(x => x.f ? this.fparts(x.v, x.line) : [x.v]), line }; }
        return { k: 'str', v: list.map(x => x.v).join('') };
      }
      if (k.t === 'NAME') {
        if (k.v === 'True') return { k: 'const', v: true }; if (k.v === 'False') return { k: 'const', v: false }; if (k.v === 'None') return { k: 'const', v: null };
        if (UNSUPPORTED.includes(k.v) || ['if', 'else', 'elif', 'for', 'while', 'def', 'return', 'in', 'is', 'and', 'or', 'import', 'from', 'pass', 'break', 'continue', 'lambda', 'not', 'as', 'global'].includes(k.v)) this.err("unexpected '" + k.v + "' (check the line before it)", k);
        return { k: 'name', v: k.v, line };
      }
      if (k.t === 'OP' && k.v === '(') {
        if (this.eat('OP', ')')) return { k: 'tuple', items: [] };
        const first = this.test();
        if (this.is('NAME', 'for')) { const c = this.comprehension('gen', first); this.expect('OP', ')'); return c; }
        if (this.is('OP', ',')) { const items = [first]; while (this.eat('OP', ',')) { if (this.is('OP', ')')) break; items.push(this.test()); } this.expect('OP', ')', "expected ')'"); return { k: 'tuple', items }; }
        this.expect('OP', ')', "expected ')' (a bracket is not closed)"); return first;
      }
      if (k.t === 'OP' && k.v === '[') {
        if (this.eat('OP', ']')) return { k: 'list', items: [] };
        const first = this.test();
        if (this.is('NAME', 'for')) { const c = this.comprehension('list', first); this.expect('OP', ']'); return c; }
        const items = [first]; while (this.eat('OP', ',')) { if (this.is('OP', ']')) break; items.push(this.test()); }
        this.expect('OP', ']', "expected ']' (a bracket is not closed)"); return { k: 'list', items };
      }
      if (k.t === 'OP' && k.v === '{') {
        if (this.eat('OP', '}')) return { k: 'dict', pairs: [] };
        const first = this.test();
        if (!this.is('OP', ':')) this.err('sets are not supported in this game yet', k);
        this.next(); const v1 = this.test();
        if (this.is('NAME', 'for')) { const c = this.comprehension('dict', first, v1); this.expect('OP', '}'); return c; }
        const pairs = [[first, v1]];
        while (this.eat('OP', ',')) { if (this.is('OP', '}')) break; const a = this.test(); this.expect('OP', ':', "expected ':' between key and value"); pairs.push([a, this.test()]); }
        this.expect('OP', '}', "expected '}' (a bracket is not closed)"); return { k: 'dict', pairs };
      }
      if (k.t === 'NEWLINE' || k.t === 'EOF') this.err('unexpected end of line (something is missing here)', k);
      this.err("invalid syntax near '" + (k.v === undefined ? k.t : k.v) + "'", k);
    }
    fparts(s, line) {
      const parts = []; let buf = '', i = 0;
      while (i < s.length) {
        const c = s[i];
        if (c === '{' && s[i + 1] === '{') { buf += '{'; i += 2; continue; }
        if (c === '}' && s[i + 1] === '}') { buf += '}'; i += 2; continue; }
        if (c === '}') throw new PyErr('SyntaxError', "f-string: single '}' is not allowed", line);
        if (c === '{') {
          if (buf) parts.push(buf); buf = '';
          let j = i + 1, d = 0, q = null, spec = null, exprEnd = -1;
          for (; j < s.length; j++) {
            const ch = s[j];
            if (q) { if (ch === q) q = null; continue; }
            if (ch === '"' || ch === "'") { q = ch; continue; }
            if ('([{'.includes(ch)) d++;
            else if (')]'.includes(ch)) d--;
            else if (ch === '}') { if (d === 0) break; d--; }
            else if (ch === ':' && d === 0 && exprEnd < 0) { exprEnd = j; }
          }
          if (j >= s.length) throw new PyErr('SyntaxError', "f-string: expecting '}'", line);
          let exprText = exprEnd >= 0 ? s.slice(i + 1, exprEnd) : s.slice(i + 1, j); spec = exprEnd >= 0 ? s.slice(exprEnd + 1, j) : null;
          let conv = null; const cm = /!([rs])$/.exec(exprText); if (cm) { conv = cm[1]; exprText = exprText.slice(0, -2); }
          if (!exprText.trim()) throw new PyErr('SyntaxError', 'f-string: empty expression inside { }', line);
          const toks = tokenize('(' + exprText + ')'); toks.forEach(t => t.line = line);
          const sub = new Parser(toks); const e = sub.test();
          parts.push({ e, spec, conv }); i = j + 1; continue;
        }
        buf += c; i++;
      }
      if (buf) parts.push(buf);
      return parts;
    }
  }
  Py.parse = function (src) { const toks = tokenize(src), p = new Parser(toks), ast = p.program(); return { ast, feat: p.feat }; };
})(Py);
