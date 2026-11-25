/* HTML and CSS checkers that use the browser itself. */
Engine.checkHTML = function (code, lvl) {
  if (!code.trim()) return { ok: false, error: 'Write some HTML first.' };
  const doc = new DOMParser().parseFromString(code, 'text/html');
  for (const t of lvl.tests) {
    let els = [...doc.querySelectorAll(t.sel)];
    if (t.text) els = els.filter(e => e.textContent.toLowerCase().includes(t.text));
    if (els.length < (t.min || 1)) return { ok: false, error: t.msg };
  }
  return { ok: true };
};

Engine.checkCSS = function (code, lvl, frame) {
  return new Promise(resolve => {
    frame.onload = () => {
      try {
        const doc = frame.contentDocument, win = frame.contentWindow;
        for (const t of lvl.tests) {
          const el = doc.querySelector(t.sel);
          if (!el) return resolve({ ok: false, error: 'Missing element: ' + t.sel });
          const probe = doc.createElement('div'); doc.body.appendChild(probe);
          probe.style.setProperty(t.prop, t.val);
          const want = win.getComputedStyle(probe).getPropertyValue(t.prop);
          const have = win.getComputedStyle(el).getPropertyValue(t.prop);
          probe.remove();
          if (want !== have) return resolve({ ok: false, error: t.msg + '  (got "' + have + '")' });
        }
        resolve({ ok: true });
      } catch (e) { resolve({ ok: false, error: 'Could not check the preview: ' + e.message }); }
    };
    frame.srcdoc = '<style>body{font-family:sans-serif;margin:12px;background:#fff;color:#222}</style><style>' + code + '</style>' + lvl.html;
  });
};
