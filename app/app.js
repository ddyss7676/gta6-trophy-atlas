// Vice Atlas — GTA VI trophy guide & tracker.
// Offline static app: loads data/trophies.json from its own folder, keeps earned
// trophies in localStorage, and never makes a network request of its own.
// Views: checklist (with guide detail pane), platinum roadmap, missable watch list.
const STORE_KEY = 'vice-atlas-progress-v1';
const SPOILER_KEY = 'vice-atlas-spoilers-v1';
const TOTAL_HOURS = 200;

const rowsEl = document.getElementById('rows');
const detailEl = document.getElementById('detail');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const showEl = document.getElementById('show');
const spoilerEl = document.getElementById('spoiler');
const filterNoteEl = document.getElementById('filterNote');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const sourceIndex = doc.sources ?? {};
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set();
try {
  earned = new Set(JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]'));
} catch {
  earned = new Set();
}
let kindFilter = 'all';
let selectedId = null;
let currentView = 'checklist';

spoilerEl.checked = localStorage.getItem(SPOILER_KEY) === '1';

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function gradeCounts() {
  const counts = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    counts[t.grade][1] += 1;
    if (earned.has(t.name)) counts[t.grade][0] += 1;
  }
  return counts;
}

function renderProgress() {
  const pct = Math.round((earned.size / trophies.length) * 100);
  const ring = document.getElementById('ringFg');
  const circumference = 326.7;
  ring.style.strokeDashoffset = String(circumference * (1 - earned.size / trophies.length));
  document.getElementById('ringNum').textContent = pct + '%';
  document.getElementById('ringSub').textContent = earned.size + ' / ' + trophies.length;
  document.getElementById('progressLine').textContent = earned.size + ' of ' + trophies.length + ' earned';
  const hoursLeft = Math.round(TOTAL_HOURS * (1 - earned.size / trophies.length));
  document.getElementById('progressEst').textContent =
    'About ' + TOTAL_HOURS + ' hours to platinum · ~' + hoursLeft + ' h left';
  const counts = gradeCounts();
  const label = (g) => g[0].toUpperCase() + g.slice(1) + ' ' + counts[g][0] + '/' + counts[g][1];
  document.getElementById('progressGrades').textContent =
    [label('platinum'), label('gold'), label('silver'), label('bronze')].join(' · ');
}

function trophyMatches(t) {
  if (kindFilter === 'missable' && !t.missable) return false;
  if (kindFilter !== 'all' && kindFilter !== 'missable' && t.kind !== kindFilter) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (showEl.value === 'earned' && !earned.has(t.name)) return false;
  if (showEl.value === 'remaining' && earned.has(t.name)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide + ' ' + t.kind).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function spoilerHidden(t) {
  return spoilerEl.checked && t.kind === 'story' && !earned.has(t.name);
}

function sourceLine(key) {
  const s = sourceIndex[key];
  if (!s) return key;
  const a = document.createElement('a');
  a.href = s.u;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = s.n;
  const li = document.createElement('li');
  li.append(a, ' — ', document.createTextNode(s.d));
  return li;
}

function renderDetail(t) {
  detailEl.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = spoilerHidden(t) ? 'Hidden story trophy' : t.name;
  const desc = document.createElement('p');
  desc.className = 't-desc';
  desc.textContent = spoilerHidden(t) ? 'Spoiler hidden — earn this trophy to reveal it.' : t.description;
  const badges = document.createElement('div');
  badges.className = 'badges';
  const gradeChip = document.createElement('span');
  gradeChip.className = 'grade grade-' + t.grade;
  gradeChip.textContent = t.grade;
  badges.append(gradeChip);
  if (t.missable) {
    const f = document.createElement('span');
    f.className = 'flag flag-missable';
    f.textContent = '⚠ MISSABLE';
    badges.append(f);
  }
  if (t.hidden) {
    const f = document.createElement('span');
    f.className = 'flag flag-hidden';
    f.textContent = 'Hidden on PSN';
    badges.append(f);
  }
  if (!t.verified) {
    const f = document.createElement('span');
    f.className = 'flag flag-prov';
    f.textContent = 'PROVISIONAL';
    badges.append(f);
  }
  const guideHeading = document.createElement('h4');
  guideHeading.textContent = 'Guide';
  const sourceLineEl = document.createElement('p');
  sourceLineEl.className = 'source-line';
  sourceLineEl.textContent = 'Sources: ' + (t.sources ?? []).map((key) => {
    const s = sourceIndex[key];
    return s ? s.n + ' (' + s.d + ')' : key;
  }).join(' · ');
  const guideText = document.createElement('p');
  guideText.className = 'guide-text';
  guideText.textContent = spoilerHidden(t)
    ? 'Turn off “Hide story spoilers” or earn this trophy to read its guide.'
    : t.guide;
  const sourcesHeading = document.createElement('h4');
  sourcesHeading.textContent = 'Sources';
  const list = document.createElement('ul');
  list.className = 'source-list';
  for (const key of t.sources ?? []) list.append(sourceLine(key));
  const verdict = document.createElement('p');
  verdict.className = 'verdict ' + (t.verified ? 'verified' : 'provisional');
  verdict.textContent = t.verified
    ? '✓ Method confirmed by the cited guide(s).'
    : '⚠ Provisional: no published guide had pinned this method down by 21 Nov 2026 — the guide follows the official description and the best published lead only.';
  detailEl.append(title, desc, badges, sourceLineEl, guideHeading, guideText, sourcesHeading, list, verdict);
}

function renderChecklist() {
  rowsEl.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!trophyMatches(t)) continue;
    shown += 1;
    const tr = document.createElement('tr');
    if (earned.has(t.name)) tr.classList.add('earned');
    const boxCell = document.createElement('td');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.name);
    box.setAttribute('aria-label', 'Earned: ' + t.name);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.name);
      else earned.delete(t.name);
      saveProgress();
      renderProgress();
      renderChecklist();
      renderRoadmap();
      renderMissables();
      if (selectedId === t.id) renderDetail(t);
    });
    boxCell.append(box);
    const nameCell = document.createElement('td');
    const name = document.createElement('span');
    name.className = 't-name';
    name.textContent = spoilerHidden(t) ? 'Hidden story trophy' : t.name;
    const desc = document.createElement('span');
    desc.className = 't-desc' + (spoilerHidden(t) ? ' spoiled' : '');
    desc.textContent = spoilerHidden(t) ? 'Complete the story to reveal this trophy.' : t.description;
    const kind = document.createElement('span');
    kind.className = 't-kind';
    kind.textContent = t.kind + (t.count ? ' · target ' + t.count.toLocaleString('en-US') : '');
    nameCell.append(name, desc, kind);
    if (t.missable) {
      const f = document.createElement('span');
      f.className = 'flag flag-missable';
      f.textContent = '⚠ MISSABLE';
      nameCell.append(document.createElement('br'), f);
    }
    const gradeCell = document.createElement('td');
    const chip = document.createElement('span');
    chip.className = 'grade grade-' + t.grade;
    chip.textContent = t.grade;
    gradeCell.append(chip);
    const guideCell = document.createElement('td');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'guide-btn';
    btn.textContent = 'Read guide →';
    btn.addEventListener('click', () => {
      selectedId = t.id;
      renderDetail(t);
      if (window.innerWidth < 900) detailEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    guideCell.append(btn);
    tr.append(boxCell, nameCell, gradeCell, guideCell);
    rowsEl.append(tr);
  }
  document.getElementById('emptyNote').hidden = shown !== 0;
  filterNoteEl.textContent = 'Showing ' + shown + ' of ' + trophies.length + ' trophies'
    + (kindFilter !== 'all' ? ' · kind: ' + kindFilter : '')
    + (spoilerEl.checked ? ' · story spoilers hidden until earned' : '');
}

const STAGES = [
  { n: 1, title: 'Story first — Chapters 1–5', time: '~60–80 h', text: 'Play the story straight through. All 12 story trophies unlock automatically. Do the Chapter 1 meditation at Jason’s house before Chapter 1 ends — it is the run’s only missable moment.', trophies: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] },
  { n: 2, title: 'Strangers & side missions', time: '~15 h', text: 'Finish the stranger strands: Andy, Kenton, Billy, Randy, Tyrone, plus three more stranger givers, and Bret’s unique-animal hunt.', trophies: [22, 23, 24, 25, 26, 27, 29] },
  { n: 3, title: 'Activities & skills', time: '~30 h', text: 'Stunts, shooting range golds, races, fishing, arcade, drone races, meditation spots and challenges. This is the longest grind stage — chip away at it between other stages.', trophies: [15, 16, 17, 18, 19, 20, 21, 28, 32, 46, 51] },
  { n: 4, title: 'Collectibles & the map', time: '~25 h', text: 'Card sets, WAiNK spots, vehicle discovery and exploring all 52 areas of Leonida. Collect as you travel and the counts climb on their own.', trophies: [30, 31, 35, 42] },
  { n: 5, title: 'Crime sprees & money', time: '~25 h', text: 'Vaults, armored trucks, gang operations, shop robberies with your partner, and the money trophies. Marked Bills from robberies feed the laundering total.', trophies: [33, 34, 36, 37, 38, 39, 40, 41, 43, 44, 45, 47, 48, 49, 50, 52, 53, 54, 55] },
  { n: 6, title: '100% & the platinum', time: '~10 h', text: 'Open the 100% checklist after the credits and mop up what is left — most of it is already done. A Long Road pops, and Vice Got a Price! follows with it.', trophies: [14, 1] },
];

function renderRoadmap() {
  const host = document.getElementById('roadmap');
  host.replaceChildren();
  for (const stage of STAGES) {
    const done = stage.trophies.filter((id) => earned.has(byId.get(id).name)).length;
    const card = document.createElement('div');
    card.className = 'stage';
    const h = document.createElement('h3');
    h.textContent = 'Stage ' + stage.n + ': ' + stage.title + ' ';
    const time = document.createElement('span');
    time.className = 'stage-time';
    time.textContent = stage.time;
    h.append(time);
    const p = document.createElement('p');
    p.textContent = stage.text;
    const count = document.createElement('p');
    count.className = 'stage-count';
    count.textContent = done + ' / ' + stage.trophies.length + ' trophies in this stage';
    const ul = document.createElement('ul');
    for (const id of stage.trophies) {
      const t = byId.get(id);
      const li = document.createElement('li');
      if (earned.has(t.name)) li.classList.add('done');
      li.textContent = (earned.has(t.name) ? '✓ ' : '○ ') + t.name + ' — ' + t.grade
        + (t.missable ? ' — ⚠ MISSABLE' : '');
      ul.append(li);
    }
    card.append(h, p, count, ul);
    host.append(card);
  }
}

function renderMissables() {
  const host = document.getElementById('missableList');
  host.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const card = document.createElement('div');
    card.className = 'miss-card';
    const h = document.createElement('h3');
    h.textContent = '⚠ ' + t.name + ' — ' + t.grade + (earned.has(t.name) ? ' ✓ EARNED — safe' : ' — NOT YET EARNED');
    const desc = document.createElement('p');
    desc.textContent = t.description;
    const guide = document.createElement('p');
    guide.textContent = t.guide;
    const src = document.createElement('p');
    src.textContent = 'Sources: PowerPyx — GTA 6 Trophy Guide & Roadmap (20 Nov 2026); GTABase — GTA 6 trophy guide (18 Nov 2026).';
    card.append(h, desc, guide, src);
    host.append(card);
  }
  const safe = document.createElement('p');
  safe.textContent = 'All 12 story trophies and the other 42 trophies are confirmed unmissable — they unlock automatically or stay available after the story (PowerPyx, 20 Nov 2026).';
  host.append(safe);
}

function showView(view) {
  currentView = view;
  for (const btn of document.querySelectorAll('.view-btn')) {
    btn.classList.toggle('active', btn.dataset.view === view);
  }
  document.getElementById('view-checklist').hidden = view !== 'checklist';
  document.getElementById('view-roadmap').hidden = view !== 'roadmap';
  document.getElementById('view-missables').hidden = view !== 'missables';
  document.getElementById('controls').style.display = view === 'checklist' ? '' : 'none';
}

for (const btn of document.querySelectorAll('.view-btn')) {
  btn.addEventListener('click', () => showView(btn.dataset.view));
}
for (const chip of document.querySelectorAll('#kindChips .chip')) {
  chip.addEventListener('click', () => {
    kindFilter = chip.dataset.kind;
    for (const c of document.querySelectorAll('#kindChips .chip')) {
      c.classList.toggle('active', c === chip);
    }
    renderChecklist();
  });
}
searchEl.addEventListener('input', renderChecklist);
gradeEl.addEventListener('change', renderChecklist);
showEl.addEventListener('change', renderChecklist);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? '1' : '0');
  renderChecklist();
  if (selectedId) renderDetail(byId.get(selectedId));
});

document.getElementById('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ app: 'vice-atlas', earned: [...earned] }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vice-atlas-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    const known = new Set(trophies.map((t) => t.name));
    earned = new Set(names.filter((n) => known.has(n)));
    saveProgress();
    renderProgress();
    renderChecklist();
    renderRoadmap();
    renderMissables();
  } catch {
    filterNoteEl.textContent = 'That file could not be imported — it is not a Vice Atlas progress file.';
  }
});
document.getElementById('reset').addEventListener('click', () => {
  if (window.confirm('Clear all earned trophies?')) {
    earned = new Set();
    saveProgress();
    renderProgress();
    renderChecklist();
    renderRoadmap();
    renderMissables();
  }
});

// Deep-link a view for screenshots and sharing: ?view=roadmap|missables|checklist
const params = new URLSearchParams(window.location.search);
const startView = params.get('view');
if (startView === 'roadmap' || startView === 'missables') showView(startView);

renderProgress();
renderChecklist();
renderRoadmap();
renderMissables();
const firstGuide = trophies.find((t) => t.id === 28);
if (firstGuide) {
  selectedId = firstGuide.id;
  renderDetail(firstGuide);
}
