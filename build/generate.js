#!/usr/bin/env node
// generate.js — Pre-renders all 84 mode pages + sitemap.xml
// Run: node build/generate.js

const fs = require('fs');
const path = require('path');

const Theory = require('../js/theory.js');
const CAGED = require('../js/caged.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_URL = 'https://guitarmodefinder.com';

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

// ── HTML shell ────────────────────────────────────────────────────────────────

function htmlShell({ title, description, canonicalPath, bodyClass, content, ogImage }) {
  return `<!DOCTYPE html>
<html lang="en">
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
<link rel="stylesheet" href="${'/css/main.css'}">
<link rel="icon" href="/favicon.ico" type="image/x-icon">
</head>
<body class="${bodyClass || ''}">
${siteHeader()}
${content}
${siteFooter()}
<script src="/js/ui.js" defer></script>
</body>
</html>`;
}

function siteHeader() {
  return `<header class="site-header">
  <div class="inner">
    <a class="site-logo" href="/"><span class="logo-mark">&#9834;</span> Guitar Mode Finder</a>
    <nav class="site-nav">
      <a href="/modes/">Modes</a>
      <a href="/guides/how-to-use-modes.html">How to Use Modes</a>
    </nav>
  </div>
</header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
  <p>
    <a href="/">Home</a> &middot;
    <a href="/modes/">All Modes</a> &middot;
    <a href="/guides/how-to-use-modes.html">How to Use Modes</a>
  </p>
  <p style="margin-top:0.5rem">Guitar Mode Finder &mdash; Free guitar modes reference</p>
</footer>`;
}

// ── Note pills ────────────────────────────────────────────────────────────────

function renderNotePills(notes, rootNote, pentaNotes) {
  const pentaSet = new Set(pentaNotes.map(n => Theory.noteIndex(n)));
  const rootIdx = Theory.noteIndex(rootNote);

  return `<div class="note-pills">
${notes.map(note => {
    const idx = Theory.noteIndex(note);
    const isRoot = idx === rootIdx;
    const isPenta = pentaSet.has(idx);
    let cls = 'note-pill';
    if (isRoot) cls += ' is-root';
    if (isPenta) cls += ' is-penta';
    return `  <span class="${cls}">${note}</span>`;
  }).join('\n')}
</div>
<div class="note-legend">
  <span><span class="swatch root"></span> Root</span>
  <span><span class="swatch penta"></span> Pentatonic</span>
  <span><span class="swatch scale"></span> Scale tone</span>
</div>`;
}

// ── Chord row ─────────────────────────────────────────────────────────────────

function renderChordRow(chords) {
  return `<div class="chord-row">
${chords.map((ch, i) => {
    const cls = i === 0 ? 'chord-card tonic' : 'chord-card';
    return `  <div class="${cls}">
    <div class="degree">${romanNumeral(ch.degree)}</div>
    <div class="chord-name">${ch.name}</div>
  </div>`;
  }).join('\n')}
</div>`;
}

// ── Mode family table ─────────────────────────────────────────────────────────

function renderModeFamilyTable(family, currentRoot, currentMode) {
  const rows = family.map(m => {
    const isSelected = m.name === currentMode && Theory.noteIndex(m.root) === Theory.noteIndex(currentRoot);
    const url = `/modes/${Theory.modeSlug(m.name)}/${Theory.noteSlug(m.root)}/`;
    const chordNames = m.chords.map(c => c.name).join(' – ');
    const trClass = isSelected ? ' class="selected"' : '';
    const linkClass = isSelected ? 'mode-link selected-mode' : 'mode-link';
    return `  <tr${trClass}>
    <td><span class="font-mono text-muted" style="font-size:0.78rem">${romanNumeral(m.degreeInParent)}</span></td>
    <td><a class="${linkClass}" href="${url}">${m.root} ${m.name}</a></td>
    <td class="chord-list">${chordNames}</td>
    <td class="mood-tag">${m.mood.mood}</td>
  </tr>`;
  });

  return `<table class="mode-family-table">
<thead>
  <tr>
    <th>#</th>
    <th>Mode</th>
    <th>Diatonic chords</th>
    <th>Mood</th>
  </tr>
</thead>
<tbody>
${rows.join('\n')}
</tbody>
</table>`;
}

// ── Fretboard diagram ─────────────────────────────────────────────────────────

function renderFretboardSection(rootNote, modeData) {
  const svg = CAGED.renderFullFretboardSVG(rootNote, modeData.notes, modeData.pentaNotes);
  return `<div class="fretboard-full">${svg}</div>
<div class="note-legend" style="margin-top:0.6rem">
  <span><span class="swatch root"></span> Root</span>
  <span><span class="swatch penta"></span> Pentatonic</span>
  <span><span class="swatch scale"></span> Scale tone</span>
</div>`;
}

// ── Full mode page ────────────────────────────────────────────────────────────

function buildModePage(rootNote, modeName) {
  const family = Theory.getModeFamily(rootNote, modeName);
  const modeData = family.find(m => m.name === modeName);
  const chords = modeData.chords;
  const parentRoot = modeData.parentRoot;

  const title = `${rootNote} ${modeName} — Scale, Chords & Fretboard | Guitar Mode Finder`;
  const description = `${rootNote} ${modeName} uses the notes ${modeData.notes.join(' ')}. Built from ${parentRoot} major. Full fretboard diagram, diatonic 7th chords, pentatonic scale, and usage tips.`;
  const canonicalPath = `/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(rootNote)}/`;

  const playOverChord = chords[0].name;
  const dominantChord = chords.find(c => c.quality === '7');
  const playOverHint = dominantChord
    ? `Play ${rootNote} ${modeName} over ${playOverChord} and ${dominantChord.name} progressions.`
    : `Play ${rootNote} ${modeName} over ${playOverChord} chord.`;

  const content = `<main>
  <div class="page-hero">
    <p class="breadcrumb">
      <a href="/">Home</a> &rsaquo;
      <a href="/modes/">Modes</a> &rsaquo;
      <a href="/modes/${Theory.modeSlug(modeName)}/">${modeName}</a> &rsaquo;
      ${rootNote} ${modeName}
    </p>
    <h1>${rootNote} ${modeName}</h1>
    <p class="subtitle">${modeData.mood.mood} &mdash; built from ${parentRoot} major</p>
    ${renderModeSelector(rootNote, modeName)}
  </div>

  <section class="content-section">
    <h2>The ${parentRoot} major family</h2>
    <p class="text-muted" style="margin-bottom:0.75rem;font-size:0.9rem">
      All 7 modes share the same parent scale (${parentRoot} major). ${rootNote} ${modeName} is the ${romanNumeral(modeData.degreeInParent)} mode.
    </p>
    ${renderModeFamilyTable(family, rootNote, modeName)}
  </section>

  <section class="content-section">
    <h2>${rootNote} ${modeName} scale</h2>
    ${renderNotePills(modeData.notes, rootNote, modeData.pentaNotes)}
    <p class="interval-formula" style="margin-top:0.75rem">Formula: <strong>${modeData.formula}</strong></p>
    <div class="characteristic-note">
      <strong>Characteristic note:</strong> ${modeData.characteristic.description}.
    </div>
  </section>

  <section class="content-section">
    <h2>Diatonic 7th chords</h2>
    ${renderChordRow(chords)}
    <p class="play-over-hint">${playOverHint}</p>
  </section>

  <section class="content-section">
    <h2>Fretboard</h2>
    ${renderFretboardSection(rootNote, modeData)}
  </section>

  <section class="content-section">
    <h2>Sound &amp; usage</h2>
    <div class="mood-block">
      <div class="mood-tag">${modeData.mood.mood}</div>
      <h3>Where to use ${rootNote} ${modeName}</h3>
      <p>${modeData.mood.usage}</p>
      <ul class="examples-list">
        ${modeData.mood.examples.split(', ').map(ex => `<li>${ex}</li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  ${renderRelatedLinks(rootNote, modeName)}
</main>`;

  return htmlShell({ title, description, canonicalPath, content });
}

function renderModeSelector(currentRoot, currentMode) {
  const rootOptions = Theory.ROOT_DISPLAY.map(r =>
    `<option value="${r.value}"${r.value === currentRoot ? ' selected' : ''}>${r.label}</option>`
  ).join('');

  const modeOptions = Theory.MODE_NAMES.map(m =>
    `<option value="${m}"${m === currentMode ? ' selected' : ''}>${m}</option>`
  ).join('');

  return `<div class="mode-selector" style="justify-content:flex-start;margin-top:1rem">
  <select id="rootSelect" aria-label="Root note">${rootOptions}</select>
  <span class="in-label">in</span>
  <select id="modeSelect" aria-label="Mode">${modeOptions}</select>
  <button class="btn-primary" id="goBtn">Go</button>
</div>`;
}

function renderRelatedLinks(rootNote, modeName) {
  const allRoots = Theory.ALL_ROOTS;
  const currentIdx = allRoots.indexOf(rootNote);
  const prevRoot = allRoots[(currentIdx + 11) % 12];
  const nextRoot = allRoots[(currentIdx + 1) % 12];

  const modeIdx = Theory.MODE_NAMES.indexOf(modeName);
  const prevMode = Theory.MODE_NAMES[(modeIdx + 6) % 7];
  const nextMode = Theory.MODE_NAMES[(modeIdx + 1) % 7];

  return `<section class="content-section">
  <h2>Related</h2>
  <div style="display:flex;flex-wrap:wrap;gap:0.5rem">
    <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(prevRoot)}/">&larr; ${prevRoot} ${modeName}</a>
    <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(nextRoot)}/">${nextRoot} ${modeName} &rarr;</a>
    <a class="key-chip" href="/modes/${Theory.modeSlug(prevMode)}/${Theory.noteSlug(rootNote)}/">${rootNote} ${prevMode}</a>
    <a class="key-chip" href="/modes/${Theory.modeSlug(nextMode)}/${Theory.noteSlug(rootNote)}/">${rootNote} ${nextMode}</a>
    <a class="key-chip" href="/modes/${Theory.modeSlug(modeName)}/">All ${modeName} keys</a>
  </div>
</section>`;
}

// ── Mode overview page (per mode, all 12 keys) ─────────────────────────────

function buildModeIndexPage(modeName) {
  const mood = Theory.MODE_MOOD[modeName];
  const title = `${modeName} Mode — Guitar Scale Guide | Guitar Mode Finder`;
  const description = `${modeName}: ${mood.mood}. Learn ${modeName} in all 12 keys with fretboard diagrams, diatonic chords, and pentatonic scales.`;
  const canonicalPath = `/modes/${Theory.modeSlug(modeName)}/`;

  const keyLinks = Theory.ALL_ROOTS.map(root => {
    const url = `/modes/${Theory.modeSlug(modeName)}/${Theory.noteSlug(root)}/`;
    return `<a class="key-chip" href="${url}">${root} ${modeName}</a>`;
  }).join('\n    ');

  const content = `<main>
  <div class="page-hero">
    <p class="breadcrumb"><a href="/">Home</a> &rsaquo; <a href="/modes/">Modes</a> &rsaquo; ${modeName}</p>
    <h1>${modeName}</h1>
    <p class="subtitle">${mood.mood}</p>
  </div>

  <section class="content-section">
    <h2>About ${modeName}</h2>
    <p>${mood.mood}. Used in ${mood.usage.toLowerCase()}.</p>
    <p class="text-muted" style="font-size:0.9rem">Famous examples: ${mood.examples}.</p>
    <div class="characteristic-note" style="margin-top:1rem">
      <strong>Characteristic note:</strong> ${Theory.MODE_CHARACTERISTIC_NOTE[modeName].description}.
    </div>
  </section>

  <section class="content-section">
    <h2>${modeName} in all 12 keys</h2>
    <div class="key-list">
    ${keyLinks}
    </div>
  </section>
</main>`;

  return htmlShell({ title, description, canonicalPath, content });
}

// ── Modes index page ──────────────────────────────────────────────────────────

function buildModesIndexPage() {
  const modeCards = Theory.MODE_NAMES.map(name => {
    const mood = Theory.MODE_MOOD[name];
    return `<a class="mode-card" href="/modes/${Theory.modeSlug(name)}/">
  <div class="mode-name">${name}</div>
  <div class="mode-desc">${mood.mood}</div>
</a>`;
  }).join('\n');

  const content = `<main>
  <div class="page-hero">
    <p class="breadcrumb"><a href="/">Home</a> &rsaquo; Modes</p>
    <h1>The 7 Guitar Modes</h1>
    <p class="subtitle">All modes of the major scale — pick any key and see full diagrams</p>
  </div>
  <div class="mode-grid">${modeCards}</div>
</main>`;

  return htmlShell({
    title: 'Guitar Modes — All 7 Modes Explained | Guitar Mode Finder',
    description: 'All 7 modes of the major scale explained for guitar: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian. Fretboard diagrams in every key.',
    canonicalPath: '/modes/',
    content,
  });
}

// ── Home page ─────────────────────────────────────────────────────────────────

function buildHomePage() {
  const rootOptions = Theory.ROOT_DISPLAY.map(r =>
    `<option value="${r.value}">${r.label}</option>`
  ).join('');

  const modeOptions = Theory.MODE_NAMES.map(m =>
    `<option value="${m}">${m}</option>`
  ).join('');

  const modeCards = Theory.MODE_NAMES.map(name => {
    const mood = Theory.MODE_MOOD[name];
    return `<a class="mode-card" href="/modes/${Theory.modeSlug(name)}/">
  <div class="mode-name">${name}</div>
  <div class="mode-desc">${mood.mood}</div>
</a>`;
  }).join('\n');

  const content = `<main>
  <div class="hero">
    <h1>Find your <em>mode</em>.<br>Play it everywhere.</h1>
    <p>Select any mode and key — instantly see the full scale family, diatonic chords, pentatonic subset, and fretboard diagram.</p>
    <div class="mode-selector">
      <select id="rootSelect" aria-label="Root note">${rootOptions}</select>
      <span class="in-label">in</span>
      <select id="modeSelect" aria-label="Mode">${modeOptions}</select>
      <button class="btn-primary" id="goBtn">Explore</button>
    </div>
    <p style="font-size:0.82rem;color:var(--text-muted);margin-top:0.5rem">Try: <a href="/modes/dorian/g-sharp/">G# Dorian</a> &middot; <a href="/modes/lydian/f/">F Lydian</a> &middot; <a href="/modes/mixolydian/a/">A Mixolydian</a></p>
  </div>

  <section class="content-section" style="margin-top:2rem">
    <h2>Browse all modes</h2>
    <div class="mode-grid">${modeCards}</div>
  </section>

</main>`;

  return htmlShell({
    title: 'Guitar Mode Finder — Fretboard Diagrams for All 7 Modes',
    description: 'Find any guitar mode in any key. See the full scale family, diatonic 7th chords, pentatonic subset, and full fretboard diagrams. Free, fast, no ads.',
    canonicalPath: '/',
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

// ── robots.txt ────────────────────────────────────────────────────────────────

function buildRobotsTxt() {
  return `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;
}

// ── Main build ────────────────────────────────────────────────────────────────

function build() {
  const urls = ['/'];
  let pageCount = 0;

  console.log('Building Guitar Mode Finder...\n');

  // Home
  writeFile(path.join(ROOT_DIR, 'index.html'), buildHomePage());
  console.log('✓ index.html');

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

  // All 84 mode × key pages
  for (const modeName of Theory.MODE_NAMES) {
    for (const rootNote of Theory.ALL_ROOTS) {
      const modeSlug = Theory.modeSlug(modeName);
      const keySlug = Theory.noteSlug(rootNote);
      const html = buildModePage(rootNote, modeName);
      writeFile(path.join(ROOT_DIR, 'modes', modeSlug, keySlug, 'index.html'), html);
      urls.push(`/modes/${modeSlug}/${keySlug}/`);
      pageCount++;
    }
  }
  console.log(`✓ ${pageCount} mode pages`);

  // Sitemap
  writeFile(path.join(ROOT_DIR, 'sitemap.xml'), buildSitemap(urls));
  console.log('✓ sitemap.xml');

  // robots.txt
  writeFile(path.join(ROOT_DIR, 'robots.txt'), buildRobotsTxt());
  console.log('✓ robots.txt');

  console.log(`\nDone! ${urls.length} total pages.`);
}

build();
