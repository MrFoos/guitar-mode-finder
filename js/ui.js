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

  // Open-string semitone indices: string 1 (high e) through string 6 (low E)
  const OPEN_SEMITONES = [4, 11, 7, 2, 9, 4]; // e B G D A E

  function computeCAGEDWindow(shape, root, mode) {
    const baseFret = CAGED.getShapeFret(shape, root);

    // C-shape: Lydian needs a left-shifted window (G-string at baseFret-2 = #4 above root).
    // All other modes: open position extends to 4 frets when fret 4 has a scale note;
    // non-open extends to 5 frets when the minor 3rd (Dorian/Phrygian/Aeolian/Locrian) is in scale.
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

    // D-shape normally shows 5 frets starting one fret before the root. However extend only
    // when baseFret-1 actually has scale notes — Dorian's interval structure means that fret
    // is always empty for D shape, so Dorian uses a 4-fret window starting at baseFret.
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

    // G-shape: root sits on the G-string at baseFret. Extend down to baseFret-1 only when
    // the G-string note there is in the scale (the major-7th cases: Ionian, Lydian).
    // For baseFret=1, baseFret-1=0 means the open G string; if it's not in the scale don't
    // show open strings at all (avoids open B and a trailing empty fret for modes like Dorian).
    if (shape === 'G') {
      const ns = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
      const gStringNote = (OPEN_SEMITONES[2] + baseFret - 1) % 12;
      if (ns.has(gStringNote)) {
        // Extend DOWN: major-7th modes (Ionian, Lydian) — leading tone below root on G-string
        if (baseFret === 1) return { winStart: 1, frets: 4, showOpen: true };
        return { winStart: baseFret - 1, frets: 5, showOpen: false };
      }
      // Extend UP: modes where fret baseFret+4 has ≥2 scale notes (Phrygian, Locrian)
      const notesAtTop = OPEN_SEMITONES.filter(s => ns.has((s + baseFret + 4) % 12)).length;
      if (notesAtTop >= 2) return { winStart: baseFret, frets: 5, showOpen: false };
      return { winStart: baseFret, frets: 4, showOpen: false };
    }

    // E-shape open position (F root): base is 3 fretted columns, but extend to 4 when
    // fret 4 has scale notes that are NOT already available as open strings (e.g. Ab/Eb).
    // Lydian's fret-4 note (B on G string) duplicates the open B string — don't extend.
    // Locrian: the open B string duplicates G-string fret 4 — skip open strings entirely.
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

    // E-shape non-open: early-return cases before the scoring algorithm.
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
      // Only extend to 5 frets when ≥2 strings have scale notes at baseFret+3, OR when the
      // B-string has one there (Mixolydian's b7). Lydian's sole note is on the G string — skip.
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
        // Extra penalty when root spans both window ends (a sign the window is poorly centred)
        const rootAtBothEnds = rootAtStart > 0 && rootAtEnd > 0;
        const edgePenalty = rootOnlyAtEdge ? 10 : (rootAtBothEnds ? 5 : 0);
        // Open-position windows are not penalised for delta — they sit at their natural anchor
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

  function buildCAGEDShapeSVG(shape, root, mode) {
    const t = currentTheme();
    const scale = Theory.getModeNotes(root, mode);
    const normalizedScale = scale.map(n => SEMITONES[Theory.noteIndex(n)]);
    const noteSet = new Set(normalizedScale);
    const displayNote = {};
    normalizedScale.forEach((norm, i) => { displayNote[norm] = scale[i]; });

    const { winStart: windowStart, frets, showOpen } = computeCAGEDWindow(shape, root, mode);
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
      const sw = (0.7 + i * 0.28).toFixed(2);
      if (showOpen) {
        const gap = 18;
        // String starts after the open indicator, runs through the nut and fretboard
        p.push(`<line x1="${(openX + gap).toFixed(1)}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${t.string}" stroke-width="${sw}"/>`);
      } else {
        p.push(`<line x1="${padL - 12}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${t.string}" stroke-width="${sw}"/>`);
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

    // Open string dots (scale note) or string name label (not in scale)
    if (showOpen) {
      TUNING.forEach((open, si) => {
        const n = noteAt(open, 0);
        const cx = openX.toFixed(1);
        const cy = (padT + si * rowH).toFixed(1);
        if (noteSet.has(n)) {
          const idx = normalizedScale.indexOf(n);
          drawDot(cx, cy, n, idx);
        } else {
          p.push(`<text x="${cx}" y="${(padT + si * rowH + 4).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="600">${open}</text>`);
        }
      });
    }

    // Fretted note dots
    // C-shape Lydian open position: the window extends to frets=4 to include F# on D-string.
    // The last fret may also land a note (e.g. B on G-string) that's already shown as an open
    // string — suppress those duplicates so the last fret shows only the notes that warranted
    // the extension.
    const openScaleNotes = showOpen
      ? new Set(TUNING.map(open => noteAt(open, 0)).filter(n => noteSet.has(n)))
      : null;
    const baseFretForShape = CAGED.getShapeFret(shape, root);
    const semiSet = new Set(Theory.getModeNotes(root, mode).map(n => Theory.noteIndex(n)));
    const rootNoteForLydian = (OPEN_SEMITONES[1] + baseFretForShape) % 12;
    const isLydianShape = semiSet.has((rootNoteForLydian + 4) % 12) && semiSet.has((rootNoteForLydian + 6) % 12);
    TUNING.forEach((open, si) => {
      for (let off = 0; off < frets; off++) {
        const n = noteAt(open, windowStart + off);
        if (!noteSet.has(n)) continue;
        if (shape === 'C' && showOpen && isLydianShape && off === frets - 1 && openScaleNotes.has(n)) continue;
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
      shapeNav.querySelectorAll('.caged-shape-btn').forEach(btn => {
        btn.classList.toggle('active', state.cagedMode && btn.dataset.shape === state.cagedShape);
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
      toggle.onclick = () => applyTheme(themeKey === 'night' ? 'day' : 'night');
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
        cagedToggle.classList.toggle('is-selected', state.cagedMode);
        cagedToggle.classList.toggle('is-other', !state.cagedMode);
        renderFretboard();
      });
    }

    document.querySelectorAll('.caged-shape-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cagedShape = btn.dataset.shape;
        if (!state.cagedMode) {
          state.cagedMode = true;
          cagedToggle.classList.add('is-selected');
          cagedToggle.classList.remove('is-other');
        }
        renderFretboard();
      });
    });

    initialized = true;
    render();
  });
})();
