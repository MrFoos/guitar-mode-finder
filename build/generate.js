#!/usr/bin/env node
// generate.js — Pre-renders all mode pages + sitemap.xml

const fs = require('fs');
const path = require('path');

const Theory = require('../js/theory.js');
const CAGED = require('../js/caged.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_URL = 'https://guitarmodefinder.com';

// ── Correct diatonic 7th chords (theory.js uses Ionian quality for all modes) ──

const CHORD_QUALITY_BY_MODE = {
  Ionian:     ['maj7','m7','m7','maj7','7','m7','m7b5'],
  Dorian:     ['m7','m7','maj7','7','m7','m7b5','maj7'],
  Phrygian:   ['m7','maj7','7','m7','m7b5','maj7','m7'],
  Lydian:     ['maj7','7','m7','m7b5','maj7','m7','m7'],
  Mixolydian: ['7','m7','m7b5','maj7','m7','m7','maj7'],
  Aeolian:    ['m7','m7b5','maj7','m7','m7','maj7','7'],
  Locrian:    ['m7b5','maj7','m7','m7','maj7','7','m7'],
};

function getDiatonicChords(root, modeName) {
  const notes = Theory.getModeNotes(root, modeName);
  const q = CHORD_QUALITY_BY_MODE[modeName];
  return notes.map((note, i) => ({ root: note, quality: q[i], name: note + q[i], degree: i + 1 }));
}

// ── Utilities ────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function romanNumeral(n) {
  return ['I','II','III','IV','V','VI','VII'][n - 1];
}

function disp(n) {
  return n.replace('#', '♯').replace(/([A-G])b/g, '$1♭').replace('b5', '♭5');
}

// ── HTML shell ────────────────────────────────────────────────────────────────

function htmlShell({ title, description, canonicalPath, content }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="night">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${SITE_URL}${canonicalPath}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${SITE_URL}${canonicalPath}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<link rel="stylesheet" href="/css/main.css">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<script defer src="https://cloud.umami.is/script.js" data-website-id="03d2d735-5b07-40a0-b42c-bfe27f6466f6"></script>
</head>
<body>
${siteHeader()}
${content}
${siteFooter()}
<script src="/js/ui.js" defer></script>
</body>
</html>`;
}

function siteHeader() {
  return `<header class="rack-header">
  <div class="rack-header-inner">
    <div class="screw screw-tl"></div>
    <div class="screw screw-tr"></div>
    <div class="screw screw-bl"></div>
    <div class="screw screw-br"></div>
    <div class="rack-brand">
      <div class="power-led-enclosure"><div class="power-led"></div></div>
      <div>
        <a class="brand-label-main" href="/" style="text-decoration:none;color:inherit">Guitar Mode Finder</a>
      </div>
    </div>
    <nav class="rack-nav">
      <a href="/">MODES</a>
      <a href="/modes/">KEYS</a>
      <button class="theme-toggle" id="themeToggle" aria-label="Toggle day/night theme">
        <span class="toggle-label" id="labelDay">DAY</span>
        <span class="toggle-track"><span class="toggle-ball"></span></span>
        <span class="toggle-label active" id="labelNight">NIGHT</span>
      </button>
    </nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="rack-footer">
  © 2026 Guitar Mode Finder
</footer>`;
}

// ── Mode page navigate widget ────────────────────────────────────────────────

function renderModeSelector(currentRoot, currentMode) {
  const rootOptions = Theory.ROOT_DISPLAY.map(r =>
    `<option value="${r.value}"${r.value === currentRoot ? ' selected' : ''}>${r.label}</option>`
  ).join('');
  const modeOptions = Theory.MODE_NAMES.map(m =>
    `<option value="${m}"${m === currentMode ? ' selected' : ''}>${m}</option>`
  ).join('');

  return `<div class="mode-nav-widget">
  <select id="rootSelect" class="mode-nav-select" aria-label="Root note">${rootOptions}</select>
  <span class="mode-nav-sep">in</span>
  <select id="modeSelect" class="mode-nav-select" aria-label="Mode">${modeOptions}</select>
  <button class="mode-nav-btn" id="goBtn">GO</button>
</div>`;
}

// ── Note pills ────────────────────────────────────────────────────────────────

function renderNotePills(notes, rootNote, pentaNotes) {
  const pentaSet = new Set(pentaNotes);
  return `<div class="note-pills">
${notes.map(n => {
    const isRoot = Theory.noteIndex(n) === Theory.noteIndex(rootNote);
    const isPenta = !isRoot && pentaSet.has(n);
    const cls = isRoot ? 'note-pill is-root' : isPenta ? 'note-pill is-penta' : 'note-pill';
    return `  <span class="${cls}">${disp(n)}</span>`;
  }).join('\n')}
</div>`;
}

// ── Chord row ─────────────────────────────────────────────────────────────────

function renderChordRow(chords) {
  return `<div class="chord-row">
${chords.map((ch, i) => {
    const cls = i === 0 ? 'chord-card tonic' : 'chord-card';
    return `  <div class="${cls}">
    <div class="degree">${romanNumeral(ch.degree)}</div>
    <div class="chord-name">${disp(ch.name)}</div>
  </div>`;
  }).join('\n')}
</div>`;
}

// ── Mode family table ─────────────────────────────────────────────────────────

function renderModeFamilyTable(family, currentRoot, currentMode) {
  const rows = family.map(m => {
    const isSel = m.name === currentMode && Theory.noteIndex(m.root) === Theory.noteIndex(currentRoot);
    const url = `/modes/${Theory.modeSlug(m.name)}/${Theory.noteSlug(m.root)}/`;
    const chordNames = getDiatonicChords(m.root, m.name).map(c => disp(c.name)).join(' – ');
    return `  <tr${isSel ? ' class="selected"' : ''}>
    <td class="font-mono" style="font-size:10px;letter-spacing:.1em">${romanNumeral(m.degreeInParent)}</td>
    <td><a href="${url}">${disp(m.root)} ${m.name}</a></td>
    <td style="font-family:var(--mono);font-size:12px">${chordNames}</td>
    <td style="font-style:italic;color:var(--dim);font-size:12px">${m.mood.mood}</td>
  </tr>`;
  });

  return `<table class="mode-family-table">
<thead>
  <tr>
    <th>#</th><th>Mode</th><th>Diatonic chords</th><th>Mood</th>
  </tr>
</thead>
<tbody>${rows.join('\n')}</tbody>
</table>`;
}

// ── Fretboard ─────────────────────────────────────────────────────────────────

function renderFretboardSection(rootNote, modeData) {
  const svg = CAGED.renderFullFretboardSVG(rootNote, modeData.notes, modeData.pentaNotes);
  return `<div class="fretboard-full">${svg}</div>`;
}

// ── Rack module wrapper ───────────────────────────────────────────────────────

function pageModule(title, body, status) {
  const statusHtml = status ? `<span class="rack-module-status">${status}</span>` : '';
  return `<div class="page-module">
  <div class="screw screw-tl"></div><div class="screw screw-tr"></div>
  <div class="screw screw-bl"></div><div class="screw screw-br"></div>
  <div class="page-module-header">
    <span class="page-module-title">${title}</span>${statusHtml}
  </div>
  <div class="page-module-body">${body}</div>
</div>`;
}

// ── Full mode page ────────────────────────────────────────────────────────────

function buildModePage(rootNote, modeName) {
  const family = Theory.getModeFamily(rootNote, modeName);
  const modeData = family.find(m => m.name === modeName);
  const parentRoot = modeData.parentRoot;

  const title = `${rootNote} ${modeName} — Scale, Chords & Fretboard | Guitar Mode Finder`;
  const description = `${rootNote} ${modeName} uses the notes ${modeData.notes.join(' ')}. Built from ${parentRoot} major. Full fretboard, diatonic 7th chords, and pentatonic scale.`;
  const canonicalPath = `/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(rootNote)}/`;

  const chords = getDiatonicChords(rootNote, modeName);
  const dominantChord = chords.find(c => c.quality === '7');
  const playOverHint = dominantChord
    ? `▸ Play ${disp(rootNote)} ${modeName} over <strong>${disp(chords[0].name)}</strong> and <strong>${disp(dominantChord.name)}</strong> progressions.`
    : `▸ Play ${disp(rootNote)} ${modeName} over <strong>${disp(chords[0].name)}</strong> chord.`;

  const heroBody = `
    <div class="breadcrumb">
      <a href="/">Home</a><span class="sep">›</span>
      <a href="/modes/">Modes</a><span class="sep">›</span>
      <a href="/modes/${Theory.modeSlug(modeName)}/">${modeName}</a><span class="sep">›</span>
      ${disp(rootNote)} ${modeName}
    </div>
    <div class="mode-degree-badge">${romanNumeral(modeData.degreeInParent)}</div>
    <h1 class="page-hero-title">${disp(rootNote)} ${modeName}</h1>
    <div class="page-hero-sub">${modeData.mood.mood} &mdash; built from ${disp(parentRoot)} major</div>
    ${renderModeSelector(rootNote, modeName)}`;

  const familyBody = `
    <p style="font-size:12px;color:var(--dim);margin-bottom:12px">
      All 7 modes share the same parent scale (${disp(parentRoot)} major). ${disp(rootNote)} ${modeName} is the ${romanNumeral(modeData.degreeInParent)} mode.
    </p>
    ${renderModeFamilyTable(family, rootNote, modeName)}`;

  const scaleBody = `
    ${renderNotePills(modeData.notes, rootNote, modeData.pentaNotes)}
    <div class="interval-formula">Formula: ${modeData.formula}</div>
    <div class="characteristic-note">
      <strong>Characteristic note:</strong> ${modeData.characteristic.description}.
    </div>`;

  const chordsBody = `
    ${renderChordRow(chords)}
    <div class="play-over-hint">${playOverHint}</div>`;

  const fretboardBody = renderFretboardSection(rootNote, modeData);

  const moodBody = `
    <div class="mood-tag">${modeData.mood.mood.toUpperCase()}</div>
    <h3>Where to use ${disp(rootNote)} ${modeName}</h3>
    <p>${modeData.mood.usage}</p>
    <ul class="examples-list-static">
      ${modeData.mood.examples.split(', ').map(ex => `<li>${ex}</li>`).join('\n      ')}
    </ul>`;

  const relatedBody = renderRelatedLinks(rootNote, modeName);

  const content = `<main>
  <div class="page-rack" style="max-width:1400px;margin:0 auto;padding:24px 32px 60px;display:flex;flex-direction:column;gap:20px">
    ${pageModule(`CH·01 / ${disp(rootNote).toUpperCase()} ${modeName.toUpperCase()}`, heroBody)}
    ${pageModule(`PARENT FAMILY · ${disp(parentRoot)} MAJ`, familyBody)}
    ${pageModule(`SCALE · 7 NOTES · ${modeData.formula}`, scaleBody)}
    ${pageModule('DIATONIC 7ths · CHORD PAD', chordsBody)}
    ${pageModule('FRETBOARD · STANDARD TUNING · 15F', fretboardBody, '● LIVE')}
    ${pageModule(`CHARACTER · ${modeData.mood.mood.toUpperCase()}`, moodBody)}
    ${pageModule('RELATED KEYS', relatedBody)}
  </div>
</main>`;

  return htmlShell({ title, description, canonicalPath, content });
}

function renderRelatedLinks(rootNote, modeName) {
  const allRoots = Theory.ALL_ROOTS;
  const currentIdx = allRoots.indexOf(rootNote);
  const prevRoot = allRoots[(currentIdx + 11) % 12];
  const nextRoot = allRoots[(currentIdx + 1) % 12];
  const modeIdx = Theory.MODE_NAMES.indexOf(modeName);
  const prevMode = Theory.MODE_NAMES[(modeIdx + 6) % 7];
  const nextMode = Theory.MODE_NAMES[(modeIdx + 1) % 7];

  return `<div class="related-links">
  <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(prevRoot)}/">← ${disp(prevRoot)} ${modeName}</a>
  <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(nextRoot)}/">${disp(nextRoot)} ${modeName} →</a>
  <a class="key-chip" href="/modes/${Theory.modeSlug(prevMode)}/${Theory.noteSlug(rootNote)}/">${disp(rootNote)} ${prevMode}</a>
  <a class="key-chip" href="/modes/${Theory.modeSlug(nextMode)}/${Theory.noteSlug(rootNote)}/">${disp(rootNote)} ${nextMode}</a>
  <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/">All ${modeName} keys</a>
</div>`;
}

// ── Mode overview page ────────────────────────────────────────────────────────

function buildModeIndexPage(modeName) {
  const mood = Theory.MODE_MOOD[modeName];
  const title = `${modeName} Mode — Guitar Scale Guide | Guitar Mode Finder`;
  const description = `${modeName}: ${mood.mood}. Learn ${modeName} in all 12 keys with fretboard diagrams, diatonic chords, and pentatonic scales.`;
  const canonicalPath = `/modes/${Theory.modeSlug(modeName)}/`;

  const keyLinks = Theory.ALL_ROOTS.map(root => {
    const url = `/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(root)}/`;
    return `<a class="key-chip" href="${url}">${disp(root)} ${modeName}</a>`;
  }).join('\n    ');

  const heroBody = `
    <div class="breadcrumb"><a href="/">Home</a><span class="sep">›</span><a href="/modes/">Modes</a><span class="sep">›</span>${modeName}</div>
    <h1 class="page-hero-title">${modeName}</h1>
    <div class="page-hero-sub">${mood.mood}</div>`;

  const aboutBody = `
    <p>${mood.mood}. Used in ${mood.usage.toLowerCase()}.</p>
    <p style="margin-top:8px;font-size:12px;color:var(--dim)">Famous examples: ${mood.examples}.</p>
    <div class="characteristic-note" style="margin-top:12px">
      <strong>Characteristic note:</strong> ${Theory.MODE_CHARACTERISTIC_NOTE[modeName].description}.
    </div>`;

  const keysBody = `<div class="key-list">${keyLinks}</div>`;

  const content = `<main>
  <div class="page-rack" style="max-width:1400px;margin:0 auto;padding:24px 32px 60px;display:flex;flex-direction:column;gap:20px">
    ${pageModule(`CH·01 / ${modeName.toUpperCase()} MODE`, heroBody)}
    ${pageModule(`CHARACTER · ${mood.mood.toUpperCase()}`, aboutBody)}
    ${pageModule(`${modeName.toUpperCase()} IN ALL 12 KEYS`, keysBody)}
  </div>
</main>`;

  return htmlShell({ title, description, canonicalPath, content });
}

// ── Modes index ───────────────────────────────────────────────────────────────

function buildModesIndexPage() {
  const modeCards = Theory.MODE_NAMES.map(name => {
    const mood = Theory.MODE_MOOD[name];
    return `<a class="mode-overview-card" href="/modes/${Theory.modeSlug(name)}/">
  <div class="mode-name">${name}</div>
  <div class="mode-desc">${mood.mood}</div>
</a>`;
  }).join('\n');

  const heroBody = `
    <div class="breadcrumb"><a href="/">Home</a><span class="sep">›</span>Modes</div>
    <h1 class="page-hero-title">The 7 Modes</h1>
    <div class="page-hero-sub">All modes of the major scale — pick any key for full diagrams</div>`;

  const gridBody = `<div class="mode-grid">${modeCards}</div>`;

  const content = `<main>
  <div class="page-rack" style="max-width:1400px;margin:0 auto;padding:24px 32px 60px;display:flex;flex-direction:column;gap:20px">
    ${pageModule('CH·01 / ALL MODES', heroBody)}
    ${pageModule('BROWSE ALL MODES', gridBody)}
  </div>
</main>`;

  return htmlShell({
    title: 'Guitar Modes — All 7 Modes Explained | Guitar Mode Finder',
    description: 'All 7 modes of the major scale explained for guitar: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian. Fretboard diagrams in every key.',
    canonicalPath: '/modes/',
    content,
  });
}

// ── Sitemap ───────────────────────────────────────────────────────────────────

function buildSitemap(urls) {
  const urlEntries = urls.map(u => `  <url><loc>${SITE_URL}${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

function buildRobotsTxt() {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

// ── Build ─────────────────────────────────────────────────────────────────────

function build() {
  const urls = ['/'];
  let pageCount = 0;

  console.log('Building Guitar Mode Finder...\n');

  // Modes index
  writeFile(path.join(ROOT_DIR, 'modes', 'index.html'), buildModesIndexPage());
  urls.push('/modes/');
  console.log('✓ modes/index.html');

  // Per-mode index pages
  for (const modeName of Theory.MODE_NAMES) {
    const modeSlug = Theory.modeSlug(modeName);
    writeFile(path.join(ROOT_DIR, 'modes', modeSlug, 'index.html'), buildModeIndexPage(modeName));
    urls.push(`/modes/${modeSlug}/`);
    console.log(`✓ modes/${modeSlug}/index.html`);
  }

  // 84 mode × key pages
  for (const modeName of Theory.MODE_NAMES) {
    for (const rootNote of Theory.ALL_ROOTS) {
      const modeSlug = Theory.modeSlug(modeName);
      const keySlug = Theory.noteSlug(rootNote);
      writeFile(path.join(ROOT_DIR, 'modes', modeSlug, keySlug, 'index.html'), buildModePage(rootNote, modeName));
      urls.push(`/modes/${modeSlug}/${keySlug}/`);
      pageCount++;
    }
  }
  console.log(`✓ ${pageCount} mode pages`);

  // Sitemap + robots
  writeFile(path.join(ROOT_DIR, 'sitemap.xml'), buildSitemap(urls));
  writeFile(path.join(ROOT_DIR, 'robots.txt'), buildRobotsTxt());
  console.log('✓ sitemap.xml + robots.txt');
  console.log(`\nDone! ${urls.length} total pages.`);
}

build();
