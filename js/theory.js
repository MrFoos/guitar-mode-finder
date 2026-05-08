// theory.js — Music theory engine for Guitar Mode Finder
// Exports work in both browser (window.Theory) and Node.js (module.exports)

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.Theory = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Flat equivalents for enharmonic display
  const ENHARMONIC_FLAT = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
  };
  const ENHARMONIC_SHARP = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };

  // Keys that conventionally use flats
  const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

  const MODE_NAMES = ['Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian'];

  // Semitone intervals from mode root (not parent root)
  const MODE_INTERVALS = {
    Ionian:     [0, 2, 4, 5, 7, 9, 11],
    Dorian:     [0, 2, 3, 5, 7, 9, 10],
    Phrygian:   [0, 1, 3, 5, 7, 8, 10],
    Lydian:     [0, 2, 4, 6, 7, 9, 11],
    Mixolydian: [0, 2, 4, 5, 7, 9, 10],
    Aeolian:    [0, 2, 3, 5, 7, 8, 10],
    Locrian:    [0, 1, 3, 5, 6, 8, 10],
  };

  // Scale degrees (1-indexed) that belong to the pentatonic for each mode
  const PENTA_DEGREES = {
    Ionian:     [1, 2, 3, 5, 6],
    Dorian:     [1, 2, 4, 5, 7],
    Phrygian:   [1, 3, 4, 5, 7],
    Lydian:     [1, 2, 3, 5, 6],
    Mixolydian: [1, 2, 3, 5, 6],
    Aeolian:    [1, 3, 4, 5, 7],
    Locrian:    [1, 3, 4, 5, 7],
  };

  // How many semitones above the parent major root each mode starts
  const MODE_ROOT_OFFSET = {
    Ionian: 0, Dorian: 2, Phrygian: 4, Lydian: 5,
    Mixolydian: 7, Aeolian: 9, Locrian: 11
  };

  // 7th chord quality for each scale degree (1-indexed)
  const CHORD_QUALITY = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];

  const MODE_INTERVAL_FORMULA = {
    Ionian:     '1 2 3 4 5 6 7',
    Dorian:     '1 2 ♭3 4 5 6 ♭7',
    Phrygian:   '1 ♭2 ♭3 4 5 ♭6 ♭7',
    Lydian:     '1 2 3 ♯4 5 6 7',
    Mixolydian: '1 2 3 4 5 6 ♭7',
    Aeolian:    '1 2 ♭3 4 5 ♭6 ♭7',
    Locrian:    '1 ♭2 ♭3 4 ♭5 ♭6 ♭7',
  };

  const MODE_CHARACTERISTIC_NOTE = {
    Ionian:     { degree: 7, description: 'the major 7th gives it a bright, resolved sound' },
    Dorian:     { degree: 6, description: 'the natural 6th separates Dorian from the minor (Aeolian)' },
    Phrygian:   { degree: 2, description: 'the ♭2 (flat second) creates its dark, Spanish-sounding tension' },
    Lydian:     { degree: 4, description: 'the ♯4 (raised fourth) gives it a dreamy, floating quality' },
    Mixolydian: { degree: 7, description: 'the ♭7 (flat seventh) gives it a bluesy, dominant feel' },
    Aeolian:    { degree: 6, description: 'the ♭6 (flat sixth) deepens its melancholic minor character' },
    Locrian:    { degree: 5, description: 'the ♭5 (diminished fifth) makes it unstable and rarely used as a tonal center' },
  };

  const MODE_MOOD = {
    Ionian:     { mood: 'Happy, bright, resolved', usage: 'Major key melodies, pop, folk, classical', examples: 'Happy Birthday, Let It Be, most pop songs' },
    Dorian:     { mood: 'Soulful, minor but with hope', usage: 'Jazz, blues-rock, funk, Latin', examples: 'So What (Miles Davis), Oye Como Va, Scarborough Fair' },
    Phrygian:   { mood: 'Dark, tense, Spanish/flamenco', usage: 'Metal, flamenco, film scores', examples: 'White Zombie riffs, flamenco progressions' },
    Lydian:     { mood: 'Dreamy, floating, ethereal', usage: 'Film music, jazz, progressive rock', examples: 'The Simpsons theme, Flying (Beatles), Lydian film scores' },
    Mixolydian: { mood: 'Bluesy, dominant, rock', usage: 'Blues, rock, country, funk', examples: 'Norwegian Wood (Beatles), Sweet Home Chicago, Gimme Shelter' },
    Aeolian:    { mood: 'Melancholic, natural minor', usage: 'Rock, pop, classical, metal', examples: 'Stairway to Heaven, Hotel California, Sultans of Swing' },
    Locrian:    { mood: 'Unstable, tense, dissonant', usage: 'Metal, jazz, used sparingly', examples: 'Half-diminished chord contexts, Metallica solos' },
  };

  function noteIndex(note) {
    const n = ENHARMONIC_SHARP[note] || note;
    return CHROMATIC.indexOf(n);
  }

  function noteAtSemitone(semitone, preferFlats) {
    const n = CHROMATIC[((semitone % 12) + 12) % 12];
    if (preferFlats && ENHARMONIC_FLAT[n]) return ENHARMONIC_FLAT[n];
    return n;
  }

  function preferFlatsForKey(rootNote) {
    return FLAT_KEYS.has(rootNote);
  }

  // Determine spelling preference from the root note as typed by the user:
  // '#' root → sharps, 'b' root → flats, natural note → conventional
  function spellWithFlats(rootNote) {
    if (rootNote.includes('#')) return false;
    if (rootNote.includes('b')) return true;
    return preferFlatsForKey(rootNote);
  }

  // Given a mode root note + mode name, find the parent major scale root
  function getParentRoot(modeRoot, modeName) {
    const offset = MODE_ROOT_OFFSET[modeName];
    const idx = noteIndex(modeRoot);
    const parentIdx = ((idx - offset) + 12 * 3) % 12;
    return noteAtSemitone(parentIdx, spellWithFlats(modeRoot));
  }

  // Build all 7 notes for a given root + mode
  function getModeNotes(root, modeName) {
    const intervals = MODE_INTERVALS[modeName];
    const rootIdx = noteIndex(root);
    return intervals.map(i => noteAtSemitone(rootIdx + i, spellWithFlats(root)));
  }

  // Build diatonic 7th chords for a mode
  function getDiatonicChords(root, modeName) {
    const notes = getModeNotes(root, modeName);
    return notes.map((note, i) => ({
      root: note,
      quality: CHORD_QUALITY[i],
      name: note + CHORD_QUALITY[i],
      degree: i + 1,
    }));
  }

  // Get pentatonic notes for a mode (as note names)
  function getPentatonicNotes(root, modeName) {
    const notes = getModeNotes(root, modeName);
    const pentaDegrees = PENTA_DEGREES[modeName];
    return pentaDegrees.map(d => notes[d - 1]);
  }

  // Full mode family: given any mode+root, returns info for all 7 sibling modes
  function getModeFamily(modeRoot, modeName) {
    const parentRoot = getParentRoot(modeRoot, modeName);
    const parentIdx = noteIndex(parentRoot);
    const useFlats = spellWithFlats(modeRoot);

    return MODE_NAMES.map((name, i) => {
      const modeRootNote = noteAtSemitone(parentIdx + MODE_ROOT_OFFSET[name], useFlats);
      const notes = getModeNotes(modeRootNote, name);
      const chords = getDiatonicChords(modeRootNote, name);
      const pentaNotes = getPentatonicNotes(modeRootNote, name);
      const isSelected = (name === modeName && modeRootNote === modeRoot) ||
        (name === modeName && noteIndex(modeRootNote) === noteIndex(modeRoot));

      return {
        name,
        root: modeRootNote,
        notes,
        chords,
        pentaNotes,
        formula: MODE_INTERVAL_FORMULA[name],
        characteristic: MODE_CHARACTERISTIC_NOTE[name],
        mood: MODE_MOOD[name],
        isSelected,
        degreeInParent: i + 1,
        parentRoot,
      };
    });
  }

  // Slug helpers for URL generation
  function noteSlug(note) {
    // Only replace '#' with '-sharp'. Never treat the note B as a flat symbol.
    // ALL_ROOTS uses sharps only, so flat slugs are not needed.
    return note.toLowerCase().replace('#', '-sharp');
  }

  function modeSlug(modeName) {
    return modeName.toLowerCase();
  }

  // All 12 chromatic roots (prefer sharps by default for display)
  const ALL_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Display names for note selectors (include flat equivalents)
  const ROOT_DISPLAY = [
    { value: 'C',  label: 'C' },
    { value: 'C#', label: 'C# / Db' },
    { value: 'D',  label: 'D' },
    { value: 'D#', label: 'D# / Eb' },
    { value: 'E',  label: 'E' },
    { value: 'F',  label: 'F' },
    { value: 'F#', label: 'F# / Gb' },
    { value: 'G',  label: 'G' },
    { value: 'G#', label: 'G# / Ab' },
    { value: 'A',  label: 'A' },
    { value: 'A#', label: 'A# / Bb' },
    { value: 'B',  label: 'B' },
  ];

  return {
    MODE_NAMES,
    MODE_INTERVALS,
    MODE_INTERVAL_FORMULA,
    MODE_CHARACTERISTIC_NOTE,
    MODE_MOOD,
    PENTA_DEGREES,
    MODE_ROOT_OFFSET,
    ALL_ROOTS,
    ROOT_DISPLAY,
    noteIndex,
    noteAtSemitone,
    getParentRoot,
    getModeNotes,
    getDiatonicChords,
    getPentatonicNotes,
    getModeFamily,
    noteSlug,
    modeSlug,
  };
});
