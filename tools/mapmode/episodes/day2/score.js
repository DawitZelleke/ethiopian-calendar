// Day 2: a royal procession, a riddle, a legacy, awe. D minor, 76 bpm.
window.SCORE = { key: 'D', mode: 'aeolian', bpm: 76, seed: 23, stringsCutoff: 2200,
  sections: [
    { from: 'L0-0.45', to: 'L1', chords: ['i', 'VI', 'V', 'i'], intensity: 0.5, layers: ['drone', 'strings', 'pluck', 'drum'], density: 0.55 },
    { from: 'L1', to: 'L2', chords: ['i', 'VI', 'V', 'i'], intensity: 0.75, layers: ['drone', 'strings', 'pluck', 'drum', 'pulse'], density: 0.7 },
    { from: 'L2', to: 'L3', chords: ['iv', 'V', 'iv', 'V'], intensity: 0.6, layers: ['strings', 'pulse'], density: 0.4 },
    { from: 'L3', to: 'L4', chords: ['i', 'VI'], beatsPerChord: 8, intensity: 0.35, layers: ['drone', 'choir', 'pluck'], density: 0.35 },
    { from: 'L4', to: 'L5', chords: ['VI', 'III', 'VII', 'i'], intensity: 0.7, layers: ['drone', 'strings', 'choir', 'drum', 'pluck'], density: 0.6 },
    { from: 'L5', to: 'L6', chords: ['i', 'VI', 'III', 'VII'], intensity: 0.8, layers: ['strings', 'drum', 'pulse', 'pluck'], density: 0.6 },
    { from: 'L6', to: 'END-6.2', chords: ['VI', 'VII', 'I', 'I'], intensity: 0.75, layers: ['drone', 'strings', 'choir'], density: 0.3 },
    { from: 'END-6.2', to: 'END', chords: ['I'], beatsPerChord: 16, intensity: 0.5, layers: ['strings', 'choir', 'pluck'], density: 0.3 },
  ],
  risers: [{ t: 'W2:answered', length: 2.0, gain: 0.6 }, { t: 'L6', length: 2.2, gain: 0.6 }],
  whooshes: [{ t: 'L2' }, { t: 'L3+0.2' }, { t: 'L4+0.2' }, { t: 'L6+0.2' }, { t: 'END-6.2' }],
  hits: [{ t: 'W2:answered', gain: 0.55 }, { t: 'W6:greater', gain: 0.5 }],
}
