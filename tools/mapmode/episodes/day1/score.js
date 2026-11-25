// Day 1: a journey, a question, a revelation, joy. D dorian (hopeful minor), 72 bpm.
window.SCORE = { key: 'D', mode: 'dorian', bpm: 72, seed: 11, stringsCutoff: 2400,
  sections: [
    { from: 'L0-0.45', to: 'L1', chords: ['i', 'IV', 'i', 'VII'], intensity: 0.3, layers: ['drone', 'strings', 'pluck'], density: 0.45 },
    { from: 'L1', to: 'L2', chords: ['i', 'VII', 'VI', 'VII'], intensity: 0.45, layers: ['drone', 'strings', 'pluck', 'drum'], density: 0.5 },
    { from: 'L2', to: 'L3', chords: ['i', 'IV', 'i', 'VII'], intensity: 0.55, layers: ['drone', 'strings', 'pluck', 'drum'], density: 0.75 },
    { from: 'L3', to: 'L5', chords: ['VI', 'VII', 'i', 'VII'], intensity: 0.5, layers: ['drone', 'strings', 'choir', 'pluck'], density: 0.35 },
    { from: 'L5', to: 'L6', chords: ['I', 'IV', 'V', 'I'], intensity: 0.65, layers: ['strings', 'pluck', 'drum', 'choir'], density: 0.85 },
    { from: 'L6', to: 'END-6.2', chords: ['I', 'IV', 'I', 'V'], intensity: 0.85, layers: ['drone', 'strings', 'choir', 'pluck', 'drum'], density: 0.8 },
    { from: 'END-6.2', to: 'END', chords: ['I'], beatsPerChord: 16, intensity: 0.5, layers: ['strings', 'choir', 'pluck'], density: 0.3 },
  ],
  risers: [{ t: 'W4:jesus', length: 2.4, gain: 0.7 }, { t: 'L6', length: 2.0, gain: 0.6 }],
  whooshes: [{ t: 'L1+0.2' }, { t: 'L2+0.2' }, { t: 'W5:home' }, { t: 'L5e' }, { t: 'END-6.2' }],
  hits: [{ t: 'W6:christian', gain: 0.7 }],
}
