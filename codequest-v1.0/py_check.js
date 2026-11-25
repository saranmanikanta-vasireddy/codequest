/* Python checker: runs the student's code with the mini interpreter and compares the real output. */
const PYREQ = {
  py: [
    {},
    { vars: { biryani: v => v === 250 } },
    { vars: { total: v => v === 600 }, must: ['fstring'] },
    { must: ['if', 'else'], extras: [{ re: /attendance\s*=\s*80/, to: 'attendance = 60', out: 'Shortage', msg: 'when attendance is 60 it should print Shortage' }, { re: /attendance\s*=\s*80/, to: 'attendance = 75', out: 'Safe', msg: 'when attendance is exactly 75 it should print Safe (use >=)' }] },
    { must: ['for'] },
    { must: ['append'], vars: { cart: v => Array.isArray(v) && v.length === 3 } },
    { must: ['def', 'return'], calls: [['total', [2, 5], 10], ['total', [120, 3], 360]] },
    { vars: { student: v => v instanceof Map && v.get('name') === 'Sneha' && v.get('marks') === 91 } }
  ],
  ml: [
    { must: ['import'] }, {}, { must: ['fit'] }, { must: ['predict'] }, {}, {}, { must: ['fit', 'predict'] }, { must: ['fit'] }
  ]
};
const MUST_MSG = {
  for: 'Use a for loop.', if: 'Use an if statement.', else: 'Add an else branch.', def: 'Define the function with def.', return: 'Use return inside the function.',
  fstring: 'Use an f-string, like f"Total: {total}".', append: 'Use .append() to add the item.', import: 'Add the import line at the top.', fit: 'Train the model with .fit(X, y).', predict: 'Use .predict() to get the answer.'
};
WORLDS.forEach(w => { if (PYREQ[w.id]) w.levels.forEach((l, i) => { l.req = PYREQ[w.id][i] || {}; }); });

Engine.checkPythonPattern = Engine.checkPython;
Engine.checkPython = function (code, lvl) {
  if (!code.trim()) return { ok: false, error: 'Write some code first.' };
  const norm = s => String(s).replace(/\r/g, '').split('\n').map(l => l.trimEnd()).join('\n').trim();
  const req = lvl.req || {}; let r;
  try { r = Py.run(code); } catch (e) { return Engine.checkPythonPattern(code, lvl); }
  if (!r.ok) {
    if (r.internal) return Engine.checkPythonPattern(code, lvl);
    return { ok: false, out: r.out, error: r.type + ': ' + r.msg + (r.line ? ' (line ' + r.line + ')' : '') };
  }
  const exp = norm(lvl.expected || '');
  if (!norm(r.out)) return { ok: false, out: '', error: 'Your code ran but printed nothing. Use print(...) to show the result.' };
  if (exp && norm(r.out) !== exp) return { ok: false, out: r.out, error: 'Your code ran, but the output is different. Expected:\n' + exp };
  for (const f of req.must || []) if (!r.feat.has(f)) return { ok: false, out: r.out, error: MUST_MSG[f] || 'Use ' + f + '.' };
  for (const [name, test] of Object.entries(req.vars || {})) {
    if (!r.vars.has(name)) return { ok: false, out: r.out, error: 'Create a variable named ' + name + '.' };
    if (!test(r.vars.get(name))) return { ok: false, out: r.out, error: 'The variable ' + name + ' does not have the expected value.' };
  }
  for (const [fn, args, want] of req.calls || []) {
    let got; try { got = r.call(fn, args); } catch (e) { return { ok: false, out: r.out, error: 'Could not call ' + fn + '(' + args.join(', ') + '): ' + (e.message || e) }; }
    if (!Py.eq(got, want)) return { ok: false, out: r.out, error: fn + '(' + args.join(', ') + ') should give ' + want + ' but gave ' + Py.repr(got) };
  }
  for (const x of req.extras || []) {
    const c2 = code.replace(x.re, x.to); if (c2 === code) continue;
    const r2 = Py.run(c2);
    if (!r2.ok || norm(r2.out) !== x.out) return { ok: false, out: r.out, error: 'Your code works for the example, but it should also work for other values: ' + x.msg + '.' };
  }
  return { ok: true, out: r.out };
};
