// Day 2, Ethiopian score: a royal procession (Bati), the riddle (Ambassel), the tradition (Tizita), the dynasty (Bati major), awe (Tizita major). Tonic E.
window.SCORE = { tonic: 'E', bpm: 80, seed: 202,
  sections: [
    { from: 'L0-0.45', to: 'L1', qenet: 'bati_minor', layers: ['drone', 'krar', 'kebero', 'tsenatsil'], rhythm: 'church', melody: 'washint', intensity: 0.55 },
    { from: 'L1', to: 'L2', qenet: 'bati_minor', layers: ['krar', 'kebero', 'tsenatsil'], rhythm: 'festive', melody: 'masinqo', intensity: 0.75 },
    { from: 'L2', to: 'L3', qenet: 'ambassel', layers: ['drone', 'kebero'], rhythm: 'heart', melody: 'washint', intensity: 0.55 },
    { from: 'L3', to: 'L4', qenet: 'ambassel', layers: ['drone', 'begena'], melody: 'masinqo', intensity: 0.35 },
    { from: 'L4', to: 'L5', qenet: 'tizita_minor', layers: ['drone', 'begena', 'krar', 'kebero'], rhythm: 'church', melody: 'washint', intensity: 0.65 },
    { from: 'L5', to: 'L6', qenet: 'bati_major', layers: ['krar', 'kebero', 'tsenatsil'], rhythm: 'church', melody: 'masinqo', intensity: 0.75 },
    { from: 'L6', to: 'END-6.2', qenet: 'tizita_major', layers: ['drone', 'begena', 'tsenatsil'], rhythm: 'slow', melody: 'washint', intensity: 0.7 },
    { from: 'END-6.2', to: 'END', qenet: 'tizita_major', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.45 },
  ],
  risers: [{ t: 'W2:answered', length: 1.8, gain: 0.5 }, { t: 'L6', length: 2.0, gain: 0.5 }],
  hits: [{ t: 'W2:answered', gain: 0.5 }, { t: 'W6:greater', gain: 0.45 }],
  whooshes: [{ t: 'L2' }, { t: 'L3+0.2' }, { t: 'L4+0.2' }, { t: 'L6+0.2' }, { t: 'END-6.2' }],
}
