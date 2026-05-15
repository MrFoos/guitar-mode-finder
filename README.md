# Guitar Mode Finder

A static guitar modes reference tool — [guitarmodefinder.com](https://guitarmodefinder.com)

Select any mode in any key (e.g. G# Dorian) and instantly see the full parent scale family, note names, diatonic 7th chords, pentatonic subset, interval formula, and CAGED fretboard diagrams.

## Tech stack

- Vanilla HTML, CSS, JavaScript — no framework
- Static files served by nginx on a VPS
- 84 pages pre-rendered at build time (12 keys × 7 modes)
- Umami analytics (self-hosted, privacy-friendly)

## Project structure

```
├── index.html              # Home — mode selector
├── modes/                  # 84 pre-rendered mode pages
│   ├── index.html          # Mode overview
│   ├── dorian/
│   │   ├── index.html      # Dorian overview (all 12 keys)
│   │   ├── c/index.html    # C Dorian
│   │   └── g-sharp/index.html
│   └── ...                 # ionian, phrygian, lydian, mixolydian, aeolian, locrian
├── guides/
│   ├── caged/              # The CAGED System guide
│   └── modes/              # How to use modes guide
├── about/
├── feedback/
├── css/main.css
├── js/
│   ├── theory.js           # Music theory engine (notes, modes, chords)
│   ├── caged.js            # CAGED shape data + SVG fretboard renderer
│   └── ui.js               # DOM interactions
├── resources/              # Static SVG assets
├── build/
│   └── generate.js         # Pre-renders all 84 pages + sitemap.xml
├── sitemap.xml
└── robots.txt
```

## Local development

No build step needed for the site itself — open any HTML file directly in a browser.

To regenerate all 84 mode pages and sitemap after content changes:

```bash
node build/generate.js
```

## Deployment

Push to `main` — GitHub Actions automatically rsyncs the built files to the VPS.

The workflow is defined in `.github/workflows/deploy.yml`.

## Music theory engine (`js/theory.js`)

Key exports:
- `getModeFamily(root, mode)` — returns all 7 modes of the parent scale with notes and chords
- `getDiatonicChords(root, mode)` — 7th chord names for a given mode
- `getModeNotes(root, mode)` — note names for a given mode
- `getPentatonicNotes(root, mode)` — pentatonic subset

## CAGED renderer (`js/caged.js`)

Renders inline SVG fretboard diagrams for all 5 CAGED shapes (C, A, G, E, D) in any key. Root notes shown in red, pentatonic tones in green, other scale tones in dark.
