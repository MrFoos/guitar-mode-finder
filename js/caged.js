// caged.js — CAGED shape data and SVG fretboard renderer

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    const Theory = require('./theory.js');
    module.exports = factory(Theory);
  } else {
    root.CAGED = factory(root.Theory);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Theory) {

  // Standard tuning: open note semitone index for each string (1=high e, 6=low E)
  const OPEN_STRING_NOTES = [4, 11, 7, 2, 9, 4]; // e B G D A E

  // Starting fret for each CAGED shape's display window in C major.
  // Root C appears within the window at the offset noted.
  // Transposition: add semitone distance from C, wrap at 12.
  const CAGED_BASE_FRETS = {
    C: { fret: 1  },   // window 1-5;  root C on str2 fret1 (offset 0), str5 fret3 (offset 2)
    A: { fret: 2  },   // window 2-6;  root C on str5 fret3 (offset 1), str3 fret5 (offset 3)
    G: { fret: 5  },   // window 5-9;  root C on str3 fret5 (offset 0), str6/str1 fret8 (offset 3)
    E: { fret: 8  },   // window 8-12; root C on str6 fret8 (offset 0), str4 fret10 (offset 2), str1 fret8 (offset 0)
    D: { fret: 10 },   // window 10-14;root C on str4 fret10 (offset 0), str2 fret13 (offset 3)
  };

  const CAGED_ORDER = ['C', 'A', 'G', 'E', 'D'];

  // All possible dot positions per shape (string 1-6, fret offset 0-4 from base fret).
  // The dynamic note filter in renderFretboardSVG shows only notes that belong to the mode.
  // This approach lets the CAGED shape emerge naturally from which notes are in the scale.
  const ALL_OFFSETS = (function () {
    const positions = [];
    for (let str = 1; str <= 6; str++) {
      for (let off = 0; off <= 4; off++) {
        positions.push([str, off]);
      }
    }
    return positions;
  })();

  // Per-shape overrides: some shapes traditionally omit certain strings.
  // E.g., C-shape and D-shape typically skip the low E string (too low/high).
  // We keep all strings for completeness — muted string conventions vary.
  const SHAPE_DOTS = {
    C: ALL_OFFSETS,
    A: ALL_OFFSETS,
    G: ALL_OFFSETS,
    E: ALL_OFFSETS,
    D: ALL_OFFSETS,
  };

  // Compute the actual starting fret for a given CAGED shape in a given key.
  function getShapeFret(shape, rootNote) {
    const base = CAGED_BASE_FRETS[shape].fret;
    const semitoneDistance = (Theory.noteIndex(rootNote) - Theory.noteIndex('C') + 12) % 12;
    let fret = base + semitoneDistance;
    if (fret > 12) fret -= 12;
    return fret;
  }

  // ── SVG dimensions ─────────────────────────────────────────────────────────
  const SVG_W = 280;
  const SVG_H = 180;
  const MARGIN_LEFT = 28;  // space for string labels
  const MARGIN_TOP = 38;   // space for shape label + fret number
  const MARGIN_RIGHT = 10;
  const MARGIN_BOTTOM = 12;
  const FRET_COUNT = 5;
  const STRING_COUNT = 6;

  const FRET_W = (SVG_W - MARGIN_LEFT - MARGIN_RIGHT) / FRET_COUNT;
  const STRING_H = (SVG_H - MARGIN_TOP - MARGIN_BOTTOM) / (STRING_COUNT - 1);

  // String labels: index 0 = string 1 (high e), index 5 = string 6 (low E)
  const STRING_LABELS = ['E', 'B', 'G', 'D', 'A', 'E'];

  function stringY(stringNum) {
    // stringNum 1 (high e) → top; stringNum 6 (low E) → bottom
    return MARGIN_TOP + (stringNum - 1) * STRING_H;
  }

  function fretX(fretOffset) {
    // Dot sits in the middle of each fret slot (between two fret lines)
    return MARGIN_LEFT + (fretOffset + 0.5) * FRET_W;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderFretboardSVG(shape, rootNote, modeNotes, pentaNotes) {
    const baseFret = getShapeFret(shape, rootNote);
    const rootIdx = Theory.noteIndex(rootNote);
    const noteSet = new Set(modeNotes.map(n => Theory.noteIndex(n)));
    const pentaSet = new Set(pentaNotes.map(n => Theory.noteIndex(n)));

    const dots = SHAPE_DOTS[shape];

    const parts = [];

    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" ` +
      `width="${SVG_W}" height="${SVG_H}" class="fretboard-svg" ` +
      `role="img" aria-label="${rootNote} ${shape}-shape CAGED fretboard diagram">`
    );

    // Background
    parts.push(`<rect width="${SVG_W}" height="${SVG_H}" fill="#111117" rx="8"/>`);
    // Subtle inner border
    parts.push(`<rect x="0.5" y="0.5" width="${SVG_W - 1}" height="${SVG_H - 1}" fill="none" stroke="#242432" stroke-width="1" rx="7.5"/>`);

    // Shape label
    parts.push(
      `<text x="${MARGIN_LEFT}" y="14" font-family="system-ui,sans-serif" font-size="10" ` +
      `fill="#7c3aed" font-weight="700" letter-spacing="1">${shape}</text>`
    );
    parts.push(
      `<text x="${MARGIN_LEFT + 18}" y="14" font-family="system-ui,sans-serif" font-size="10" ` +
      `fill="#5a5a78" font-weight="400"> shape</text>`
    );

    // Fret number indicator
    parts.push(
      `<text x="${SVG_W - MARGIN_RIGHT}" y="14" font-family="system-ui,sans-serif" font-size="10" ` +
      `fill="#5a5a78" text-anchor="end">fr ${baseFret}</text>`
    );

    // Strings (horizontal lines), thicker toward low E
    for (let s = 1; s <= STRING_COUNT; s++) {
      const y = stringY(s);
      const sw = (0.5 + (s - 1) * 0.22).toFixed(2);
      parts.push(
        `<line x1="${MARGIN_LEFT}" y1="${y}" x2="${SVG_W - MARGIN_RIGHT}" y2="${y}" ` +
        `stroke="#2e2e42" stroke-width="${sw}"/>`
      );
    }

    // Fret lines (vertical), thicker nut
    for (let f = 0; f <= FRET_COUNT; f++) {
      const x = MARGIN_LEFT + f * FRET_W;
      const sw = f === 0 ? 2 : 0.7;
      const col = f === 0 ? '#5a5a78' : '#1e1e2e';
      parts.push(
        `<line x1="${x}" y1="${MARGIN_TOP}" x2="${x}" y2="${SVG_H - MARGIN_BOTTOM}" ` +
        `stroke="${col}" stroke-width="${sw}"/>`
      );
    }

    // String labels (left side)
    for (let s = 1; s <= STRING_COUNT; s++) {
      const y = stringY(s);
      parts.push(
        `<text x="${MARGIN_LEFT - 7}" y="${y + 4}" font-family="monospace" ` +
        `font-size="9" fill="#42425a" text-anchor="middle">${STRING_LABELS[s - 1]}</text>`
      );
    }

    // Note dots
    for (const [str, fretOff] of dots) {
      const absoluteFret = baseFret + fretOff;
      if (absoluteFret < 1) continue;

      // Compute which pitch class is at this position
      const dotNoteIdx = (OPEN_STRING_NOTES[str - 1] + absoluteFret) % 12;

      const isRoot = dotNoteIdx === rootIdx;
      const inMode = noteSet.has(dotNoteIdx);
      const inPenta = pentaSet.has(dotNoteIdx);

      if (!inMode && !isRoot) continue;

      const cx = fretX(fretOff);
      const cy = stringY(str);
      const r = 7;

      if (isRoot) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#b91c1c" stroke="#ef4444" stroke-width="1.5"/>`
        );
        const label = rootNote;
        const fs = label.length > 1 ? '6' : '7.5';
        parts.push(
          `<text x="${cx}" y="${cy + 4}" font-family="system-ui,sans-serif" font-size="${fs}" ` +
          `fill="white" text-anchor="middle" font-weight="700">${label}</text>`
        );
      } else if (inPenta) {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0d2a18" stroke="#4ade80" stroke-width="1.2"/>`
        );
      } else {
        parts.push(
          `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1c1c28" stroke="#3a3a58" stroke-width="0.8"/>`
        );
      }
    }

    parts.push('</svg>');
    return parts.join('\n');
  }

  // ── Full fretboard diagram (frets 1–12, all 6 strings) ────────────────────

  const FB_W = 1050;
  const FB_H = 310;
  const FB_ML = 60;  // wider left margin: room for open string dots
  const FB_MR = 8;
  const FB_MT = 28;
  const FB_MB = 54;  // more bottom: fret numbers clear of dots
  const FB_FRET_COUNT = 14;
  const FB_FW = (FB_W - FB_ML - FB_MR) / FB_FRET_COUNT; // ~70.7
  const FB_SH = (FB_H - FB_MT - FB_MB) / (STRING_COUNT - 1); // 34.4
  const FB_OPEN_X = 30;   // cx of open-string dots (between label and nut)
  const FB_LABEL_X = 8;   // string name text

  function fbStringY(s) { return FB_MT + s * FB_SH; }
  function fbDotX(f) { return FB_ML + (f - 0.5) * FB_FW; }

  function renderFullFretboardSVG(rootNote, modeNotes, pentaNotes) {
    const rootIdx = Theory.noteIndex(rootNote);
    const noteNameMap = new Map();
    modeNotes.forEach(name => noteNameMap.set(Theory.noteIndex(name), name));
    const pentaSet = new Set(pentaNotes.map(n => Theory.noteIndex(n)));

    const parts = [];

    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${FB_W} ${FB_H}" ` +
      `class="fretboard-full-svg" role="img" ` +
      `aria-label="${rootNote} scale fretboard diagram">`
    );

    parts.push(`<rect width="${FB_W}" height="${FB_H}" fill="#252545" rx="8"/>`);
    parts.push(`<rect x="0.5" y="0.5" width="${FB_W - 1}" height="${FB_H - 1}" fill="none" stroke="#3e3e62" stroke-width="1" rx="7.5"/>`);

    // Strings (draw before inlays so inlays sit on top of strings)
    for (let s = 0; s < STRING_COUNT; s++) {
      const y = fbStringY(s).toFixed(1);
      const sw = (0.6 + s * 0.22).toFixed(2);
      parts.push(`<line x1="${FB_ML}" y1="${y}" x2="${FB_W - FB_MR}" y2="${y}" stroke="#3c3c58" stroke-width="${sw}"/>`);
    }

    // Nut
    const nutTop = fbStringY(0).toFixed(1);
    const nutBot = fbStringY(5).toFixed(1);
    parts.push(`<line x1="${FB_ML}" y1="${nutTop}" x2="${FB_ML}" y2="${nutBot}" stroke="#7070a0" stroke-width="3"/>`);

    // Fret lines
    for (let f = 1; f <= FB_FRET_COUNT; f++) {
      const x = (FB_ML + f * FB_FW).toFixed(1);
      parts.push(`<line x1="${x}" y1="${nutTop}" x2="${x}" y2="${nutBot}" stroke="#32324e" stroke-width="1"/>`);
    }

    // Inlays inside fretboard (drawn before note dots)
    const inlayCenterY = (fbStringY(0) + fbStringY(5)) / 2; // midpoint of neck
    const inlayTopY = fbStringY(1) + FB_SH / 2;            // between B and G
    const inlayBotY = fbStringY(3) + FB_SH / 2;            // between D and A
    for (const mf of [3, 5, 7, 9]) {
      parts.push(`<circle cx="${fbDotX(mf).toFixed(1)}" cy="${inlayCenterY.toFixed(1)}" r="5" fill="#3a3a5c" opacity="0.9"/>`);
    }
    // Double inlay at 12
    const d12x = fbDotX(12);
    parts.push(`<circle cx="${d12x.toFixed(1)}" cy="${inlayTopY.toFixed(1)}" r="5" fill="#3a3a5c" opacity="0.9"/>`);
    parts.push(`<circle cx="${d12x.toFixed(1)}" cy="${inlayBotY.toFixed(1)}" r="5" fill="#3a3a5c" opacity="0.9"/>`);

    // Fret numbers below (all 1–12)
    const numY = fbStringY(5) + 24;
    for (let fn = 1; fn <= FB_FRET_COUNT; fn++) {
      parts.push(
        `<text x="${fbDotX(fn).toFixed(1)}" y="${numY.toFixed(1)}" ` +
        `font-family="system-ui,sans-serif" font-size="10" fill="#a8a8d0" text-anchor="middle" dominant-baseline="central" font-weight="600">${fn}</text>`
      );
    }

    // Open string column: dot if in mode, dim string name if not
    for (let s = 0; s < STRING_COUNT; s++) {
      const openIdx = OPEN_STRING_NOTES[s] % 12;
      const cy = fbStringY(s).toFixed(1);
      const cx = FB_OPEN_X;
      const r = 10;
      if (noteNameMap.has(openIdx)) {
        const noteName = noteNameMap.get(openIdx);
        const isRoot = openIdx === rootIdx;
        const inPenta = pentaSet.has(openIdx);
        const fs = noteName.length > 1 ? 8 : 9;
        if (isRoot) {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#b91c1c" stroke="#ef4444" stroke-width="1.5"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        } else if (inPenta) {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#22c55e" stroke="#16a34a" stroke-width="1.5"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        } else {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#9090c0" stroke-width="1.2"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="#111128" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        }
      } else {
        // Not in mode: show string name as dim placeholder
        parts.push(
          `<text x="${cx}" y="${cy}" font-family="monospace" font-size="10" ` +
          `fill="#a8a8d0" text-anchor="middle" dominant-baseline="central">${STRING_LABELS[s]}</text>`
        );
      }
    }

    // Note dots
    for (let f = 1; f <= FB_FRET_COUNT; f++) {
      for (let s = 0; s < STRING_COUNT; s++) {
        const noteIdx = (OPEN_STRING_NOTES[s] + f) % 12;
        if (!noteNameMap.has(noteIdx)) continue;

        const noteName = noteNameMap.get(noteIdx);
        const isRoot = noteIdx === rootIdx;
        const inPenta = pentaSet.has(noteIdx);
        const cx = fbDotX(f).toFixed(1);
        const cy = fbStringY(s).toFixed(1);
        const r = 16;
        const fs = noteName.length > 1 ? 13 : 15;

        if (isRoot) {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#b91c1c" stroke="#ef4444" stroke-width="1.5"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        } else if (inPenta) {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#22c55e" stroke="#16a34a" stroke-width="1.5"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="white" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        } else {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#9090c0" stroke-width="1.2"/>`);
          parts.push(`<text x="${cx}" y="${cy}" font-family="system-ui,sans-serif" font-size="${fs}" fill="#111128" text-anchor="middle" dominant-baseline="central" font-weight="700">${noteName}</text>`);
        }
      }
    }

    parts.push('</svg>');
    return parts.join('\n');
  }

  return {
    CAGED_ORDER,
    CAGED_BASE_FRETS,
    SHAPE_DOTS,
    getShapeFret,
    renderFretboardSVG,
    renderFullFretboardSVG,
  };
});
