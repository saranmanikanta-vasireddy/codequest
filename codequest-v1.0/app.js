const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ORDER = ['html', 'css', 'js', 'py', 'sql', 'ml'];
const STATES = ['Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Karnataka', 'Kerala', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Bihar', 'West Bengal', 'Odisha', 'Punjab', 'Haryana', 'Delhi', 'Assam', 'Other Indian state or UT', 'Outside India'];
const QUESTIONS = ['What was your first pet or favourite toy called?', 'What is your best friend\'s nickname?', 'Which street did you grow up on?', 'What is your favourite food?'];
const P = () => Auth.rec().progress;
const prof = () => Auth.rec() && Auth.rec().profile;
const world$ = id => WORLDS.find(w => w.id === id);
const doneCount = w => (P().done[w.id] || []).length;
const lvlOf = () => Math.floor(P().xp / 100) + 1;
const save = () => Auth.persist();
const BADGES = [
  ['first', 'First Blood: solve a level', () => Object.values(P().done).some(a => a.length)],
  ['xp100', 'Rising Star: reach 100 XP', () => P().xp >= 100],
  ['streak3', 'On Fire: 3 correct in a row', () => P().streak >= 3],
  ...WORLDS.map(w => ['w' + w.id, 'Conqueror: ' + w.name, () => doneCount(w) === w.levels.length]),
  ['all', 'Full-Stack Hero: finish every world', () => WORLDS.every(w => doneCount(w) === w.levels.length)]
];
let toastT, memeShown = false;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
function awardBadges() { BADGES.forEach(([id, name, ok]) => { if (!P().badges[id] && ok()) { P().badges[id] = 1; toast('Badge unlocked: ' + name.split(':')[0]); } }); }
function modal(html) { const m = $('#modal'); m.innerHTML = '<div class="mbox" role="dialog" aria-modal="true">' + html + '</div>'; m.hidden = false; const f = m.querySelector('button'); if (f) f.focus(); }
function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }

function header() {
  const r = Auth.rec();
  if (!r) { $('#top').innerHTML = '<span class="logo">&lt;/&gt; CodeQuest</span>'; return; }
  const pct = P().xp % 100;
  $('#top').innerHTML = `<button class="logo" id="home">&lt;/&gt; CodeQuest</button>
  <div class="stats"><span class="chip">LV <b>${lvlOf()}</b></span><span class="chip"><b>${P().xp}</b> XP</span><span class="chip">STREAK <b>${P().streak}</b></span>
  <div class="xpbar" title="${pct}/100 XP to next level"><i style="width:${pct}%"></i></div>
  <span class="chip">${Auth.session.guest ? 'Guest' : esc(r.name)}</span><button class="btn alt sm" id="lo">Log out</button></div>`;
  $('#home').onclick = home;
  $('#lo').onclick = () => { Auth.logout(); memeShown = false; route(); };
}

/* ---------- login, sign up, forgot password ---------- */
function authView(mode, msg) {
  header(); mode = mode || 'login';
  const err = `<p class="err" id="ae" role="alert">${esc(msg || '')}</p>`;
  const google = `<button class="btn alt wide" id="g">Continue with Google</button>`;
  let body;
  if (mode === 'login') body = `<h2>Welcome back</h2><label for="em">Email</label><input id="em" type="email" autocomplete="email"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password">${err}
    <button class="btn wide" id="go">Log in</button><button class="lnk" id="fg">Forgot password?</button><div class="or">or</div>${google}<button class="btn alt wide" id="gs">Play as guest</button><button class="lnk" id="su">New here? Create an account</button>`;
  else if (mode === 'signup') body = `<h2>Create your account</h2><label for="nm">Your name</label><input id="nm" autocomplete="name"><label for="em">Email</label><input id="em" type="email" autocomplete="email"><label for="pw">Create password (6+ characters)</label><input id="pw" type="password" autocomplete="new-password">
    <label for="sq">Security question (used if you forget your password)</label><select id="sq">${QUESTIONS.map(q => `<option>${esc(q)}</option>`).join('')}</select><label for="sa">Your answer</label><input id="sa">${err}
    <button class="btn wide" id="go">Sign up</button><button class="lnk" id="li">Already have an account? Log in</button>`;
  else if (mode === 'forgot') body = `<h2>Reset password</h2><label for="em">Your account email</label><input id="em" type="email">${err}<button class="btn wide" id="go">Next</button><button class="lnk" id="li">Back to log in</button>`;
  else body = `<h2>Reset password</h2><p class="hint">Security question: <b>${esc(Auth.question(mode.email))}</b></p><label for="sa">Your answer</label><input id="sa"><label for="pw">New password (6+ characters)</label><input id="pw" type="password" autocomplete="new-password">${err}<button class="btn wide" id="go">Change password</button><button class="lnk" id="li">Back to log in</button>`;
  $('#app').innerHTML = `<form class="card auth" id="af" novalidate>${body}</form>`;
  const v = id => ($('#' + id) ? $('#' + id).value : '');
  const on = (id, fn) => { if ($('#' + id)) $('#' + id).onclick = e => { e.preventDefault(); fn(); }; };
  $('#af').onsubmit = e => { e.preventDefault(); $('#go').click(); };
  on('li', () => authView('login')); on('su', () => authView('signup')); on('fg', () => authView('forgot'));
  on('gs', () => { Auth.asGuest(); route(); });
  on('g', () => {
    if (!Auth.googleReady()) return authView('login', 'Google sign-in is switched off. The site owner must add a Google client ID (see README). Use email or guest for now.');
    Auth.startGoogle(e => e ? authView('login', e) : route());
  });
  on('go', async () => {
    let e;
    if (mode === 'login') { e = await Auth.login(v('em'), v('pw')); if (!e) return route(); }
    else if (mode === 'signup') { e = await Auth.signup(v('nm'), v('em'), v('pw'), v('sq'), v('sa')); if (!e) return route(); }
    else if (mode === 'forgot') { if (Auth.question(v('em'))) return authView({ email: v('em') }); e = 'No account found for this email.'; }
    else { e = await Auth.reset(mode.email, v('sa'), v('pw')); if (!e) { authView('login'); return toast('Password changed. Log in now.'); } }
    $('#ae').textContent = e;
  });
}

/* ---------- onboarding questions ---------- */
function onboard() {
  header(); const r = Auth.rec(), p = r.profile || { state: '', learn: [], goal: 'job', level: 'beginner' };
  const names = { html: 'HTML (web pages)', css: 'CSS (design)', js: 'JavaScript', py: 'Python', sql: 'SQL (databases)', ml: 'Machine Learning' };
  const goals = { job: 'Get a job', exam: 'Pass college exams', project: 'Build projects', fun: 'Just for fun' };
  $('#app').innerHTML = `<form class="card auth wideform" id="ob"><h2>Tell us about you</h2>
  <p class="hint">Three quick questions. We use them to build your roadmap and pick memes you will actually understand.</p>
  <label for="st">1. Which state are you from?</label><select id="st"><option value="">Choose your state</option>${STATES.map(s => `<option ${p.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
  <fieldset><legend>2. What do you want to learn?</legend>${ORDER.map(k => `<label class="ck"><input type="checkbox" name="lr" value="${k}" ${p.learn.includes(k) ? 'checked' : ''}> ${names[k]}</label>`).join('')}</fieldset>
  <label for="gl">3. Why are you learning?</label><select id="gl">${Object.entries(goals).map(([k, v]) => `<option value="${k}" ${p.goal === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
  <p class="err" id="oe" role="alert"></p><button class="btn wide" id="ok">Build my roadmap</button></form>`;
  $('#ob').onsubmit = e => {
    e.preventDefault();
    const st = $('#st').value, lr = [...document.querySelectorAll('[name=lr]:checked')].map(x => x.value);
    if (!st) return $('#oe').textContent = 'Please choose your state.';
    if (!lr.length) return $('#oe').textContent = 'Pick at least one thing to learn.';
    r.profile = { state: st, learn: lr, goal: $('#gl').value, level: 'beginner' }; save(); memeShown = false; home();
  };
}

/* ---------- home with roadmap ---------- */
function roadmap() {
  const p = prof(); let list = ORDER.filter(k => p.learn.includes(k)); const added = p.learn.includes('ml') && !list.includes('py');
  if (added) list = ['py', ...list.filter(k => k !== 'py')].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return { list, added };
}
function home() {
  location.hash = ''; header(); const p = prof(), rm = roadmap(), r = Auth.rec();
  const next = rm.list.map(world$).find(w => doneCount(w) < w.levels.length);
  const first = !memeShown; memeShown = true;
  const goalTxt = { job: 'Your goal is a job, so finish every boss level.', exam: 'Exam mode: the concepts and the boss levels matter most.', project: 'Project mode: after each world, build something small of your own.', fun: 'Fun mode: no pressure, just collect badges.' }[p.goal];
  $('#app').innerHTML = `<section class="hero"><h1>Hi ${Auth.session.guest ? 'Hero' : esc(r.name.split(' ')[0])}, here is your roadmap</h1><p>${goalTxt} Every level unlocks after you finish the one before. Solve on the first try without a hint for +10 bonus XP.</p>
  ${first ? Memes.html(Memes.pick('welcome', p)) : ''}</section>
  <section class="card mbreak"><h3 class="sub">Meme break</h3><div id="mm"></div><div class="row"><button class="btn alt sm" id="mmb">Another meme</button></div></section>
  ${rm.added ? '<p class="hint">We added Python first because Machine Learning needs it.</p>' : ''}
  <ol class="road">${rm.list.map((id, n) => { const w = world$(id), d = doneCount(w), t = w.levels.length;
    return `<li class="stop ${d === t ? 'done' : next && next.id === id ? 'cur' : ''}"><div class="dot" style="background:${w.color}">${d === t ? '✓' : n + 1}</div>
    <div class="stopc"><h3>${w.name}</h3><p>${w.blurb}</p><div class="prog"><i style="width:${d / t * 100}%;background:${w.color}"></i></div><span class="hint">${d}/${t} levels</span>
    <button class="btn ${next && next.id === id ? '' : 'alt'}" data-w="${id}">${d === t ? 'Replay' : d ? 'Continue' : 'Start'}</button></div></li>`; }).join('')}</ol>
  ${ORDER.filter(k => !rm.list.includes(k)).length ? `<h3 class="sec">Extra worlds</h3><div class="extra">${ORDER.filter(k => !rm.list.includes(k)).map(k => { const w = world$(k); return `<button class="btn alt" data-w="${k}">${w.name} (${doneCount(w)}/${w.levels.length})</button>`; }).join('')}</div>` : ''}
  <div class="badges">${BADGES.map(b => `<span class="badge ${P().badges[b[0]] ? 'on' : ''}">${b[1]}</span>`).join('')}</div>
  <p><button class="lnk" id="edit">Change my roadmap or state</button></p>`;
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => world(b.dataset.w));
  $('#edit').onclick = onboard;
  const extra = ['exam', 'coding', 'job', 'friends'], byGoal = { job: 'job', exam: 'exam', project: 'coding', fun: 'friends' };
  const showMeme = kind => { $('#mm').innerHTML = Memes.html(Memes.pick(kind, p)); };
  showMeme(byGoal[p.goal] || 'coding');
  $('#mmb').onclick = () => showMeme(extra[Math.floor(Math.random() * extra.length)]);
}
function world(id) {
  const w = world$(id); header(); location.hash = id; const d = P().done[id] || [];
  $('#app').innerHTML = `<p><button class="btn alt sm" id="hm">&larr; Roadmap</button></p><h2 style="color:${w.color};margin-bottom:6px">${w.name}</h2><p class="hint">Finish each level to unlock the next one.</p>
  <ol class="lvls">${w.levels.map((l, i) => { const st = d.includes(i) ? 'done' : i === 0 || d.includes(i - 1) ? 'open' : 'locked';
    return `<li><button class="lv ${st}" data-i="${i}" ${st === 'locked' ? 'disabled' : ''}><span class="num">${st === 'done' ? '✓' : st === 'locked' ? '🔒' : i + 1}</span><span class="lt">${esc(l.title)}</span><span class="hint">+${l.xp} XP</span></button></li>`; }).join('')}</ol>`;
  $('#hm').onclick = home;
  document.querySelectorAll('.lv').forEach(n => n.onclick = () => level(id, +n.dataset.i));
}
function route() { header(); if (!Auth.rec()) return authView('login'); if (!prof()) return onboard(); const h = location.hash.slice(1); world$(h) ? world(h) : home(); }
