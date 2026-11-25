/* Quest Buddy: an offline helper. It knows your current level and a small library of concepts. */
const KB = [
  [['print'], 'print() shows a value on screen. Put text in quotes: print("Hi"). Check spelling, brackets and quotes.'],
  [['variable', 'assign'], 'A variable is a name for a value: hp = 100. Use = to store it and the name to read it later.'],
  [['f-string', 'fstring', 'format'], 'An f-string puts values inside text: f"Gold: {gold}". Note the f before the quote.'],
  [['if', 'else', 'condition'], 'if runs code only when a test is true. End the if line with a colon and indent the next line by 4 spaces. else covers the other case.'],
  [['for', 'loop', 'range', 'repeat'], 'A for loop repeats code. range(1, 4) gives 1, 2, 3 (it stops before the last number).'],
  [['function', 'def', 'return'], 'A function packages code. It takes inputs, and return sends a result back: function add(a, b) { return a + b; }'],
  [['array', 'list', 'filter', 'map'], 'A list/array holds many values. filter keeps items that pass a test and map changes every item.'],
  [['const', 'let', 'var'], 'Use const for values that never change and let for values that do.'],
  [['select'], 'SELECT chooses the columns, FROM chooses the table: SELECT name, gold FROM heroes'],
  [['where'], "WHERE filters rows. Text needs single quotes: WHERE class = 'Knight'. Join tests with AND / OR."],
  [['order', 'sort', 'limit'], 'ORDER BY col DESC sorts high to low. LIMIT 3 keeps the first 3 rows. Write them after WHERE.'],
  [['count', 'sum', 'avg', 'aggregate'], 'COUNT(*) counts rows, SUM adds, AVG averages. They turn many rows into one answer.'],
  [['tag', 'element', 'html'], 'HTML uses tags like <p>text</p>. Most tags open and close. Some, like <img>, have no closing tag.'],
  [['attribute', 'href', 'src', 'alt'], 'Attributes sit inside the opening tag: <a href="url">, <img src="file" alt="description">.'],
  [['form', 'input', 'label'], 'A form collects data. Pair every <input> with a <label> so people know what to type.'],
  [['selector', 'class', 'id'], 'In CSS, h1 targets a tag, .note targets class="note" and #title targets id="title". Classes can repeat, ids should be unique.'],
  [['color', 'background'], 'color changes text colour. background-color changes the fill. Use names (red) or hex (#ff0000).'],
  [['padding', 'margin'], 'padding is space inside a box. margin is space outside it.'],
  [['flex', 'flexbox', 'gap'], 'display: flex puts children in a row. gap sets the space between them. justify-content aligns along the row.'],
  [['radius', 'circle', 'round'], 'border-radius rounds corners. 50% on a square makes a circle.'],
  [['numpy', 'mean', 'array'], 'NumPy makes fast number arrays. np.mean(arr) is the average.'],
  [['feature', 'label', 'x', 'y'], 'Features (X) are inputs the model sees. The label (y) is the answer it should learn to predict.'],
  [['train', 'test', 'split'], 'We train on one part of the data and test on the rest, to check the model works on data it has not seen.'],
  [['overfit', 'overfitting'], 'Overfitting means the model memorised the training data and fails on new data. A train/test split helps you notice it.'],
  [['regression', 'linear'], 'Linear regression fits a straight line to predict a number, like house price from size.'],
  [['classification', 'classify'], 'Classification predicts a category, like spam or not spam.'],
  [['accuracy', 'metric'], 'Accuracy = correct predictions / total predictions. 3 of 4 correct is 0.75.'],
  [['machine learning', 'ml', 'ai'], 'Machine learning lets a computer learn patterns from data instead of following hand-written rules. Steps: collect data, split it, train, predict, measure.'],
  [['syntax', 'error'], 'A syntax error means a typo: a missing quote, bracket, colon or comma. Read the message, then check the line it points to.'],
  [['not defined', 'nameerror', 'undefined'], 'Something is used before it is created or is spelled differently. Check the exact spelling and that you made the variable first.']
];

const Buddy = {
  say(text, who) { const log = document.getElementById('bd-log'); const d = document.createElement('div'); d.className = 'msg ' + who; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; },
  reply(q) {
    const s = q.toLowerCase(), c = window.CTX;
    if (/\b(hint|stuck|help me)\b/.test(s)) return c ? 'Hint: ' + (c.l.clue || c.l.hint.split('\n')[0]) + '  (Ask "solution" to see the full answer.)' : 'Open a level and I can give you a hint for it.';
    if (/\b(solution|answer|show me)\b/.test(s)) { if (!c) return 'Open a level first.'; c.reveal(); return 'Here is the solution (no first-try bonus now):\n' + c.l.hint; }
    if (/\b(explain|lesson|what do i do|task|quest)\b/.test(s) && c) return c.l.lesson.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>') + '\nYour quest: ' + c.l.task.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    if (/(why|wrong|fail|error|not working|doesn)/.test(s) && c && c.err) return 'Your last run said: ' + c.err + '\nRead it slowly, compare with the example in the lesson, and fix one thing at a time.';
    const hits = KB.filter(([keys]) => keys.some(k => (k.length < 3 ? new RegExp('\\b' + k + '\\b') : new RegExp('\\b' + k)).test(s)));
    if (hits.length) return hits.slice(0, 2).map(h => h[1]).join('\n\n');
    return 'I can help with: hints, solutions, explaining this level, errors, and concepts in Python, SQL, JavaScript, HTML, CSS and ML. Try "hint", "explain", "what is a loop" or "what is overfitting".';
  },
  ask() {
    const i = document.getElementById('bd-in'), q = i.value.trim(); if (!q) return;
    i.value = ''; Buddy.say(q, 'me'); setTimeout(() => Buddy.say(Buddy.reply(q), 'bot'), 250);
  },
  toggle() {
    const p = document.getElementById('bd-panel'); p.hidden = !p.hidden;
    if (!p.hidden && !document.getElementById('bd-log').children.length) Buddy.say('Hi, I am Quest Buddy. Ask me for a hint, an explanation or any concept.', 'bot');
    if (!p.hidden) document.getElementById('bd-in').focus();
  },
  init() {
    document.getElementById('bd-btn').onclick = Buddy.toggle;
    document.getElementById('bd-close').onclick = Buddy.toggle;
    document.getElementById('bd-send').onclick = Buddy.ask;
    document.getElementById('bd-in').addEventListener('keydown', e => { if (e.key === 'Enter') Buddy.ask(); });
  }
};
Buddy.init();
