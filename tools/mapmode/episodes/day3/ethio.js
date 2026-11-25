// Day 3, Ethiopian score: memory (Tizita), the journey (Bati), the pit (Ambassel), the rescue (Tizita), the fall (Ambassel, driving), the promise (Tizita major). Tonic E.
window.SCORE = { tonic: 'E', bpm: 74, seed: 303,
  sections: [
    { from: 'L0-0.45', to: 'L2', qenet: 'tizita_minor', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.35 },
    { from: 'L2', to: 'L3', qenet: 'bati_minor', layers: ['krar', 'kebero', 'tsenatsil'], rhythm: 'church', melody: 'masinqo', intensity: 0.55 },
    { from: 'L3', to: 'L4', qenet: 'ambassel', layers: ['drone', 'begena', 'kebero'], rhythm: 'heart', melody: 'masinqo', intensity: 0.5 },
    { from: 'L4', to: 'L5', qenet: 'tizita_minor', layers: ['begena', 'krar'], melody: 'washint', intensity: 0.6 },
    { from: 'L5', to: 'W5:god', qenet: 'ambassel', layers: ['drone', 'krar', 'kebero', 'tsenatsil'], rhythm: 'festive', intensity: 0.95 },
    { from: 'W5:god', to: 'END-6.2', qenet: 'tizita_major', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.6 },
    { from: 'END-6.2', to: 'END', qenet: 'tizita_major', layers: ['drone', 'begena'], melody: 'washint', intensity: 0.45 },
  ],
  risers: [{ t: 'W4:out', length: 2.0, gain: 0.5 }, { t: 'L5', length: 1.8, gain: 0.6 }],
  hits: [{ t: 'W4:out', gain: 0.4 }, { t: 'W5:burned', gain: 0.9 }],
  whooshes: [{ t: 'L2' }, { t: 'L3+0.4' }, { t: 'L5-0.2' }, { t: 'END-6.2' }],
}
