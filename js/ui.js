(function () {
  'use strict';

  /* ── Only run full app on the home page ─────────────────────────────────── */
  const isHome = !!document.getElementById('mod-lookup');

  /* ── Theme ───────────────────────────────────────────────────────────────── */

  const DARK = {
    isDark: true,
    fbTop: '#110800', fbBot: '#1a0d00',
    nut: '#c8b888', fretEdge: '#8a8070', fretShine: '#d4c8b0',
    inlay: '#e8d8a8', inlayEdge: '#6a5530',
    string: '#c8b888', fbLabel: '#86848c',
    rootFill: '#ff3b3b', rootStroke: '#8a1f0d', rootText: '#fff',
    rootGlow: '#ff5530', rootHi: '#ffe8b0',
    pentaFill: '#ffaa3b', pentaStroke: '#8a5a20', pentaText: '#1a0d00',
    scaleFill: '#3a3a40', scaleStroke: '#5a5a60', scaleText: '#e8e6e0',
  };

  const LIGHT = {
    isDark: false,
    fbTop: '#110800', fbBot: '#1a0d00',
    nut: '#f0e0c0', fretEdge: '#c8c0b0', fretShine: '#fff5d8',
    inlay: '#f4e8c8', inlayEdge: '#a08560',
    string: '#e8d4a0', fbLabel: '#d4b888',
    rootFill: '#cc2020', rootStroke: '#881010', rootText: '#ffffff',
    rootGlow: '#ff4020', rootHi: '#ffd0a0',
    pentaFill: '#e8a818', pentaStroke: '#8a5c08', pentaText: '#1a0800',
    scaleFill: '#f0e8d0', scaleStroke: '#5a4830', scaleText: '#1a1208',
  };

  let themeKey = 'night';

  function currentTheme() { return themeKey === 'night' ? DARK : LIGHT; }

  function applyTheme(key) {
    themeKey = key;
    document.documentElement.setAttribute('data-theme', key === 'day' ? 'day' : 'night');
    localStorage.setItem('gmf_theme', key);
    updateToggleLabels();
    if (isHome && initialized) render();
  }

  function updateToggleLabels() {
    const lDay = document.getElementById('labelDay');
    const lNight = document.getElementById('labelNight');
    if (!lDay) return;
    if (themeKey === 'day') {
      lDay.classList.add('active');
      lNight.classList.remove('active');
    } else {
      lNight.classList.add('active');
      lDay.classList.remove('active');
    }
  }

  /* ── State ───────────────────────────────────────────────────────────────── */

  let state = { root: 'C', mode: 'Ionian', cagedMode: false, cagedShape: 'C' };
  let initialized = false;

  /* ── Mode metadata ───────────────────────────────────────────────────────── */

  const MODE_DEGREE = {
    Ionian: 'I', Dorian: 'II', Phrygian: 'III',
    Lydian: 'IV', Mixolydian: 'V', Aeolian: 'VI', Locrian: 'VII',
  };

  const CHAR_INTERVAL_IDX = {
    Ionian: 6, Dorian: 5, Phrygian: 1, Lydian: 3,
    Mixolydian: 6, Aeolian: 5, Locrian: 4,
  };

  const MODE_USE_OVER = {
    Ionian:     'maj7 chords',
    Dorian:     'm7 chords',
    Phrygian:   'm7 chords',
    Lydian:     'maj7 chords',
    Mixolydian: 'dom7 chords',
    Aeolian:    'm7 chords',
    Locrian:    'm7♭5 chords',
  };

  const MODE_COMPARE = {
    Ionian:     'Like Mixolydian but with a major 7th instead of ♭7',
    Dorian:     'Like Aeolian but with a raised 6th',
    Phrygian:   'Like Aeolian but with a ♭2',
    Lydian:     'Like Ionian but with a ♯4',
    Mixolydian: 'Like Ionian but with a ♭7',
    Aeolian:    'Like Dorian but with a ♭6',
    Locrian:    'Like Phrygian but with a ♭5',
  };

  const MODE_TIP = {
    Ionian:     'Emphasise the maj7 over the I chord — it\'s the brightest colour tone',
    Dorian:     'Linger on the 6th — that\'s what separates Dorian from natural minor',
    Phrygian:   'The ♭II → I cadence is the defining Phrygian move',
    Lydian:     'Let the ♯4 resolve up to 5 to bring out the floating Lydian feel',
    Mixolydian: 'Target the ♭7 over the I chord — it\'s the signature Mixolydian colour',
    Aeolian:    'i → ♭VI → ♭VII captures the Aeolian mood perfectly',
    Locrian:    'Works best as colour over m7♭5 chords, not as a tonal centre',
  };

  const MODE_USES = {
    Ionian:     'Pop, folk, classical',
    Dorian:     'Jazz, funk, blues-rock',
    Phrygian:   'Metal, flamenco, film scores',
    Lydian:     'Film music, jazz, progressive rock',
    Mixolydian: 'Blues, rock, country, funk',
    Aeolian:    'Rock, pop, classical, metal',
    Locrian:    'Metal, jazz — used sparingly',
  };

  function disp(n) {
    return n
      .replace('#', '♯')
      .replace(/([A-G])b/g, '$1♭')  // note flats: Db → D♭
      .replace('b5', '♭5');          // chord quality: m7b5 → m7♭5
  }

  /* ── Knob ────────────────────────────────────────────────────────────────── */

  function renderKnob(container, options, value, label, onChange) {
    const idx = options.findIndex(o => (o.value || o) === value);
    const angle = -135 + (idx / Math.max(options.length - 1, 1)) * 270;

    const ticks = Array.from({ length: 11 }, (_, i) => {
      const a = (-135 + (i / 10) * 270) * Math.PI / 180;
      const x1 = 50 + 38 * Math.cos(a), y1 = 50 + 38 * Math.sin(a);
      const x2 = 50 + 44 * Math.cos(a), y2 = 50 + 44 * Math.sin(a);
      const on = i <= idx * 10 / Math.max(options.length - 1, 1);
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${on ? '#ffaa3b' : 'var(--knob-tick)'}" stroke-width="1.8"/>`;
    }).join('');

    const opts = options.map(o => {
      const v = o.value || o;
      const l = o.label || o;
      return `<option value="${v}"${v === value ? ' selected' : ''}>${l}</option>`;
    }).join('');

    container.innerHTML = `
      <div class="knob-label">${label}</div>
      <select class="knob-select">${opts}</select>`;

    container.querySelector('select').addEventListener('change', e => onChange(e.target.value));
  }

  /* ── VU Meter ────────────────────────────────────────────────────────────── */

  function renderVU(el) {
    const widths = [80, 60, 40, 70, 90, 50, 30];
    el.innerHTML = widths.map((w, i) => {
      const col = i === 0 ? 'var(--led-red)' : i <= 2 ? 'var(--led)' : 'var(--led-green)';
      return `<div class="vu-bar-track"><div class="vu-bar-fill" style="width:${w}%;background:${col};box-shadow:0 0 4px ${col}"></div></div>`;
    }).join('');
  }

  /* ── LED Display ─────────────────────────────────────────────────────────── */

  function renderLED() {
    const { root, mode } = state;
    const notes = Theory.getModeNotes(root, mode);
    const parent = Theory.getParentRoot(root, mode);
    document.getElementById('led-name').textContent = `${disp(root)} ${mode.toUpperCase()}`;
    document.getElementById('led-parent-key').textContent = `PARENT: ${disp(parent)} MAJOR`;
    document.getElementById('led-parent-notes').textContent = notes.map(disp).join(' · ');
  }

  /* ── Fretboard SVG ───────────────────────────────────────────────────────── */

  /* ── Correct diatonic 7th chords (theory.js uses Ionian quality for all modes) */
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
    const romans = ['I','II','III','IV','V','VI','VII'];
    return notes.map((note, i) => ({ root: note, quality: q[i], name: note + q[i], degree: i + 1, roman: romans[i] }));
  }

  const SEMITONES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const TUNING = ['E', 'B', 'G', 'D', 'A', 'E'];
  const PENTA_IDX = {
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

  function buildFretboardSVG(root, mode) {
    const t = currentTheme();
    const scale = Theory.getModeNotes(root, mode);
    const normalizedScale = scale.map(n => SEMITONES[Theory.noteIndex(n)]);
    const noteSet = new Set(normalizedScale);
    const displayNote = {};
    normalizedScale.forEach((norm, i) => { displayNote[norm] = scale[i]; });
    const W = 1400, H = 360;
    const padL = 70, padR = 24, padT = 28, padB = 60;
    const frets = 15;
    const inner = W - padL - padR;
    const fretW = inner / frets;
    const rowH = (H - padT - padB) / 5;
    const inlays = [3, 5, 7, 9, 15, 17].filter(f => f <= frets);
    const dbl = [12, 24].filter(f => f <= frets);

    const p = [];
    p.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`);
    p.push(`<defs>
      <linearGradient id="fb-grad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${t.fbTop}"/>
        <stop offset="1" stop-color="${t.fbBot}"/>
      </linearGradient>
      <radialGradient id="root-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${t.rootGlow}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${t.rootGlow}" stop-opacity="0"/>
      </radialGradient>
    </defs>`);

    p.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#fb-grad)" rx="4"/>`);
    p.push(`<rect x="${padL - 8}" y="${padT - 6}" width="10" height="${H - padT - padB + 12}" fill="${t.nut}" rx="2"/>`);

    for (let f = 0; f < frets; f++) {
      const x = padL + (f + 1) * fretW;
      p.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${padT - 4}" y2="${H - padB + 4}" stroke="${t.fretEdge}" stroke-width="3"/>`);
      p.push(`<line x1="${(x-0.6).toFixed(1)}" x2="${(x-0.6).toFixed(1)}" y1="${padT - 4}" y2="${H - padB + 4}" stroke="${t.fretShine}" stroke-width="1"/>`);
    }

    inlays.forEach(f => {
      const cx = (padL + (f - 0.5) * fretW).toFixed(1);
      const cy = (padT + 2.5 * rowH).toFixed(1);
      p.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
    });

    dbl.forEach(f => {
      const cx = (padL + (f - 0.5) * fretW).toFixed(1);
      p.push(`<circle cx="${cx}" cy="${(padT + 1.5 * rowH).toFixed(1)}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
      p.push(`<circle cx="${cx}" cy="${(padT + 3.5 * rowH).toFixed(1)}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
    });

    TUNING.forEach((s, i) => {
      const y = (padT + i * rowH).toFixed(1);
      p.push(`<line x1="${padL - 12}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${t.string}" stroke-width="${(0.7 + i * 0.28).toFixed(2)}"/>`);
      p.push(`<text x="${padL - 26}" y="${(padT + i * rowH + 4).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="600">${s}</text>`);
    });

    for (let f = 0; f < frets; f++) {
      const x = (padL + (f + 0.5) * fretW).toFixed(1);
      p.push(`<text x="${x}" y="${(H - padB + 50).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="14" fill="#ffffff" text-anchor="middle">${f + 1}</text>`);
    }

    TUNING.forEach((open, si) => {
      for (let f = 0; f <= frets; f++) {
        const n = noteAt(open, f);
        if (!noteSet.has(n)) continue;
        const idx = normalizedScale.indexOf(n);
        const isRoot = idx === 0;
        const ip = inPenta(mode, idx);
        const cx = (f === 0 ? padL - 36 : padL + (f - 0.5) * fretW).toFixed(1);
        const cy = (padT + si * rowH).toFixed(1);
        const r = 16;
        const fill   = isRoot ? t.rootFill   : ip ? t.pentaFill   : t.scaleFill;
        const stroke = isRoot ? t.rootStroke : ip ? t.pentaStroke : t.scaleStroke;
        const txt    = isRoot ? t.rootText   : ip ? t.pentaText   : t.scaleText;

        if (isRoot) p.push(`<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="url(#root-glow)"/>`);
        p.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
        const textFill = f === 0 ? (t.isDark ? '#ffffff' : txt) : txt;
        const label = displayNote[n] || n;
        p.push(`<text x="${cx}" y="${(parseFloat(cy) + 5).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="${f === 0 ? '14' : '13'}" font-weight="700" fill="${textFill}" text-anchor="middle">${disp(label)}</text>`);
      }
    });

    p.push('</svg>');
    return p.join('');
  }

  // Per-shape, per-mode window offsets (relative to baseFret) and fret counts.
  // Modes: Ionian Dorian Phrygian Lydian Mixolydian Aeolian Locrian
  const CAGED_MODES = ['Ionian','Dorian','Phrygian','Lydian','Mixolydian','Aeolian','Locrian'];
  const CAGED_WIN = {
    //       Io   Do   Ph   Ly   Mi   Ae   Lo
    A: { off: [ 0,   0,   1,   0,   0,   1,   1 ],
        fret: [ 5,   5,   5,   4,   5,   4,   5 ] },
    G: { off: [-1,   0,   0,   2,   0,   0,   0 ],
        fret: [ 5,   4,   5,   4,   4,   5,   5 ] },
    E: { off: [-1,  -1,   0,  -1,  -3,  -1,   0 ],
        fret: [ 4,   5,   4,   4,   4,   5,   4 ] },
    D: { off: [-1,   0,  -1,  -1,  -1,   0,   0 ],
        fret: [ 5,   4,   5,   5,   5,   4,   5 ] },
  };

  function buildCAGEDShapeSVG(shape, root, mode) {
    const t = currentTheme();
    const scale = Theory.getModeNotes(root, mode);
    const normalizedScale = scale.map(n => SEMITONES[Theory.noteIndex(n)]);
    const noteSet = new Set(normalizedScale);
    const displayNote = {};
    normalizedScale.forEach((norm, i) => { displayNote[norm] = scale[i]; });

    const baseFret = CAGED.getShapeFret(shape, root);
    const modeIdx = CAGED_MODES.indexOf(mode);
    let windowStart, frets, showOpen;
    if (shape === 'C') {
      if (baseFret === 1) {
        windowStart = 1; showOpen = true; frets = 4;
      } else {
        const prevHasNotes = TUNING.some(open => noteSet.has(noteAt(open, baseFret - 1)));
        windowStart = prevHasNotes ? baseFret - 1 : baseFret;
        frets = 4; showOpen = false;
      }
    } else {
      const win = CAGED_WIN[shape];
      windowStart = baseFret + (win.off[modeIdx] ?? win.off[0]);
      frets = win.fret[modeIdx] ?? win.fret[0];
      showOpen = false;
      if (windowStart < 1) {
        frets = frets + windowStart - 1;
        windowStart = 1;
      }
    }
    const showNut = windowStart === 1;

    const H = 360;
    const padL = showOpen ? 120 : 70;
    const padR = 24, padT = 28, padB = 60;
    const fretW = 160;
    const W = padL + frets * fretW + padR;
    const rowH = (H - padT - padB) / 5;
    const openX = padL - 52;

    const p = [];
    p.push(`<svg viewBox="0 0 ${W} ${H}" style="display:block;margin:0 auto;max-width:${W}px;width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`);
    p.push(`<defs>
    <linearGradient id="fb-grad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${t.fbTop}"/>
      <stop offset="1" stop-color="${t.fbBot}"/>
    </linearGradient>
    <radialGradient id="root-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${t.rootGlow}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${t.rootGlow}" stop-opacity="0"/>
    </radialGradient>
  </defs>`);

    p.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#fb-grad)" rx="4"/>`);

    if (showOpen) {
      p.push(`<rect x="${padL - 8}" y="${padT - 6}" width="10" height="${H - padT - padB + 12}" fill="${t.nut}" rx="2"/>`);
    }

    // Fret lines
    for (let f = 0; f <= frets; f++) {
      const x = padL + f * fretW;
      if (!showOpen || f > 0) {
        p.push(`<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${padT - 4}" y2="${H - padB + 4}" stroke="${t.fretEdge}" stroke-width="3"/>`);
        p.push(`<line x1="${(x - 0.6).toFixed(1)}" x2="${(x - 0.6).toFixed(1)}" y1="${padT - 4}" y2="${H - padB + 4}" stroke="${t.fretShine}" stroke-width="1"/>`);
      }
    }

    // Inlays
    const inlayFrets = [3, 5, 7, 9, 15, 17];
    const dblFrets = [12, 24];
    inlayFrets.forEach(af => {
      const off = af - windowStart;
      if (off >= 0 && off < frets) {
        const cx = (padL + (off + 0.5) * fretW).toFixed(1);
        const cy = (padT + 2.5 * rowH).toFixed(1);
        p.push(`<circle cx="${cx}" cy="${cy}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
      }
    });
    dblFrets.forEach(af => {
      const off = af - windowStart;
      if (off >= 0 && off < frets) {
        const cx = (padL + (off + 0.5) * fretW).toFixed(1);
        p.push(`<circle cx="${cx}" cy="${(padT + 1.5 * rowH).toFixed(1)}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
        p.push(`<circle cx="${cx}" cy="${(padT + 3.5 * rowH).toFixed(1)}" r="6" fill="${t.inlay}" stroke="${t.inlayEdge}" stroke-width="0.8"/>`);
      }
    });

    // Strings + labels
    TUNING.forEach((s, i) => {
      const y = (padT + i * rowH).toFixed(1);
      const strStart = showOpen ? openX - 18 : padL - 12;
      p.push(`<line x1="${strStart}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${t.string}" stroke-width="${(0.7 + i * 0.28).toFixed(2)}"/>`);
      if (!showOpen) {
        p.push(`<text x="${padL - 26}" y="${(padT + i * rowH + 4).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="600">${s}</text>`);
      }
    });

    // Fret numbers (absolute)
    for (let f = 0; f < frets; f++) {
      const x = (padL + (f + 0.5) * fretW).toFixed(1);
      p.push(`<text x="${x}" y="${(H - padB + 50).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="14" fill="#ffffff" text-anchor="middle">${windowStart + f}</text>`);
    }

    function drawDot(cx, cy, n, idx) {
      const isRoot = idx === 0;
      const ip = inPenta(mode, idx);
      const r = 16;
      const fill   = isRoot ? t.rootFill   : ip ? t.pentaFill   : t.scaleFill;
      const stroke = isRoot ? t.rootStroke : ip ? t.pentaStroke : t.scaleStroke;
      const txt    = isRoot ? t.rootText   : ip ? t.pentaText   : t.scaleText;
      const label  = displayNote[n] || n;
      if (isRoot) p.push(`<circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="url(#root-glow)"/>`);
      p.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`);
      p.push(`<text x="${cx}" y="${(parseFloat(cy) + 5).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="13" font-weight="700" fill="${txt}" text-anchor="middle">${disp(label)}</text>`);
    }

    // Open string dots
    if (showOpen) {
      TUNING.forEach((open, si) => {
        const n = noteAt(open, 0);
        if (!noteSet.has(n)) return;
        const idx = normalizedScale.indexOf(n);
        drawDot(openX.toFixed(1), (padT + si * rowH).toFixed(1), n, idx);
      });
    }

    // Fretted note dots
    TUNING.forEach((open, si) => {
      for (let off = 0; off < frets; off++) {
        const n = noteAt(open, windowStart + off);
        if (!noteSet.has(n)) continue;
        const idx = normalizedScale.indexOf(n);
        const cx = (padL + (off + 0.5) * fretW).toFixed(1);
        const cy = (padT + si * rowH).toFixed(1);
        drawDot(cx, cy, n, idx);
      }
    });

    p.push('</svg>');
    return p.join('');
  }

  function renderFretboard() {
    const t = currentTheme();
    const svg = state.cagedMode
      ? buildCAGEDShapeSVG(state.cagedShape, state.root, state.mode)
      : buildFretboardSVG(state.root, state.mode);
    document.getElementById('fretboard-wrap').innerHTML = svg;

    const shapeNav = document.getElementById('caged-shape-nav');
    if (shapeNav) {
      shapeNav.style.display = state.cagedMode ? 'flex' : 'none';
      shapeNav.querySelectorAll('.caged-shape-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shape === state.cagedShape);
      });
    }

    const legend = document.getElementById('fretboard-legend');
    legend.innerHTML = [
      { fill: t.rootFill,  stroke: t.rootStroke,  label: 'ROOT' },
      { fill: t.pentaFill, stroke: t.pentaStroke, label: 'PENTATONIC' },
      { fill: t.scaleFill, stroke: t.scaleStroke, label: 'SCALE TONE' },
    ].map(L =>
      `<span class="legend-item">
        <span class="legend-swatch" style="background:${L.fill};border:1.5px solid ${L.stroke}"></span>
        <span class="legend-label">${L.label}</span>
      </span>`
    ).join('');
  }

  /* ── Scale Strip ─────────────────────────────────────────────────────────── */

  function renderScaleStrip() {
    const { root, mode } = state;
    const notes = Theory.getModeNotes(root, mode);
    const penta = Theory.getPentatonicNotes(root, mode);
    const pentaSet = new Set(penta);
    const intervals = Theory.MODE_INTERVAL_FORMULA[mode].split(' ');

    document.getElementById('scale-strip').innerHTML = notes.map((n, i) => {
      const isRoot = i === 0;
      const ip = !isRoot && pentaSet.has(n);
      const cls = isRoot ? 'is-root' : ip ? 'is-penta' : 'is-scale';
      const tag = isRoot ? '<div class="scale-cell-tag">★ ROOT</div>' :
                  ip     ? '<div class="scale-cell-tag">◆ PENTA</div>' : '';
      return `<div class="scale-cell ${cls}">
        <div class="scale-cell-interval">${intervals[i]}</div>
        <div class="scale-cell-note">${disp(n)}</div>
        ${tag}
      </div>`;
    }).join('');
  }

  /* ── Chord Pad ───────────────────────────────────────────────────────────── */

  const VAMP_DEGREES = {
    Ionian:     [0, 3, 4],  // I → IV → V
    Dorian:     [0, 3],     // i → IV
    Phrygian:   [0, 1],     // i → ♭II
    Lydian:     [0, 1],     // I → II
    Mixolydian: [0, 6],     // I → ♭VII
    Aeolian:    [0, 5, 6],  // i → ♭VI → ♭VII
    Locrian:    [0, 1, 2],  // i → ♭II → ♭III
  };

  function renderChordPad() {
    const { root, mode } = state;
    const chords = getDiatonicChords(root, mode);
    const romans = ['I','II','III','IV','V','VI','VII'];

    const row = chords.map((c, i) =>
      `<div class="chord-led-cell${i === 0 ? ' is-tonic' : ''}">
        <div class="chord-led-roman">${romans[i]}</div>
        <div class="chord-led-name">${disp(c.name)}</div>
      </div>`
    ).join('');

    const vampChords = VAMP_DEGREES[mode].map(i => disp(chords[i].name));
    const vampStr = vampChords.join('<span class="chord-led-sep">→</span>');

    document.getElementById('chord-display').innerHTML = `
      <div class="chord-led-header">DIATONIC 7ths</div>
      <div class="chord-led-row">${row}</div>
      <div class="chord-led-divider"></div>
      <div class="chord-led-vamp">
        <span class="chord-led-vamp-label">VAMP</span>
        <span class="chord-led-vamp-chords">${vampStr}</span>
      </div>`;
  }

  /* ── Parent Family ───────────────────────────────────────────────────────── */

  function renderParentFamily() {
    const { root, mode } = state;
    const family = Theory.getModeFamily(root, mode);
    const parent = Theory.getParentRoot(root, mode);
    const romans = ['I','II','III','IV','V','VI','VII'];

    document.getElementById('family-title').textContent = 'PARENT FAMILY';

    document.getElementById('family-led').innerHTML = `
      <div class="family-led-parent">${disp(parent)} MAJOR</div>
      <div class="family-led-modes">
        ${family.map(f => {
          const cls = f.isSelected ? 'is-selected' : '';
          return `<span class="family-led-mode ${cls}">${disp(f.root)} ${f.name.toUpperCase()}</span>`;
        }).join('')}
      </div>`;

    const list = document.getElementById('family-list');
    list.innerHTML = family.map((f, i) => {
      const cls = f.isSelected ? 'is-selected' : 'is-other';
      return `<button class="family-btn ${cls}" data-root="${f.root}" data-mode="${f.name}">
        <span class="family-btn-roman">${romans[i]}</span>
      </button>`;
    }).join('');

    list.querySelectorAll('.family-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.root = btn.dataset.root;
        state.mode = btn.dataset.mode;
        renderKnobs();
        render();
      });
    });
  }

  /* ── Character ───────────────────────────────────────────────────────────── */

  function renderCharacter() {
    const { root, mode } = state;
    const moodData = Theory.MODE_MOOD[mode];
    const intervals = Theory.MODE_INTERVAL_FORMULA[mode].split(' ');
    const charIdx = CHAR_INTERVAL_IDX[mode];

    document.getElementById('char-title').textContent = 'CHARACTER';

    document.getElementById('character-grid').innerHTML = `
      <div class="led-display char-sounds-led">
        <div class="led-header-row"><span class="char-mode-accent">${disp(root)} ${mode.toUpperCase()}</span> SOUNDS LIKE</div>
        <div class="char-mood">${moodData.mood}</div>
        <div class="char-genres">${MODE_USES[mode]}</div>
        <div class="char-interval-row">Characteristic: <span class="char-interval">${intervals[charIdx]}</span></div>
      </div>
      <div class="led-display char-notes-led">
        <div class="led-header-row">HOW TO USE</div>
        <div class="char-note-row">
          <span class="char-note-tag">USE OVER</span>
          <span class="char-note-text">${MODE_USE_OVER[mode]}</span>
        </div>
        <div class="char-note-row">
          <span class="char-note-tag">COMPARE</span>
          <span class="char-note-text">${MODE_COMPARE[mode]}</span>
        </div>
        <div class="char-note-row">
          <span class="char-note-tag">TIP</span>
          <span class="char-note-text">${MODE_TIP[mode]}</span>
        </div>
      </div>`;
  }

  /* ── All Modes Strip ─────────────────────────────────────────────────────── */


  /* ── ENGAGE animation ────────────────────────────────────────────────────── */

  function fireEngageAnimation() {
    function pulse(el, cls) {
      if (!el) return;
      el.classList.remove(cls);
      void el.offsetWidth; // force reflow to restart animation
      el.classList.add(cls);
      el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
    }
    pulse(document.getElementById('led-display'), 'firing');
    pulse(document.getElementById('engageBtn'), 'firing');
    document.querySelectorAll('.rack-module-status').forEach(el => pulse(el, 'blinking'));
  }

  /* ── Master render ───────────────────────────────────────────────────────── */

  function render() {
    renderLED();
    renderFretboard();
    renderChordPad();
    renderParentFamily();
    renderCharacter();
  }

  /* ── Knobs ───────────────────────────────────────────────────────────────── */

  const ROOT_OPTIONS = Theory.ROOT_DISPLAY;
  const MODE_OPTIONS = Theory.MODE_NAMES.map(m => ({ value: m, label: m.toUpperCase() }));

  function renderKnobs() {
    const rootEl = document.getElementById('root-knob');
    const modeEl = document.getElementById('mode-knob');
    if (!rootEl || !modeEl) return;
    renderKnob(rootEl, ROOT_OPTIONS, state.root, 'ROOT', v => { state.root = v; render(); });
    renderKnob(modeEl, MODE_OPTIONS, state.mode, 'MODE', v => { state.mode = v; render(); });
  }

  /* ── Static page navigation widget ──────────────────────────────────────── */

  function bindModeNavWidget() {
    const rootSelect = document.getElementById('rootSelect');
    const modeSelect = document.getElementById('modeSelect');
    const goBtn = document.getElementById('goBtn');
    if (!goBtn) return;

    function navigate() {
      const root = rootSelect.value;
      const mode = modeSelect.value.toLowerCase();
      const keySlug = root.toLowerCase().replace('#', '-sharp');
      window.location.href = `/modes/${mode}/${keySlug}/`;
    }

    goBtn.addEventListener('click', navigate);
    rootSelect.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
    modeSelect.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(); });
  }

  /* ── Boot ────────────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('gmf_theme');
    applyTheme(saved === 'day' ? 'day' : 'night');

    const toggle = document.getElementById('themeToggle');
    if (toggle) {
      toggle.addEventListener('click', () => applyTheme(themeKey === 'night' ? 'day' : 'night'));
    }

    if (!isHome) {
      bindModeNavWidget();
      return;
    }

    renderKnobs();

    const cagedToggle = document.getElementById('caged-toggle');
    if (cagedToggle) {
      cagedToggle.addEventListener('click', () => {
        state.cagedMode = !state.cagedMode;
        state.cagedShape = 'C';
        cagedToggle.classList.toggle('active', state.cagedMode);
        renderFretboard();
      });
    }

    document.querySelectorAll('.caged-shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cagedShape = btn.dataset.shape;
        renderFretboard();
      });
    });

    initialized = true;
    render();
  });
})();
