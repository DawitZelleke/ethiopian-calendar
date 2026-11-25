// Day 3: a quiet beginning, a journey, the pit, the rescue, the fall of a city, a promise kept. D minor, 70 bpm.
window.SCORE = { key: 'D', mode: 'aeolian', bpm: 70, seed: 37, stringsCutoff: 2200,
  sections: [
    { from: 'L0-0.45', to: 'L2', chords: ['i', 'VI', 'i', 'VII'], intensity: 0.35, layers: ['drone', 'strings', 'pluck'], density: 0.45 },
    { from: 'L2', to: 'L3', chords: ['i', 'VI', 'III', 'VII'], intensity: 0.55, layers: ['drone', 'strings', 'pluck', 'drum'], density: 0.7 },
    { from: 'L3', to: 'L4', chords: ['iv', 'i', 'iv', 'V'], intensity: 0.5, layers: ['drone', 'strings', 'pulse', 'drum'], drumPattern: 'heart', density: 0.3 },
    { from: 'L4', to: 'L5', chords: ['VI', 'VII', 'III', 'V'], intensity: 0.6, layers: ['strings', 'choir', 'pluck'], density: 0.6 },
    { from: 'L5', to: 'W5:god', chords: ['i', 'VI', 'iv', 'V'], beatsPerChord: 2, intensity: 1.0, layers: ['drone', 'strings', 'pulse', 'drum'], drumPattern: 'war' },
    { from: 'W5:god', to: 'END-6.2', chords: ['VI', 'VII', 'I'], intensity: 0.7, layers: ['strings', 'choir', 'pluck'], density: 0.4 },
    { from: 'END-6.2', to: 'END', chords: ['I'], beatsPerChord: 16, intensity: 0.5, layers: ['strings', 'choir', 'pluck'], density: 0.3 },
  ],
  risers: [{ t: 'W4:out', length: 2.0, gain: 0.6 }, { t: 'L5', length: 1.8, gain: 0.7 }],
  whooshes: [{ t: 'L2' }, { t: 'L3+0.4' }, { t: 'L5-0.2' }, { t: 'END-6.2' }],
  hits: [{ t: 'W4:out', gain: 0.45 }, { t: 'W5:burned', gain: 1.0 }],
}
