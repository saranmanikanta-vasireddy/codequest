/* Level flow: 1 Concept -> 2 Learn -> 3 Challenge (with hint dialog) -> meme reward. */
function level(wid, i) {
  const w = world$(wid), l = w.levels[i]; header(); location.hash = wid;
  let wrong = 0, hinted = false, step = 1;
  window.CTX = { w, l, i, err: '', reveal: () => { hinted = true; } };
  const steps = ['Concept', 'Learn', 'Challenge'];
  const isPrev = w.lang === 'html' || w.lang === 'css';
  const frame = '<iframe id="pv" class="pv" sandbox="allow-same-origin" title="Live preview"></iframe>';
  const page = (css) => '<style>body{font-family:sans-serif;margin:12px;background:#fff;color:#222}</style><style>' + css + '</style>' + (l.html || '');

  function draw() {
    $('#app').innerHTML = `<p><button class="btn alt sm" id="back">&larr; ${w.name}</button></p>
    <ol class="stepper">${steps.map((s, n) => `<li class="${n + 1 === step ? 'on' : n + 1 < step ? 'ok' : ''}">${n + 1}. ${s}</li>`).join('')}</ol><div id="stage"></div>`;
    $('#back').onclick = () => world(wid);
    [stage1, stage2, stage3][step - 1]();
  }
  function stage1() {
    $('#stage').innerHTML = `<div class="card"><h3 style="color:${w.color}">Level ${i + 1}: ${esc(l.title)}</h3>
    <div class="story"><span class="tagl">Real life</span> ${l.story}</div>
    <h3 class="sub">The concept</h3><p>${l.lesson}</p><div class="row"><button class="btn" id="nx">Next: see it in action</button></div></div>`;
    $('#nx').onclick = () => { step = 2; draw(); };
  }
  function stage2() {
    const editable = w.lang !== 'python';
    $('#stage').innerHTML = `<div class="card"><h3>See it in action</h3><p class="hint">${editable ? 'This is a live example. Change it and press Run to learn by playing.' : 'Read the example and the output. You will write your own next.'}</p>
    ${editable ? `<textarea class="code small" id="ex" spellcheck="false" aria-label="Example code">${esc(l.ex)}</textarea>` : `<pre class="ex">${esc(l.ex)}</pre>`}
    ${isPrev ? frame : ''}<div class="out" id="eo">${editable ? 'Press Run example.' : esc(l.exOut || 'Output depends on your data. Try it in the challenge.')}</div>
    <div class="row">${editable ? '<button class="btn alt" id="rx">Run example</button>' : ''}<button class="btn" id="nx">Start the challenge</button></div></div>`;
    $('#nx').onclick = () => { step = 3; draw(); };
    if (!editable) return;
    const run = () => {
      const code = $('#ex').value, o = $('#eo');
      if (w.lang === 'js') { const r = Engine.runJS(code); o.textContent = r.error ? 'x ' + r.error : (r.out || '(no output)'); }
      else if (w.lang === 'sql') { try { const t = Engine.sql(code, TABLES); o.innerHTML = '<table><tr>' + t.cols.map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' + t.rows.map(x => '<tr>' + x.map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('') + '</table>'; } catch (e) { o.textContent = 'x ' + e.message; } }
      else if (w.lang === 'html') { $('#pv').srcdoc = code; o.textContent = 'Preview updated above.'; }
      else { $('#pv').srcdoc = page(code); o.textContent = 'Preview updated above.'; }
    };
    $('#rx').onclick = run; run();
  }
  function stage3() {
    $('#stage').innerHTML = `<div class="lvl"><div class="card"><h3 style="color:${w.color}">Challenge</h3><div class="task"><b>Quest:</b> ${l.task}</div>
    <p class="hint">Stuck? The hint button gives a clue first. Using it removes the first-try bonus.</p><div class="row"><button class="btn alt" id="hbtn">Hint</button><button class="btn alt" id="rv">Read concept again</button></div></div>
    <div class="card"><textarea class="code" id="code" spellcheck="false" aria-label="Code editor">${esc(l.starter || '')}</textarea>
    <div class="row"><button class="btn" id="run">Run &amp; Check</button></div>${isPrev ? frame : ''}<div class="out" id="out">Output appears here.</div></div></div>`;
    $('#rv').onclick = () => modal(`<h3>${esc(l.title)}</h3><p>${l.lesson}</p><pre class="ex">${esc(l.ex)}</pre><button class="btn" id="cm">Close</button>`) || ($('#cm').onclick = closeModal);
    $('#code').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; } });
    $('#hbtn').onclick = () => {
      hinted = true;
      modal(`<h3>Hint</h3><p class="clue">${l.clue}</p><div id="sol" hidden><p class="hint">Full solution:</p><pre class="ex">${esc(l.hint)}</pre></div>
      <div class="row"><button class="btn alt" id="shs">Show full solution</button><button class="btn" id="cm">Got it</button></div>`);
      $('#cm').onclick = closeModal; $('#shs').onclick = () => { $('#sol').hidden = false; $('#shs').hidden = true; };
    };
    $('#run').onclick = check;
  }
  async function check() {
    const code = $('#code').value, out = $('#out'); let r;
    if (w.lang === 'js') { r = Engine.runJS(code); if (r.ok && r.out.trim() !== l.expected) { r.ok = false; r.error = 'Output was different. Expected: ' + l.expected; } }
    else if (w.lang === 'python') r = Engine.checkPython(code, l);
    else if (w.lang === 'html') { r = Engine.checkHTML(code, l); $('#pv').srcdoc = code; if (r.ok) r.out = 'Your page looks right.'; }
    else if (w.lang === 'css') { r = await Engine.checkCSS(code, l, $('#pv')); if (r.ok) r.out = 'Your styles look right.'; }
    else r = Engine.checkSQL(code, l, TABLES);
    CTX.err = r.ok ? '' : (r.error || '');
    if (r.table) out.innerHTML = '<table><tr>' + r.table.cols.map(c => `<th>${esc(c)}</th>`).join('') + '</tr>' + r.table.rows.map(x => '<tr>' + x.map(v => `<td>${esc(v)}</td>`).join('') + '</tr>').join('') + '</table>';
    else out.textContent = r.out || (r.ok && l.expected ? l.expected : '');
    if (!r.ok) {
      wrong++; P().streak = 0; save(); header(); out.className = 'out bad';
      out.insertAdjacentHTML('beforeend', '<div class="errl">x ' + esc(r.error) + '</div>' + (wrong >= 2 ? Memes.html(Memes.pick('wrong', prof())) : ''));
      return;
    }
    out.className = 'out good';
    const d = P().done[wid] = P().done[wid] || []; let gain = 0;
    const first = !d.includes(i);
    if (first) { d.push(i); gain = l.xp + (!wrong && !hinted ? 10 : 0); P().xp += gain; }
    P().streak++; awardBadges(); save(); header();
    const finished = doneCount(w) === w.levels.length, nx = i + 1 < w.levels.length;
    const kind = finished && first ? 'worlddone' : P().streak % 3 === 0 ? 'streak' : 'success';
    modal(`<h3>${first ? '+' + gain + ' XP' : 'Correct again'}</h3>${Memes.html(Memes.pick(kind, prof()))}
      <p class="hint">${!wrong && !hinted && first ? 'First try, no hint: +10 bonus included.' : ''}</p>
      <div class="row">${nx ? '<button class="btn" id="nl">Next level</button>' : ''}<button class="btn alt" id="bk">${finished ? 'Back to roadmap' : 'Level map'}</button></div>`);
    if (nx) $('#nl').onclick = () => { closeModal(); level(wid, i + 1); };
    $('#bk').onclick = () => { closeModal(); finished ? home() : world(wid); };
  }
  draw();
}
