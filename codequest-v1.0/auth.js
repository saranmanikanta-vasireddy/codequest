/* Accounts live only in this browser (localStorage). Passwords are salted and hashed. */
const Auth = {
  GOOGLE_CLIENT_ID: '', /* paste your Google OAuth client id here to enable Google sign-in */
  users: {}, session: null, guest: null,
  load() {
    try { Auth.users = JSON.parse(localStorage.getItem('cq2-users')) || {}; } catch (e) {}
    try { Auth.session = JSON.parse(localStorage.getItem('cq2-session')); } catch (e) {}
    try { Auth.guest = JSON.parse(localStorage.getItem('cq2-guest')); } catch (e) {}
    if (!Auth.guest) Auth.guest = { profile: null, progress: { xp: 0, done: {}, streak: 0, badges: {} } };
  },
  persist() {
    try {
      localStorage.setItem('cq2-users', JSON.stringify(Auth.users));
      localStorage.setItem('cq2-session', JSON.stringify(Auth.session));
      localStorage.setItem('cq2-guest', JSON.stringify(Auth.guest));
    } catch (e) {}
  },
  rec() { if (!Auth.session) return null; return Auth.session.guest ? Auth.guest : Auth.users[Auth.session.email] || null; },
  async hash(text, salt) {
    const data = new TextEncoder().encode(salt + '|' + text);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 5381; for (const b of data) h = ((h << 5) + h + b) >>> 0; return 'x' + h;
  },
  rnd() { return Math.random().toString(36).slice(2, 10); },
  async signup(name, email, pw, q, ans) {
    email = email.trim().toLowerCase(); name = name.trim();
    if (!name) return 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Enter a valid email address.';
    if (pw.length < 6) return 'Password needs at least 6 characters.';
    if (!ans.trim()) return 'Answer the security question. You will need it if you forget your password.';
    if (Auth.users[email]) return 'This email already has an account. Try logging in.';
    const salt = Auth.rnd();
    Auth.users[email] = { name, salt, hash: await Auth.hash(pw, salt), q, ah: await Auth.hash(ans.trim().toLowerCase(), salt), profile: null, progress: { xp: 0, done: {}, streak: 0, badges: {} } };
    Auth.session = { email }; Auth.persist(); return null;
  },
  async login(email, pw) {
    email = email.trim().toLowerCase(); const u = Auth.users[email];
    if (!u) return 'No account found for this email. Sign up first.';
    if (await Auth.hash(pw, u.salt) !== u.hash) return 'Wrong password. Try again or use "Forgot password".';
    Auth.session = { email }; Auth.persist(); return null;
  },
  asGuest() { Auth.session = { guest: true }; Auth.persist(); },
  logout() { Auth.session = null; Auth.persist(); },
  question(email) { const u = Auth.users[email.trim().toLowerCase()]; return u ? u.q : null; },
  async reset(email, ans, pw) {
    email = email.trim().toLowerCase(); const u = Auth.users[email];
    if (!u) return 'No account found for this email.';
    if (pw.length < 6) return 'New password needs at least 6 characters.';
    if (await Auth.hash(ans.trim().toLowerCase(), u.salt) !== u.ah) return 'That answer does not match. Try again.';
    u.salt = Auth.rnd(); u.hash = await Auth.hash(pw, u.salt); u.ah = await Auth.hash(ans.trim().toLowerCase(), u.salt);
    Auth.persist(); return null;
  },
  /* Optional Google sign-in, active only when GOOGLE_CLIENT_ID is set and the page is hosted (GitHub Pages / Netlify). */
  googleReady() { return !!Auth.GOOGLE_CLIENT_ID; },
  startGoogle(done) {
    const go = () => {
      google.accounts.id.initialize({ client_id: Auth.GOOGLE_CLIENT_ID, callback: r => {
        try {
          const p = JSON.parse(decodeURIComponent(escape(atob(r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
          const email = p.email.toLowerCase();
          if (!Auth.users[email]) Auth.users[email] = { name: p.name || email, google: true, profile: null, progress: { xp: 0, done: {}, streak: 0, badges: {} } };
          Auth.session = { email }; Auth.persist(); done();
        } catch (e) { done('Google sign-in failed. Try again.'); }
      } });
      google.accounts.id.prompt();
    };
    if (window.google && google.accounts) return go();
    const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = go;
    s.onerror = () => done('Could not reach Google. Check your internet.'); document.head.appendChild(s);
  }
};
Auth.load();
