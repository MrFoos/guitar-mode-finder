// Tests for the CAGED window algorithm and music theory engine.
// computeCAGEDWindow mirrors the implementation in js/ui.js exactly.
// If you change the algorithm there, update it here too.

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Theory = require('../js/theory.js');
const CAGED   = require('../js/caged.js');

// ── Constants (duplicated from js/ui.js) ─────────────────────────────────────

const OPEN_SEMITONES = [4, 11, 7, 2, 9, 4]; // e B G D A E

function computeCAGEDWindow(shape, root, mode) {
  const baseFret = CAGED.getShapeFret(shape, root);
  if (shape === 'C') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    // Lydian is uniquely identified by having both M3 (+4) and #4 (+6) above root.
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
    // Only extend left if baseFret-1 actually has scale notes (Locrian has none there).
    if (!OPEN_SEMITONES.some(s => ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    const hasExtraFret = ns.has((2 + baseFret) % 12);
    return { winStart: baseFret - 1, frets: hasExtraFret ? 5 : 4, showOpen: false };
  }
  if (shape === 'D') {
    const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    // Extend DOWN if G-string at baseFret-1 has a scale note (major 3rd: Ionian, Lydian, Mixolydian)
    const gStringPrev = (OPEN_SEMITONES[2] + baseFret - 1) % 12;
    if (ns.has(gStringPrev)) {
      if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: true };
      return { winStart: baseFret - 1, frets: 5, showOpen: false };
    }
    // Extend UP if B-string at baseFret+4 has a scale note (b2: Phrygian, Locrian)
    const bStringTop = (OPEN_SEMITONES[1] + baseFret + 4) % 12;
    if (ns.has(bStringTop)) return { winStart: baseFret, frets: 5, showOpen: false };
    // Default 4 frets — no open-string notes warranted (Dorian/Aeolian at baseFret=1)
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
    // No notes at baseFret-1 → start at baseFret (Phrygian, some Locrian).
    if (!OPEN_SEMITONES.some(s => ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    // Only B-string has a note at baseFret-1 (Locrian's dim5) → skip it, start at baseFret.
    const bStringAtPrev = (OPEN_SEMITONES[1] + baseFret - 1) % 12;
    if (ns.has(bStringAtPrev) && !OPEN_SEMITONES.some((s, i) => i !== 1 && ns.has((s + baseFret - 1) % 12))) {
      return { winStart: baseFret, frets: 4, showOpen: false };
    }
    // Only extend to 5 frets when ≥2 strings have scale notes at baseFret+3 (top of extended window).
    // Lydian's sole note there (F# on G string) doesn't warrant extension; Mixolydian's b7 on B string does.
    const bStringAtTop = (OPEN_SEMITONES[1] + baseFret + 3) % 12;
    const notesAtTop = OPEN_SEMITONES.filter(s => ns.has((s + baseFret + 3) % 12)).length;
    if (notesAtTop < 2 && !ns.has(bStringAtTop)) return { winStart: baseFret - 1, frets: 4, showOpen: false };
  }
  // A-shape: skip baseFret when it contributes nothing useful to the window.
  // Phrygian: only B string has a note (b2) — already covered at baseFret+3 on G string.
  // Aeolian and others: baseFret column is completely empty.
  // Locrian: has both b2 (+1) and dim5 (+6) — uniquely identifies Locrian. Window starts
  // at baseFret+1 with 5 frets to capture the dim5 on the B string at the far end.
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

// ── Helper ───────────────────────────────────────────────────────────────────

function windowContents(shape, root, mode) {
  const { winStart, frets, showOpen } = computeCAGEDWindow(shape, root, mode);
  const noteSet = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
  const rootSemi = Theory.noteIndex(root);
  const found = new Set();
  let rootVisible = false;

  if (showOpen) {
    for (let s = 0; s < 6; s++) {
      const semi = OPEN_SEMITONES[s] % 12;
      if (noteSet.has(semi)) found.add(semi);
      if (semi === rootSemi) rootVisible = true;
    }
  }
  for (let f = winStart; f < winStart + frets; f++) {
    for (let s = 0; s < 6; s++) {
      const semi = (OPEN_SEMITONES[s] + f) % 12;
      if (noteSet.has(semi)) found.add(semi);
      if (semi === rootSemi) rootVisible = true;
    }
  }
  return { found, rootVisible, winStart, frets, showOpen };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('All 420 shape/mode/root combinations', () => {
  const shapes = ['C', 'A', 'G', 'E', 'D'];
  const modes  = Theory.MODE_NAMES;
  const roots  = Theory.ALL_ROOTS;

  for (const shape of shapes) {
    for (const mode of modes) {
      for (const root of roots) {
        it(`${shape}-shape ${root} ${mode}`, () => {
          const { found, rootVisible, frets, showOpen } = windowContents(shape, root, mode);
          assert.equal(found.size, 7, 'all 7 scale notes visible');
          assert.ok(rootVisible, 'root note visible');
          // showOpen adds an extra visual column (open strings), so min fretted slots is 3 not 4
          const minFrets = showOpen ? 3 : 4;
          assert.ok(frets >= minFrets && frets <= 5, `window ${minFrets}–5 frets (got ${frets})`);
        });
      }
    }
  }
});

describe('Open-string positions', () => {
  it('C C-shape Ionian: baseFret=1 → showOpen=true, winStart=1, frets=3 (B on G-string fret 4 duplicates open B)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C', 'Ionian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 3);
  });

  it('E F-shape: baseFret wraps to 1 → showOpen=true', () => {
    assert.ok(computeCAGEDWindow('E', 'F', 'Mixolydian').showOpen);
  });

  it('G G#-shape: baseFret wraps to 1 → showOpen=true', () => {
    assert.ok(computeCAGEDWindow('G', 'G#', 'Ionian').showOpen);
  });

  it('D D#-shape: baseFret wraps to 1 → showOpen=true', () => {
    assert.ok(computeCAGEDWindow('D', 'D#', 'Ionian').showOpen);
  });

  it('A C-shape: baseFret=2 → showOpen=false (not a natural open position)', () => {
    assert.equal(computeCAGEDWindow('A', 'C', 'Ionian').showOpen, false);
  });
});

describe('Regression: user-confirmed windows', () => {
  it('E C Ionian → canonical window 7–10', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'C', 'Ionian');
    assert.equal(winStart, 7);
    assert.equal(winStart + frets - 1, 10);
  });

  it('E D Mixolydian → window 9–13 (b7=C on B-string fret 13 warrants extension)', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'D', 'Mixolydian');
    assert.equal(winStart, 9);
    assert.equal(winStart + frets - 1, 13);
  });

  it('G C Lydian → canonical window 4–8 (♯4=F# at B-string fret 7)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Lydian');
    assert.equal(winStart, 4);
    assert.equal(winStart + frets - 1, 8);
  });

  it('A C Ionian → window 2–6', () => {
    const { winStart, frets } = computeCAGEDWindow('A', 'C', 'Ionian');
    assert.equal(winStart, 2);
    assert.equal(winStart + frets - 1, 6);
  });

  it('E C Dorian → canonical window 7–11', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'C', 'Dorian');
    assert.equal(winStart, 7);
    assert.equal(winStart + frets - 1, 11);
  });

  it('C C# Ionian → 4 fretted columns starting at fret 1, nut visible (no open strings)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C#', 'Ionian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('G C Ionian → canonical window 4–8', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Ionian');
    assert.equal(winStart, 4);
    assert.equal(winStart + frets - 1, 8);
  });

  it('D C Ionian → canonical window 9–13', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'C', 'Ionian');
    assert.equal(winStart, 9);
    assert.equal(winStart + frets - 1, 13);
  });

  it('C C# Dorian → frets=5 (E on B-string fret 5 = minor 3rd ∈ Dorian)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C#', 'Dorian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 5);
  });

  it('C C# Phrygian → frets=5 (minor 3rd ∈ scale)', () => {
    const { frets } = computeCAGEDWindow('C', 'C#', 'Phrygian');
    assert.equal(frets, 5);
  });

  it('C C# Aeolian → frets=5 (minor 3rd ∈ scale)', () => {
    const { frets } = computeCAGEDWindow('C', 'C#', 'Aeolian');
    assert.equal(frets, 5);
  });

  it('C C# Ionian → frets=4 (major 3rd only, no minor 3rd on B-string at fret 5)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C#', 'Ionian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('C C# Lydian → frets=4 (major 3rd mode, no extension)', () => {
    const { frets } = computeCAGEDWindow('C', 'C#', 'Lydian');
    assert.equal(frets, 4);
  });

  it('C C# Mixolydian → frets=4 (major 3rd mode, no extension)', () => {
    const { frets } = computeCAGEDWindow('C', 'C#', 'Mixolydian');
    assert.equal(frets, 4);
  });

  it('C C Dorian → showOpen=true, frets=4 (Eb on B-string fret 4 ∈ Dorian, extends window)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C', 'Dorian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('C C Mixolydian → showOpen=true, frets=3 (no scale note at fret 4, window stays narrow)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C', 'Mixolydian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 3);
  });

  it('C C Ionian → showOpen=true, frets=3 (B at G-string fret 4 duplicates open B string)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C', 'Ionian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 3);
  });

  it('C C Lydian → showOpen=true, frets=4 (F# on D-string fret 4 must be included)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C', 'Lydian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('C Bb Lydian → window 9–13 (extend left: G-string at fret 9 has E = #4 of Bb)', () => {
    const { winStart, frets } = computeCAGEDWindow('C', 'Bb', 'Lydian');
    assert.equal(winStart, 9);
    assert.equal(winStart + frets - 1, 13);
  });

  it('C D Lydian → window 1–5 (extend left from baseFret=3: winStart=1)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'D', 'Lydian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(winStart + frets - 1, 5);
  });

  it('A B Ionian → no open strings, frets 1–5 (B root wraps baseFret to 1 but A shape never uses open)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'B', 'Ionian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(winStart + frets - 1, 5);
  });

  it('E F Ionian → open position: showOpen=true, winStart=1, frets=3 (frets 1–3)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'F', 'Ionian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 3);
    assert.equal(winStart + frets - 1, 3);
  });

  it('E C Phrygian → canonical window 8–11 (fret 7 is empty for all Phrygian E shapes)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'C', 'Phrygian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 8);
    assert.equal(winStart + frets - 1, 11);
  });

  it('E D Phrygian → canonical window 10–13 (fret 9 empty for Phrygian)', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'D', 'Phrygian');
    assert.equal(winStart, 10);
    assert.equal(winStart + frets - 1, 13);
  });

  it('E C Dorian → canonical window 7–11 still holds (fret 7 has 2 notes for Dorian)', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'C', 'Dorian');
    assert.equal(winStart, 7);
    assert.equal(winStart + frets - 1, 11);
  });

  it('E C Lydian → window 7–10, 4 frets (only 1 note at fret 11 — F# on G string alone)', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'C', 'Lydian');
    assert.equal(winStart, 7);
    assert.equal(winStart + frets - 1, 10);
  });

  it('E C Mixolydian → window 7–11 (b7=Bb on B-string fret 11 warrants extension)', () => {
    const { winStart, frets } = computeCAGEDWindow('E', 'C', 'Mixolydian');
    assert.equal(winStart, 7);
    assert.equal(winStart + frets - 1, 11);
  });

  it('E F Dorian → open position: frets=4 (Ab/Eb at fret 4 are in scale, 3 notes at fret 4)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'F', 'Dorian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('E F Lydian → open position: frets=3, showOpen=true (fret-4 B on G string duplicates open B string)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'F', 'Lydian');
    assert.ok(showOpen);
    assert.equal(winStart, 1);
    assert.equal(frets, 3);
  });

  it('D C Dorian → window 10–13 (fret 9 is empty for all Dorian D shapes, no extension)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'C', 'Dorian');
    assert.equal(winStart, 10);
    assert.equal(winStart + frets - 1, 13);
  });

  it('D D Dorian → window 12–15 (fret 11 completely empty for Dorian)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'D', 'Dorian');
    assert.equal(winStart, 12);
    assert.equal(winStart + frets - 1, 15);
  });

  it('D C Ionian → canonical window 9–13 still holds (G-string at fret 9 has E = major 3rd)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'C', 'Ionian');
    assert.equal(winStart, 9);
    assert.equal(winStart + frets - 1, 13);
  });

  it('D C Mixolydian → window 9–13 (extend down: G-string at fret 9 has E = major 3rd)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'C', 'Mixolydian');
    assert.equal(winStart, 9);
    assert.equal(winStart + frets - 1, 13);
  });

  it('D C Phrygian → window 10–14 (no extension down, B-string at fret 14 has Db = b2)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'C', 'Phrygian');
    assert.equal(winStart, 10);
    assert.equal(winStart + frets - 1, 14);
  });

  it('D D Phrygian → window 12–16 (no extension down, B-string at fret 16 has Eb = b2)', () => {
    const { winStart, frets } = computeCAGEDWindow('D', 'D', 'Phrygian');
    assert.equal(winStart, 12);
    assert.equal(winStart + frets - 1, 16);
  });

  it('D D# Phrygian → window 1–5, showOpen=false (baseFret=1 must not force open-string mode)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('D', 'D#', 'Phrygian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(winStart + frets - 1, 5);
  });

  it('D D# Locrian → window 1–5, showOpen=false (baseFret=1 extend-up same as Phrygian)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('D', 'D#', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(winStart + frets - 1, 5);
  });

  it('G G# Dorian → showOpen=false, winStart=1, frets=4 (open G string not in scale, no empty fret 5)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('G', 'G#', 'Dorian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('G C Phrygian → canonical window 5–9 (fret 9 has D♭/A♭ on e/B/E strings, 3 notes)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Phrygian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 9);
  });

  it('G C Locrian → canonical window 5–9 (fret 9 has D♭/G♭/A♭ on e/A/B/E strings, 4 notes)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Locrian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 9);
  });

  it('G C Mixolydian → 5–8 (fret 9 has only 1 note, no extension)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Mixolydian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 8);
  });

  it('G C Dorian → canonical window 5–8 (fret 4 only has D♭ on B-string, not needed)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Dorian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 8);
  });

  it('G C Mixolydian → canonical window 5–8 (no major 7th, G-string at fret 4 not in scale)', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Mixolydian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 8);
  });

  it('G C Aeolian → canonical window 5–8', () => {
    const { winStart, frets } = computeCAGEDWindow('G', 'C', 'Aeolian');
    assert.equal(winStart, 5);
    assert.equal(winStart + frets - 1, 8);
  });

  it('E C Locrian → winStart=8, frets=4 (fret 7 has dim5 only on B-string, skip it)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'C', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 8);
    assert.equal(frets, 4);
  });

  it('E F Locrian → winStart=1, frets=4, showOpen=false (open B duplicates G-string fret 4)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('E', 'F', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('A C Locrian → winStart=3, frets=5 (skip baseFret=2, extend to fret 7 for dim5 on B string)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'C', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 3);
    assert.equal(frets, 5);
  });

  it('A D Locrian → winStart=5, frets=5 (baseFret=4, window 5–9 ends with dim5 Ab on B string)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'D', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 5);
    assert.equal(frets, 5);
  });

  it('C C# Locrian → winStart=2, frets=4 (fret 1 empty for all non-C Locrian C-shapes)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'C#', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 2);
    assert.equal(frets, 4);
  });

  it('C D Locrian → winStart=3, frets=4 (fret 2 empty for D Locrian C-shape)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('C', 'D', 'Locrian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 3);
    assert.equal(frets, 4);
  });

  it('D D# Aeolian → winStart=1, frets=4, showOpen=false (open B duplicates fretted B; no open notes warranted)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('D', 'D#', 'Aeolian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 1);
    assert.equal(frets, 4);
  });

  it('A B Aeolian → winStart=2, frets=4 (fret 1 completely empty for B Aeolian A-shape)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'B', 'Aeolian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 2);
    assert.equal(frets, 4);
  });

  it('A B Phrygian → winStart=2, frets=4 (isolated b2 C on B-string at fret 1 skipped)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'B', 'Phrygian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 2);
    assert.equal(frets, 4);
  });

  it('A C Phrygian → winStart=3, frets=4 (isolated b2 Db on B-string at fret 2 skipped)', () => {
    const { winStart, frets, showOpen } = computeCAGEDWindow('A', 'C', 'Phrygian');
    assert.equal(showOpen, false);
    assert.equal(winStart, 3);
    assert.equal(frets, 4);
  });
});
