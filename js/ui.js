(function () {
  'use strict';

  /* ── Only run full app on the home page ─────────────────────────────────── */
  const isHome = !!document.getElementById('mod-lookup');

  /* ── Theme ───────────────────────────────────────────────────────────────── */

  const DARK = {
    isDark: true,
    fbTop: '#0d0d0f', fbBot: '#1a1a20',
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
    fbTop: '#3a1f0e', fbBot: '#2a1408',
    nut: '#f0e0c0', fretEdge: '#c8c0b0', fretShine: '#fff5d8',
    inlay: '#f4e8c8', inlayEdge: '#a08560',
    string: '#e8d4a0', fbLabel: '#d4b888',
    rootFill: '#a83232', rootStroke: '#6a1f1f', rootText: '#fffbe8',
    rootGlow: '#ff6b3a', rootHi: '#ffd0a0',
    pentaFill: '#c47f1a', pentaStroke: '#7a4f10', pentaText: '#1a0d00',
    scaleFill: '#f4ecd6', scaleStroke: '#a08560', scaleText: '#2a1f15',
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

  let state = { root: 'G#', mode: 'Dorian' };
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

  const MODE_EXAMPLES = {
    Ionian:     ['Let It Be — Beatles', 'Happy Birthday', 'Most pop songs'],
    Dorian:     ['So What — Miles Davis', 'Oye Como Va — Santana', 'Scarborough Fair'],
    Phrygian:   ['Wherever I May Roam — Metallica', 'Spanish Phrygian vamps', 'White Zombie riffs'],
    Lydian:     ['Flying — Joe Satriani', 'The Simpsons theme', 'Lydian film scores'],
    Mixolydian: ["Sweet Child O' Mine — Guns N' Roses", 'Norwegian Wood — Beatles', 'Gimme Shelter — Stones'],
    Aeolian:    ['Stairway to Heaven — Zeppelin', 'Hotel California — Eagles', 'Sultans of Swing — Dire Straits'],
    Locrian:    ['Army of Me — Björk', 'Half-diminished chord vamps', 'Metallica solos'],
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
      <div class="knob-container">
        <svg class="knob-svg" viewBox="0 0 100 100">${ticks}</svg>
        <div class="knob-body" style="transform:rotate(${angle}deg)">
          <div class="knob-pointer"></div>
          <div class="knob-cap"></div>
        </div>
      </div>
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
    document.getElementById('led-degree').textContent = `DEG · ${MODE_DEGREE[mode]}`;
    document.getElementById('led-name').textContent = `${disp(root)} ${mode.toUpperCase()}`;
    document.getElementById('led-parent').textContent =
      `parent · ${disp(parent)} MAJ · ${notes.map(disp).join(' · ')}`;
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
    Ionian: [0,1,2,4,5], Dorian: [0,1,3,4,6], Phrygian: [0,2,3,5,6],
    Lydian: [0,2,3,4,6], Mixolydian: [0,1,3,4,5],
    Aeolian: [0,2,3,4,6], Locrian: [0,2,3,4,6],
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
    const noteSet = new Set(scale);
    const W = 1400, H = 320;
    const padL = 70, padR = 24, padT = 28, padB = 38;
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
      p.push(`<text x="${padL - 26}" y="${(padT + i * rowH + 4).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="12" fill="${t.fbLabel}" text-anchor="middle" font-weight="600">${s}</text>`);
    });

    for (let f = 0; f < frets; f++) {
      const x = (padL + (f + 0.5) * fretW).toFixed(1);
      p.push(`<text x="${x}" y="${(H - padB + 22).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="10" fill="${t.fbLabel}" text-anchor="middle">${f + 1}</text>`);
    }

    TUNING.forEach((open, si) => {
      for (let f = 0; f <= frets; f++) {
        const n = noteAt(open, f);
        if (!noteSet.has(n)) continue;
        const idx = scale.indexOf(n);
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
        if (isRoot) p.push(`<circle cx="${(parseFloat(cx) - 4).toFixed(1)}" cy="${(parseFloat(cy) - 5).toFixed(1)}" r="4" fill="${t.rootHi}" opacity="0.5"/>`);
        p.push(`<text x="${cx}" y="${(parseFloat(cy) + 4.5).toFixed(1)}" font-family="'JetBrains Mono',monospace" font-size="13" font-weight="700" fill="${txt}" text-anchor="middle">${disp(n)}</text>`);
      }
    });

    p.push('</svg>');
    return p.join('');
  }

  function renderFretboard() {
    const t = currentTheme();
    document.getElementById('fretboard-wrap').innerHTML = buildFretboardSVG(state.root, state.mode);

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

  function renderChordPad() {
    const { root, mode } = state;
    const chords = getDiatonicChords(root, mode);
    const romans = ['I','II','III','IV','V','VI','VII'];

    document.getElementById('chord-pad').innerHTML = chords.map((c, i) => {
      const tonic = i === 0;
      return `<div class="chord-pad ${tonic ? 'is-tonic' : 'is-other'}">
        <div class="chord-roman">${romans[i]}</div>
        <div class="chord-name">${disp(c.name)}</div>
      </div>`;
    }).join('') + `<div class="chord-pad-aux">+ AUX</div>`;

    document.getElementById('vamp-hint').textContent =
      `▸ Vamp idea — ${disp(chords[0].name)} → ${disp(chords[3].name)} → ${disp(chords[4].name)}`;
  }

  /* ── Parent Family ───────────────────────────────────────────────────────── */

  function renderParentFamily() {
    const { root, mode } = state;
    const family = Theory.getModeFamily(root, mode);
    const parent = Theory.getParentRoot(root, mode);
    const romans = ['I','II','III','IV','V','VI','VII'];
    const moods = Theory.MODE_MOOD;

    document.getElementById('family-title').textContent = `PARENT FAMILY · ${disp(parent)} MAJ`;

    const list = document.getElementById('family-list');
    list.innerHTML = family.map((f, i) => {
      const cls = f.isSelected ? 'is-selected' : 'is-other';
      return `<div class="family-row ${cls}" data-root="${f.root}" data-mode="${f.name}">
        <span class="family-roman">${romans[i]}</span>
        <span class="family-label">${disp(f.root)} ${f.name}</span>
        <span class="family-mood">${moods[f.name].mood}</span>
      </div>`;
    }).join('');

    list.querySelectorAll('.family-row').forEach(row => {
      row.addEventListener('click', () => {
        state.root = row.dataset.root;
        state.mode = row.dataset.mode;
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

    document.getElementById('char-title').textContent =
      `CHARACTER · ${moodData.mood.toUpperCase()}`;

    document.getElementById('character-grid').innerHTML = `
      <div>
        <h3 class="character-heading">
          <span class="mode-accent">${disp(root)} ${mode}</span> sounds like…
        </h3>
        <p class="character-desc">
          ${MODE_USES[mode]}. The interval that gives this mode its character is its
          <span class="char-interval">${intervals[charIdx]}</span>
          — listen for it as the colour-tone over the I chord.
        </p>
      </div>
      <div>
        <div class="heard-in-label">HEARD IN</div>
        <ul class="examples-list">
          ${MODE_EXAMPLES[mode].map((ex, i) =>
            `<li class="example-item">
              <span class="example-num">${String(i+1).padStart(2,'0')}</span>
              <span class="example-title">${ex}</span>
            </li>`
          ).join('')}
        </ul>
      </div>`;
  }

  /* ── All Modes Strip ─────────────────────────────────────────────────────── */

  function renderModesStrip() {
    const strip = document.getElementById('modes-strip');

    strip.innerHTML = Theory.MODE_NAMES.map(m => {
      const sel = m === state.mode;
      return `<div class="mode-card ${sel ? 'is-selected' : 'is-unselected'}" data-mode="${m}">
        <div class="mode-card-degree">${MODE_DEGREE[m]}</div>
        <div class="mode-card-name">${m.toUpperCase()}</div>
        <div class="mode-card-intervals">${Theory.MODE_INTERVAL_FORMULA[m]}</div>
      </div>`;
    }).join('');

    strip.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        state.mode = card.dataset.mode;
        renderKnobs();
        render();
      });
    });
  }

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
    renderScaleStrip();
    renderChordPad();
    renderParentFamily();
    renderCharacter();
    renderModesStrip();
  }

  /* ── Knobs ───────────────────────────────────────────────────────────────── */

  const ROOT_OPTIONS = Theory.ROOT_DISPLAY;
  const MODE_OPTIONS = Theory.MODE_NAMES.map(m => ({ value: m, label: m.slice(0,4).toUpperCase() }));

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

    renderVU(document.getElementById('vu-meter'));
    renderKnobs();

    const engageBtn = document.getElementById('engageBtn');
    engageBtn.addEventListener('click', () => {
      render();
      fireEngageAnimation();
    });

    initialized = true;
    render();
  });
})();
