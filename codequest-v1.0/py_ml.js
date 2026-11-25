/* Mini Python: small numpy, math and scikit-learn look-alikes. Part 3 of 3. They really compute the answers. */
(function (Py) {
  const { F, NPArr, nv, tup, toList } = Py;
  const mod = (name, attrs) => ({ __py: true, cls: 'module', attrs, repr: () => "<module '" + name + "'>" });
  const clean = x => +x.toFixed(10);
  const rows = X => toList(X).map(r => (Array.isArray(r) ? r.map(nv) : r instanceof NPArr ? r.data.map(nv) : [nv(r)]));
  const nums = x => toList(x).map(nv);
  const arr = x => new NPArr(toList(x));
  const spl = (a, nTrain) => { const l = toList(a); const [t, e] = [l.slice(0, nTrain), l.slice(nTrain)]; return a instanceof NPArr ? [new NPArr(t), new NPArr(e)] : [t, e]; };

  const numpy = mod('numpy', {
    array: a => arr(a[0]),
    mean: a => new F(nums(a[0]).reduce((s, v) => s + v, 0) / nums(a[0]).length),
    sum: a => nums(a[0]).reduce((s, v) => s + v, 0),
    max: a => Math.max(...nums(a[0])), min: a => Math.min(...nums(a[0])),
    std: a => { const v = nums(a[0]), m = v.reduce((s, x) => s + x, 0) / v.length; return new F(Math.sqrt(v.reduce((s, x) => s + (x - m) * (x - m), 0) / v.length)); },
    arange: a => { const v = a.map(nv); const [s, e, st] = v.length === 1 ? [0, v[0], 1] : [v[0], v[1], v[2] || 1]; const r = []; for (let i = s; i < e; i += st) r.push(i); return new NPArr(r); },
    zeros: a => new NPArr(Array(nv(a[0])).fill(new F(0))), ones: a => new NPArr(Array(nv(a[0])).fill(new F(1)))
  });
  const math = mod('math', {
    sqrt: a => new F(Math.sqrt(nv(a[0]))), pi: new F(Math.PI), e: new F(Math.E),
    floor: a => Math.floor(nv(a[0])), ceil: a => Math.ceil(nv(a[0])), pow: a => new F(Math.pow(nv(a[0]), nv(a[1])))
  });

  function solve(A, b) {
    const n = b.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]]; if (Math.abs(M[c][c]) < 1e-12) continue;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
    }
    return M.map((r, i) => (Math.abs(r[i]) < 1e-12 ? 0 : r[n] / r[i]));
  }
  const accuracy = (t, p) => { const a = toList(t), b = toList(p); return a.filter((x, i) => Py.eq(x, b[i])).length / a.length; };

  function makeLR() {
    return {
      __py: true, cls: 'LinearRegression', attrs: {}, repr: () => 'LinearRegression()',
      methods: {
        fit(self, a) {
          const X = rows(a[0]), y = nums(a[1]); const A = X.map(r => [1, ...r]), k = A[0].length;
          const AtA = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => A.reduce((s, r) => s + r[i] * r[j], 0)));
          const Aty = Array.from({ length: k }, (_, i) => A.reduce((s, r, n) => s + r[i] * y[n], 0));
          const beta = solve(AtA, Aty); self.attrs.intercept_ = new F(clean(beta[0])); self.attrs.coef_ = new NPArr(beta.slice(1).map(b => new F(clean(b)))); return self;
        },
        predict(self, a) { const b = [nv(self.attrs.intercept_), ...self.attrs.coef_.data.map(nv)]; return new NPArr(rows(a[0]).map(r => new F(clean(b[0] + r.reduce((s, x, i) => s + x * b[i + 1], 0))))); },
        score(self, a, kw, I) {
          const y = nums(a[1]), p = self.methods.predict(self, [a[0]]).data.map(nv); if (y.length < 2) return new F(NaN);
          const m = y.reduce((s, v) => s + v, 0) / y.length, ssr = y.reduce((s, v, i) => s + (v - p[i]) * (v - p[i]), 0), sst = y.reduce((s, v) => s + (v - m) * (v - m), 0);
          return new F(sst === 0 ? (ssr === 0 ? 1 : 0) : clean(1 - ssr / sst));
        }
      }
    };
  }
  function gini(ys) { const c = new Map(); ys.forEach(y => c.set(y, (c.get(y) || 0) + 1)); return 1 - [...c.values()].reduce((s, v) => s + (v / ys.length) ** 2, 0); }
  function major(ys) { const c = new Map(); ys.forEach(y => c.set(y, (c.get(y) || 0) + 1)); return [...c].sort((a, b) => b[1] - a[1])[0][0]; }
  function build(X, y, depth, maxD) {
    if (new Set(y).size === 1 || depth >= maxD) return { leaf: major(y) };
    let best = null;
    for (let f = 0; f < X[0].length; f++) {
      const vals = [...new Set(X.map(r => r[f]))].sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const t = (vals[i] + vals[i + 1]) / 2, L = [], R = []; X.forEach((r, n) => (r[f] <= t ? L : R).push(y[n]));
        const g = (L.length * gini(L) + R.length * gini(R)) / y.length; if (!best || g < best.g - 1e-12) best = { g, f, t };
      }
    }
    if (!best) return { leaf: major(y) };
    const li = [], ri = []; X.forEach((r, n) => (r[best.f] <= best.t ? li : ri).push(n));
    return { f: best.f, t: best.t, l: build(li.map(i => X[i]), li.map(i => y[i]), depth + 1, maxD), r: build(ri.map(i => X[i]), ri.map(i => y[i]), depth + 1, maxD) };
  }
  const walk = (n, r) => (n.leaf !== undefined ? n.leaf : walk(r[n.f] <= n.t ? n.l : n.r, r));
  function makeTree(kw) {
    const maxD = kw.max_depth ? nv(kw.max_depth) : 99;
    return {
      __py: true, cls: 'DecisionTreeClassifier', attrs: {}, repr: () => 'DecisionTreeClassifier()',
      methods: {
        fit(self, a) { self.tree = build(rows(a[0]), toList(a[1]).map(nv), 0, maxD); return self; },
        predict(self, a) { return new NPArr(rows(a[0]).map(r => walk(self.tree, r))); },
        score(self, a) { return new F(accuracy(a[1], self.methods.predict(self, [a[0]]))); }
      }
    };
  }
  Py.modules.numpy = numpy; Py.modules.math = math; Py.modules.sklearn = mod('sklearn', {});
  Py.modules['sklearn.model_selection'] = mod('sklearn.model_selection', {
    train_test_split(a, kw) {
      const n = toList(a[0]).length, ts = kw.test_size === undefined ? 0.25 : nv(kw.test_size);
      const nTest = Number.isInteger(ts) && !(kw.test_size instanceof F) ? ts : Math.ceil(ts * n - 1e-9), nTrain = n - nTest, out = [];
      a.forEach(x => out.push(...spl(x, nTrain))); return out;
    }
  });
  Py.modules['sklearn.linear_model'] = mod('sklearn.linear_model', { LinearRegression: () => makeLR() });
  Py.modules['sklearn.tree'] = mod('sklearn.tree', { DecisionTreeClassifier: (a, kw) => makeTree(kw) });
  Py.modules['sklearn.metrics'] = mod('sklearn.metrics', {
    accuracy_score: a => new F(accuracy(a[0], a[1])),
    mean_squared_error: a => { const t = nums(a[0]), p = nums(a[1]); return new F(clean(t.reduce((s, v, i) => s + (v - p[i]) ** 2, 0) / t.length)); }
  });
})(Py);
