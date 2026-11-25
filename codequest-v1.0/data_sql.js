const TABLES = {
  heroes: { cols: ['id', 'name', 'class', 'level', 'gold'], rows: [
    [1, 'Asha', 'Mage', 12, 340], [2, 'Ravi', 'Knight', 9, 120], [3, 'Meera', 'Archer', 15, 560],
    [4, 'Kiran', 'Knight', 7, 80], [5, 'Lata', 'Mage', 20, 900], [6, 'Dev', 'Archer', 4, 25]] },
  monsters: { cols: ['id', 'name', 'hp', 'type'], rows: [
    [1, 'Slime', 20, 'goo'], [2, 'Goblin', 45, 'beast'], [3, 'Dragon', 500, 'fire'],
    [4, 'Wolf', 60, 'beast'], [5, 'Lich', 300, 'undead']] }
};
const S1 = 'Tables here: <code>heroes</code> (id, name, class, level, gold) and <code>monsters</code> (id, name, hp, type).';
WORLDS.push({ id: 'sql', name: 'SQL Swamp', color: 'var(--sql)', blurb: 'Ask the database questions. It answers faster than your relatives.', lang: 'sql', levels: [
  { title: 'SELECT *: The Attendance Register', xp: 20, story: 'A database is a giant attendance register. SELECT * reads the whole thing, even the names you wish you could forget.',
    lesson: '<code>SELECT * FROM table</code> returns every column and row. ' + S1, ex: 'SELECT * FROM monsters',
    task: 'Show all rows from <code>heroes</code>.', starter: 'SELECT ', solution: 'SELECT * FROM heroes', clue: 'SELECT, a star, FROM, the table name.', hint: 'SELECT * FROM heroes' },
  { title: 'Pick Columns', xp: 25, story: 'You do not need the whole register, only who owes you money. Name just those columns.',
    lesson: 'Name only the columns you want, separated by commas.', ex: 'SELECT name, hp FROM monsters',
    task: 'Show only the <code>name</code> and <code>gold</code> of every hero.', starter: '', solution: 'SELECT name, gold FROM heroes', clue: 'Two column names with a comma, then FROM heroes.', hint: 'SELECT name, gold FROM heroes' },
  { title: 'WHERE: Find the Knights', xp: 30, story: 'WHERE is the relative who asks "which batch are you?" and keeps only the matches.',
    lesson: '<code>WHERE</code> keeps rows that match. Text goes in single quotes. Join tests with <code>AND</code> / <code>OR</code>.', ex: "SELECT * FROM monsters WHERE type = 'beast'",
    task: 'Find the <code>name</code> of every hero whose class is <code>Knight</code>.', starter: '', solution: "SELECT name FROM heroes WHERE class = 'Knight'", clue: "Add WHERE class = 'Knight' after the table name.", hint: "SELECT name FROM heroes WHERE class = 'Knight'" },
  { title: 'Numbers in WHERE', xp: 35, story: 'Filtering by numbers is how a bank decides you are rich enough for a callback.',
    lesson: 'Compare numbers with <code>&gt; &lt; &gt;= &lt;= =</code>. Combine with <code>AND</code>.', ex: 'SELECT name FROM monsters WHERE hp > 50',
    task: 'Show the <code>name</code> of heroes with <code>gold</code> greater than 100 and <code>level</code> greater than 8.', starter: '', solution: 'SELECT name FROM heroes WHERE gold > 100 AND level > 8', clue: 'Two tests joined by AND.', hint: 'SELECT name FROM heroes WHERE gold > 100 AND level > 8' },
  { title: 'ORDER BY: Rank List', xp: 40, story: 'ORDER BY is the rank list. DESC shows the topper first, so everyone else can feel better about trying.',
    lesson: '<code>ORDER BY col DESC</code> sorts high to low. <code>LIMIT n</code> keeps the first n rows.', ex: 'SELECT name FROM monsters ORDER BY hp DESC LIMIT 2',
    task: 'Show the <code>name</code> and <code>gold</code> of the 3 richest heroes (most gold first).', starter: '', solution: 'SELECT name, gold FROM heroes ORDER BY gold DESC LIMIT 3', clue: 'ORDER BY gold DESC, then LIMIT 3.', hint: 'SELECT name, gold FROM heroes ORDER BY gold DESC LIMIT 3' },
  { title: 'COUNT: Head Count', xp: 45, story: 'COUNT is the teacher counting students before the bus leaves. It always gets a different number than yours.',
    lesson: '<code>COUNT(*)</code>, <code>SUM(col)</code>, <code>AVG(col)</code> and <code>MAX(col)</code> turn many rows into one answer.', ex: 'SELECT COUNT(*) FROM monsters',
    task: 'How many heroes have a <code>level</code> greater than 8? Use <code>COUNT(*)</code>.', starter: '', solution: 'SELECT COUNT(*) FROM heroes WHERE level > 8', clue: 'SELECT COUNT(*) FROM heroes, then add the WHERE.', hint: 'SELECT COUNT(*) FROM heroes WHERE level > 8' },
  { title: 'SUM and AVG: Pocket Money', xp: 50, story: 'SUM is the total of your pocket money. AVG is how much you pretend you spend per day.',
    lesson: '<code>SUM(col)</code> adds all values. <code>AVG(col)</code> gives the average.', ex: 'SELECT SUM(hp) FROM monsters',
    task: 'Find the total <code>gold</code> of all heroes with <code>SUM</code>.', starter: '', solution: 'SELECT SUM(gold) FROM heroes', clue: 'SELECT SUM(gold) FROM heroes', hint: 'SELECT SUM(gold) FROM heroes' },
  { title: 'Boss: Combine It All', xp: 60, story: 'Final test of the swamp: filter, sort and limit in one query. The database now respects you.',
    lesson: 'Order matters: <code>SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...</code>', ex: "SELECT name FROM monsters WHERE type = 'beast' ORDER BY hp DESC LIMIT 1",
    task: 'Show the <code>name</code> of the 2 highest-level <code>Mage</code> or <code>Archer</code> heroes... simply: names of heroes with <code>gold</code> over 100, highest <code>level</code> first, limit 2.', starter: '', solution: 'SELECT name FROM heroes WHERE gold > 100 ORDER BY level DESC LIMIT 2', clue: 'WHERE gold > 100, ORDER BY level DESC, LIMIT 2.', hint: 'SELECT name FROM heroes WHERE gold > 100 ORDER BY level DESC LIMIT 2' }
] });
