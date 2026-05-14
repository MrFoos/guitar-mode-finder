#!/usr/bin/env node
// Generates one SVG per CAGED shape (C major / Ionian) and saves to /resources/
// Uses the same computeCAGEDWindow logic as ui.js to get correct fret windows.

const fs   = require('fs');
const path = require('path');
const Theory = require('../js/theory.js');
const CAGED  = require('../js/caged.js');

const OUT_DIR = path.join(__dirname, '..', 'resources');

// ── Constants (mirrors ui.js) ─────────────────────────────────────────────
const SEMITONES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const TUNING     = ['E', 'B', 'G', 'D', 'A', 'E'];  // string 1 (high e) → string 6 (low E)
const OPEN_SEMITONES = [4, 11, 7, 2, 9, 4];          // same order
const PENTA_IDX  = {
  Ionian:     [0,1,2,4,5],
  Dorian:     [0,1,3,4,6],
  Phrygian:   [0,2,3,4,6],
  Lydian:     [0,1,2,4,5],
  Mixolydian: [0,1,2,4,5],
  Aeolian:    [0,2,3,4,6],
  Locrian:    [0,2,3,4,6],
};

function noteAt(open, fret) {
  return SEMITONES[(SEMITONES.indexOf(open) + fret) % 12];
}
function inPenta(mode, idx) {
  return PENTA_IDX[mode].includes(idx);
}
function disp(n) {
  return n.replace('#', '♯').replace(/([A-G])b/g, '$1♭');
}

// ── computeCAGEDWindow (copied verbatim from ui.js) ───────────────────────
function computeCAGEDWindow(shape, root, mode) {
  const baseFret = CAGED.getShapeFret(shape, root);

  if (shape === 'C') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const rootNote = (OPEN_SEMITONES[1] + baseFret) % 12;
    const isLydian = ns.has((rootNote + 4) % 12) && ns.has((rootNote + 6) % 12);
    if (isLydian) {
      if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: true };
      if (baseFret === 2) return { winStart: 1, frets: 4, showOpen: true };
      return { winStart: baseFret - 2, frets: 5, showOpen: false };
    }
    if (baseFret === 1) {
      const openNoteSet = new Set(OPEN_SEMITONES);
      const hasFret4 = OPEN_SEMITONES.some(s => { const semi = (s + 4) % 12; return ns.has(semi) && !openNoteSet.has(semi); });
      return { winStart: 1, frets: hasFret4 ? 4 : 3, showOpen: true };
    }
    if (!OPEN_SEMITONES.some(s => ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    const hasExtraFret = ns.has((2 + baseFret) % 12);
    return { winStart: baseFret - 1, frets: hasExtraFret ? 5 : 4, showOpen: false };
  }

  if (shape === 'D') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const gStringPrev = (OPEN_SEMITONES[2] + baseFret - 1) % 12;
    if (ns.has(gStringPrev)) {
      if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: true };
      return { winStart: baseFret - 1, frets: 5, showOpen: false };
    }
    const bStringTop = (OPEN_SEMITONES[1] + baseFret + 4) % 12;
    if (ns.has(bStringTop)) return { winStart: baseFret, frets: 5, showOpen: false };
    if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: false };
    return { winStart: baseFret, frets: 4, showOpen: false };
  }

  if (shape === 'G') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const gStringNote = (OPEN_SEMITONES[2] + baseFret - 1) % 12;
    if (ns.has(gStringNote)) {
      if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: true };
      return { winStart: baseFret - 1, frets: 5, showOpen: false };
    }
    const notesAtTop = OPEN_SEMITONES.filter(s => ns.has((s + baseFret + 4) % 12)).length;
    if (notesAtTop >= 2) return { winStart: baseFret, frets: 5, showOpen: false };
    return { winStart: baseFret, frets: 4, showOpen: false };
  }

  if (shape === 'E' && baseFret === 1) {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const rootSemi = Theory.noteIndex(root);
    if (ns.has((rootSemi + 1) % 12) && ns.has((rootSemi + 6) % 12)) {
      return { winStart: 1, frets: 4, showOpen: false };
    }
    const openNoteSet = new Set(OPEN_SEMITONES);
    const hasNewAtFret4 = OPEN_SEMITONES.some(s => { const semi = (s + 4) % 12; return ns.has(semi) && !openNoteSet.has(semi); });
    return { winStart: 1, frets: hasNewAtFret4 ? 4 : 3, showOpen: true };
  }

  if (shape === 'E') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    if (!OPEN_SEMITONES.some(s => ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    const bStringAtPrev = (OPEN_SEMITONES[1] + baseFret - 1) % 12;
    if (ns.has(bStringAtPrev) && !OPEN_SEMITONES.some((s, i) => i !== 1 && ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    const bStringAtTop = (OPEN_SEMITONES[1] + baseFret + 3) % 12;
    const notesAtTop = OPEN_SEMITONES.filter(s => ns.has((s + baseFret + 3) % 12)).length;
    if (notesAtTop < 2 && !ns.has(bStringAtTop)) return { winStart: baseFret - 1, frets: 4, showOpen: false };
  }

  if (shape === 'A') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const rootSemi = Theory.noteIndex(root);
    const isLocrian = ns.has((rootSemi + 1) % 12) && ns.has((rootSemi + 6) % 12);
    if (isLocrian) return { winStart: baseFret + 1, frets: 5, showOpen: false };
    const bStringAtBase = (OPEN_SEMITONES[1] + baseFret) % 12;
    const onlyBString = ns.has(bStringAtBase) && !OPEN_SEMITONES.some((s, i) => i !== 1 && ns.has((s + baseFret) % 12));
    const noneAtBase = !OPEN_SEMITONES.some(s => ns.has((s + baseFret) % 12));
    if (onlyBString || noneAtBase) {
      return { winStart: baseFret + 1, frets: 4, showOpen: false };
    }
  }

  const rootSemi = Theory.noteIndex(root);
  const noteSet = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
  const anchorStart = (shape === 'E') ? baseFret - 1 : baseFret;
  const canShowOpen = baseFret === 1 && shape !== 'C' && shape !== 'A';

  let best = null, bestScore = -Infinity;

  for (let delta = -3; delta <= 2; delta++) {
    for (let size = 4; size <= 5; size++) {
      let winStart = anchorStart + delta;
      let fretCount = size;
      let showOpen = false;

      if (winStart === 0) {
        if (!canShowOpen) continue;
        showOpen = true;
        winStart = 1;
      } else if (winStart < 1) {
        fretCount += winStart - 1;
        winStart = 1;
      }
      if (fretCount < 4) continue;

      const found = new Set();
      let rootPositions = 0, rootAtStart = 0, rootAtEnd = 0, coveredPositions = 0;

      if (showOpen) {
        for (let s = 0; s < 6; s++) {
          const semi = OPEN_SEMITONES[s] % 12;
          if (noteSet.has(semi)) { found.add(semi); coveredPositions++; }
          if (semi === rootSemi) rootPositions++;
        }
      }
      for (let f = winStart; f < winStart + fretCount; f++) {
        for (let s = 0; s < 6; s++) {
          const semi = (OPEN_SEMITONES[s] + f) % 12;
          if (noteSet.has(semi)) { found.add(semi); coveredPositions++; }
          if (semi === rootSemi) {
            rootPositions++;
            if (f === winStart) rootAtStart++;
            if (f === winStart + fretCount - 1) rootAtEnd++;
          }
        }
      }

      if (found.size < 7 || rootPositions === 0) continue;

      const rootAtEdge = rootAtStart + rootAtEnd;
      const nonEdgeRoots = rootPositions - rootAtEdge;
      const rootOnlyAtEdge = rootAtEdge > 0 && rootAtEdge === rootPositions;
      const rootAtBothEnds = rootAtStart > 0 && rootAtEnd > 0;
      const edgePenalty = rootOnlyAtEdge ? 10 : (rootAtBothEnds ? 5 : 0);
      const deltaPenalty = showOpen ? 0 : Math.abs(delta) * 6;
      const score = -size * 3 - deltaPenalty + rootPositions * 5 + nonEdgeRoots * 2 + coveredPositions * 2 - edgePenalty;

      if (score > bestScore) {
        bestScore = score;
        best = { winStart, frets: fretCount, showOpen };
      }
    }
  }

  return best ?? { winStart: baseFret, frets: 4, showOpen: false };
}

// ── Static SVG renderer ───────────────────────────────────────────────────
function generateShapeSVG(shape, root, mode) {
  const scale = Theory.getModeNotes(root, mode);
  const normalizedScale = scale.map(n => SEMITONES[Theory.noteIndex(n)]);
  const noteSet = new Set(normalizedScale);
  const displayNote = {};
  normalizedScale.forEach((norm, i) => { displayNote[norm] = scale[i]; });

  const { winStart, frets, showOpen } = computeCAGEDWindow(shape, root, mode);

  const H      = 220;
  const W      = 682;
  const padL   = showOpen ? 120 : 70;
  const padR   = 22;
  const padT   = 34;
  const padB   = 40;
  const fretW  = (W - padL - padR) / frets;
  const rowH   = (H - padT - padB) / 5;
  const openX  = padL - 50;

  const p = [];
  p.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${root} ${shape}-shape CAGED fretboard diagram">`);

  // Background
  p.push(`<rect width="${W}" height="${H}" fill="#111117" rx="6"/>`);
  p.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="#242432" stroke-width="1" rx="5.5"/>`);

  // Fretboard area background
  const fbLeft  = showOpen ? padL - 8 : padL - 4;
  const fbTop   = padT - 4;
  const fbBot   = H - padB + 4;
  p.push(`<rect x="${fbLeft}" y="${fbTop}" width="${W - fbLeft - padR + 4}" height="${fbBot - fbTop}" fill="#16161f" rx="2"/>`);

  // Shape label + fret indicator
  p.push(`<text x="14" y="18" font-family="system-ui,sans-serif" font-size="12" fill="#7c3aed" font-weight="700" letter-spacing="1">${shape}</text>`);
  p.push(`<text x="30" y="18" font-family="system-ui,sans-serif" font-size="12" fill="#5a5a78" font-weight="400"> shape</text>`);
  p.push(`<text x="${W - padR}" y="18" font-family="system-ui,sans-serif" font-size="12" fill="#5a5a78" text-anchor="end">fr ${winStart}</text>`);

  // Nut (when open position)
  if (showOpen) {
    p.push(`<rect x="${padL - 8}" y="${padT - 6}" width="8" height="${H - padT - padB + 12}" fill="#5a5a78" rx="2"/>`);
  }

  // Inlays
  const inlayFrets = [3, 5, 7, 9, 15, 17];
  const dblFrets   = [12, 24];
  const inlayCY    = (padT + 2.5 * rowH).toFixed(1);
  inlayFrets.forEach(af => {
    const off = af - winStart;
    if (off >= 0 && off < frets) {
      const cx = (padL + (off + 0.5) * fretW).toFixed(1);
      p.push(`<circle cx="${cx}" cy="${inlayCY}" r="5" fill="#1e1e2e" opacity="0.9"/>`);
    }
  });
  dblFrets.forEach(af => {
    const off = af - winStart;
    if (off >= 0 && off < frets) {
      const cx = (padL + (off + 0.5) * fretW).toFixed(1);
      p.push(`<circle cx="${cx}" cy="${(padT + 1.5 * rowH).toFixed(1)}" r="5" fill="#1e1e2e" opacity="0.9"/>`);
      p.push(`<circle cx="${cx}" cy="${(padT + 3.5 * rowH).toFixed(1)}" r="5" fill="#1e1e2e" opacity="0.9"/>`);
    }
  });

  // Strings
  TUNING.forEach((s, i) => {
    const y  = (padT + i * rowH).toFixed(1);
    const sw = (0.6 + i * 0.22).toFixed(2);
    const x1 = showOpen ? (openX + 16).toFixed(1) : (padL - 10).toFixed(1);
    p.push(`<line x1="${x1}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#2e2e42" stroke-width="${sw}"/>`);
    if (!showOpen) {
      p.push(`<text x="${padL - 26}" y="${(padT + i * rowH + 4).toFixed(1)}" font-family="monospace" font-size="12" fill="#5a5a78" text-anchor="middle">${s}</text>`);
    }
  });

  // Fret lines
  for (let f = 0; f <= frets; f++) {
    const x  = padL + f * fretW;
    const skip = showOpen && f === 0;
    if (!skip) {
      p.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${(padT - 4).toFixed(1)}" y2="${(H - padB + 4).toFixed(1)}" stroke="#2a2a3e" stroke-width="1.2"/>`);
    }
  }

  // Fret numbers
  for (let f = 0; f < frets; f++) {
    const x = (padL + (f + 0.5) * fretW).toFixed(1);
    p.push(`<text x="${x}" y="${(H - padB + 28).toFixed(1)}" font-family="monospace" font-size="12" fill="#5a5a78" text-anchor="middle">${winStart + f}</text>`);
  }

  function drawDot(cx, cy, normalizedNote, scaleIdx) {
    const isRoot = scaleIdx === 0;
    const ip     = inPenta(mode, scaleIdx);
    const r      = 12;
    const label  = disp(displayNote[normalizedNote] || normalizedNote);
    const fs     = label.length > 1 ? '8' : '10';

    const fill   = isRoot ? '#b91c1c' : ip ? '#0d2a18'  : '#1c1c28';
    const stroke = isRoot ? '#ef4444' : ip ? '#4ade80'  : '#3a3a58';
    const sw     = isRoot ? '1.5'     : ip ? '1.2'      : '0.8';
    const txtCol = isRoot ? 'white'   : ip ? '#4ade80'  : '#8888aa';
    p.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    p.push(`<text x="${cx}" y="${(parseFloat(cy) + 4).toFixed(1)}" font-family="system-ui,sans-serif" font-size="${fs}" fill="${txtCol}" text-anchor="middle" font-weight="700">${label}</text>`);
  }

  // Open string dots
  if (showOpen) {
    TUNING.forEach((open, si) => {
      const n   = noteAt(open, 0);
      const cx  = openX.toFixed(1);
      const cy  = (padT + si * rowH).toFixed(1);
      if (noteSet.has(n)) {
        const idx = normalizedScale.indexOf(n);
        drawDot(cx, cy, n, idx);
      } else {
        p.push(`<text x="${cx}" y="${(padT + si * rowH + 4).toFixed(1)}" font-family="monospace" font-size="12" fill="#5a5a78" text-anchor="middle">${open}</text>`);
      }
    });
  }

  // Fretted dots
  const openScaleNotes = showOpen
    ? new Set(TUNING.map(open => noteAt(open, 0)).filter(n => noteSet.has(n)))
    : null;

  // C-shape Lydian: suppress open-duplicate at last fret (mirrors ui.js logic)
  const baseFretForShape = CAGED.getShapeFret(shape, root);
  const semiSet = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
  const rootNoteForLydian = (OPEN_SEMITONES[1] + baseFretForShape) % 12;
  const isLydianShape = semiSet.has((rootNoteForLydian + 4) % 12) && semiSet.has((rootNoteForLydian + 6) % 12);

  TUNING.forEach((open, si) => {
    for (let off = 0; off < frets; off++) {
      const n = noteAt(open, winStart + off);
      if (!noteSet.has(n)) continue;
      if (shape === 'C' && showOpen && isLydianShape && off === frets - 1 && openScaleNotes.has(n)) continue;
      const idx = normalizedScale.indexOf(n);
      const cx  = (padL + (off + 0.5) * fretW).toFixed(1);
      const cy  = (padT + si * rowH).toFixed(1);
      drawDot(cx, cy, n, idx);
    }
  });

  p.push('</svg>');
  return p.join('\n');
}

// ── Generate ──────────────────────────────────────────────────────────────
const ROOT = 'C';
const MODE = 'Ionian';

for (const shape of CAGED.CAGED_ORDER) {
  const svg     = generateShapeSVG(shape, ROOT, MODE);
  const outPath = path.join(OUT_DIR, `caged-${shape.toLowerCase()}.svg`);
  fs.writeFileSync(outPath, svg, 'utf8');
  console.log(`✓  ${outPath}`);
}

console.log('\nDone — 5 SVGs written to /resources/');
