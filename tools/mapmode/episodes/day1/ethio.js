// Day 1, Ethiopian score: longing (Tizita), the road (Ambassel), joy (Tizita major), Aksum's triumph (Bati major). Tonic E.
window.SCORE = { tonic: 'E', bpm: 76, seed: 101,
  sections: [
    { from: 'L0-0.45', to: 'L1', qenet: 'tizita_minor', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.35 },
    { from: 'L1', to: 'L2', qenet: 'bati_minor', layers: ['drone', 'krar', 'kebero'], rhythm: 'slow', melody: 'masinqo', intensity: 0.5 },
    { from: 'L2', to: 'L3', qenet: 'ambassel', layers: ['begena', 'krar', 'kebero', 'tsenatsil'], rhythm: 'church', melody: 'washint', intensity: 0.55 },
    { from: 'L3', to: 'L5', qenet: 'ambassel', layers: ['drone', 'begena'], melody: 'masinqo', intensity: 0.45 },
    { from: 'L5', to: 'L6', qenet: 'tizita_major', layers: ['krar', 'kebero', 'tsenatsil'], rhythm: 'festive', melody: 'washint', intensity: 0.7 },
    { from: 'L6', to: 'END-6.2', qenet: 'bati_major', layers: ['drone', 'begena', 'krar', 'kebero', 'tsenatsil'], rhythm: 'church', melody: 'masinqo', intensity: 0.85 },
    { from: 'END-6.2', to: 'END', qenet: 'tizita_major', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.45 },
  ],
  risers: [{ t: 'W4:jesus', length: 2.2, gain: 0.5 }],
  hits: [{ t: 'W6:christian', gain: 0.6 }],
  whooshes: [{ t: 'L1+0.2' }, { t: 'L2+0.2' }, { t: 'W5:home' }, { t: 'L5e' }, { t: 'END-6.2' }],
}
