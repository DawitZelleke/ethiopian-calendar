# music_ethio.py <score.json> <out.wav>
# Ethiopian-flavoured score: begena (buzzing prayer lyre), krar (lyre), masinqo (one-string fiddle),
# washint (flute), kebero (church drum) and tsenatsil (sistrum), in the qenet modes Tizita, Bati and
# Ambassel. Melodies answer the narrator: they bloom in his pauses and step back while he speaks.
import json, sys, math, wave
import numpy as np

SR = 44100
spec = json.load(open(sys.argv[1]))
DUR = spec['duration']; N = int(SR * DUR)
rng = np.random.default_rng(spec.get('seed', 5))
NOTES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
TONIC = 48 + NOTES[spec.get('tonic', 'E')]          # tonic in octave 3
QENET = {'tizita_major': [0, 2, 4, 7, 9], 'tizita_minor': [0, 2, 3, 7, 8], 'bati_major': [0, 4, 5, 7, 11],
         'bati_minor': [0, 3, 5, 7, 10], 'ambassel': [0, 1, 5, 7, 8]}
BEAT = 60 / spec['bpm']
SPEECH = spec.get('speech', [])
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

def speaking(t): return any(a - 0.15 <= t <= b + 0.1 for a, b in SPEECH)
def fft_filter(x, shape):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * shape(f), len(x))
lowpass = lambda f, fc, o=2: 1 / np.sqrt(1 + (f / fc) ** (2 * o))
highpass = lambda f, fc, o=2: 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * o))
bell = lambda f, fc, w: np.exp(-((f - fc) / w) ** 2)

L = np.zeros(N); R = np.zeros(N)
def add(start, sig, pan=0.0, gain=1.0):
    i0 = int(start * SR); i1 = min(N, i0 + len(sig))
    if i0 < 0 or i1 <= i0: return
    gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    L[i0:i1] += sig[:i1 - i0] * gain * gl; R[i0:i1] += sig[:i1 - i0] * gain * gr

def scale_notes(q, lo, hi):
    out = []
    for octv in range(-2, 4):
        for s in QENET[q]:
            m = TONIC + 12 * octv + s
            if lo <= m <= hi: out.append(m)
    return sorted(out)

# ---------------- instruments ----------------
def ks(f, dur, decay=0.996, bright=4000):
    P = max(2, int(SR / f)); n = int(dur * SR)
    buf = fft_filter(rng.uniform(-1, 1, P * 4), lambda fr: lowpass(fr, bright))[:P]
    out = np.zeros(n); out[:P] = buf
    for i in range(P, n, P):
        prev = out[i - P:i]; blk = decay * 0.5 * (prev + np.roll(prev, 1)); out[i:i + P] = blk[:min(P, n - i)]
    return out / (np.abs(out).max() + 1e-9)

def begena(m, start, gain):
    # low lyre whose strings rattle against leather: the buzz is its voice
    s = ks(mtof(m), 4.0, 0.9985, 2500) * np.exp(-np.arange(int(4.0 * SR)) / SR * 0.9)
    buzz = fft_filter(np.clip(s * 9, -1, 1), lambda f: highpass(f, 1400) * lowpass(f, 5000)) * 0.22
    add(start, (s + buzz * np.abs(s) ** 0.5), float(rng.uniform(-0.2, 0.2)), gain)

def krar(m, start, gain):
    s = ks(mtof(m), 1.8, 0.994, 6500) * np.exp(-np.arange(int(1.8 * SR)) / SR * 2.2)
    add(start, s, float(rng.uniform(-0.6, 0.6)), gain)

def glide_curve(notes, start, end, port=0.09):
    """pitch curve (Hz per sample) through (t, midi) notes with short slides between them"""
    n = int((end - start) * SR); tt = start + np.arange(n) / SR; f = np.zeros(n)
    times = [t for t, _ in notes] + [end]
    for k, (t0, m) in enumerate(notes):
        a = int((t0 - start) * SR); b = int((times[k + 1] - start) * SR); f[a:b] = mtof(m)
        if k and port > 0:
            p = min(b - a, int(port * SR)); f[a:a + p] = np.linspace(mtof(notes[k - 1][1]), mtof(m), p)
    f[f == 0] = mtof(notes[0][1])
    return tt, f

def masinqo(phrase, gain):
    # bowed single horsehair string: nasal, wide vibrato, sliding between notes
    start, end = phrase[0][0], phrase[-1][0] + phrase[-1][2]
    tt, f = glide_curve([(t, m) for t, m, d in phrase], start, end, 0.11)
    vib = 1 + 0.011 * np.sin(2 * np.pi * 6.0 * tt) * np.minimum(1, (tt - start) / 0.4)
    ph = np.cumsum(f * vib) / SR; s = 2 * (ph % 1) - 1
    s = fft_filter(s, lambda fr: (bell(fr, 900, 380) + 0.8 * bell(fr, 1500, 500) + 0.3 * lowpass(fr, 600)) * lowpass(fr, 3500, 3))
    e = np.zeros_like(s)
    for t0, m, d in phrase:
        a = int((t0 - start) * SR); b = min(len(e), int((t0 + d - start) * SR)); x = np.linspace(0, 1, max(1, b - a))
        e[a:b] = np.maximum(e[a:b], np.sin(np.pi * np.minimum(1, x * 1.15)) ** 0.6)
    add(start, s * e / (np.abs(s).max() + 1e-9), -0.25, gain)

def washint(phrase, gain):
    # end-blown bamboo flute: airy, with a quick grace note into each long tone
    notes = []
    for t0, m, d in phrase:
        if d > 0.35 and rng.random() < 0.6:
            up = m + (2 if rng.random() < 0.5 else 3); notes.append((t0, up, 0.07)); notes.append((t0 + 0.07, m, d - 0.07))
        else: notes.append((t0, m, d))
    start, end = notes[0][0], notes[-1][0] + notes[-1][2]
    tt, f = glide_curve([(t, m) for t, m, d in notes], start, end, 0.04)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * tt)
    ph = np.cumsum(f * vib) / SR
    tone = np.sin(2 * np.pi * ph) + 0.22 * np.sin(4 * np.pi * ph) + 0.08 * np.sin(6 * np.pi * ph)
    breath = fft_filter(rng.standard_normal(len(tt)), lambda fr: bell(fr, 2200, 1400)) * 0.16
    e = np.zeros(len(tt))
    for t0, m, d in notes:
        a = int((t0 - start) * SR); b = min(len(e), int((t0 + d - start) * SR)); x = np.linspace(0, 1, max(1, b - a))
        e[a:b] = np.maximum(e[a:b], np.minimum(1, x * 6) * (1 - 0.35 * x))
    add(start, (tone + breath) * e * 0.5, 0.3, gain)

def kebero(start, kind, gain):
    if kind == 'dum':
        n = int(0.9 * SR); tt = np.arange(n) / SR; fr = 58 + 55 * np.exp(-tt * 14)
        body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 5.0)
        skin = fft_filter(rng.standard_normal(n), lambda f: lowpass(f, 1200) * highpass(f, 150)) * np.exp(-tt * 28) * 0.3
        add(start, body + skin, -0.05, gain)
    else:  # 'ta': the smaller head, struck with the palm
        n = int(0.35 * SR); tt = np.arange(n) / SR; fr = 170 + 90 * np.exp(-tt * 30)
        body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 14)
        slap = fft_filter(rng.standard_normal(n), lambda f: bell(f, 1800, 900)) * np.exp(-tt * 40) * 0.45
        add(start, (body * 0.7 + slap), 0.15, gain * 0.8)

def tsenatsil(start, gain):
    # sistrum: loose metal discs shaken on a frame, a bright shimmering rattle
    n = int(0.45 * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for k in range(3):
        off = int((k * 0.035 + rng.uniform(0, 0.01)) * SR)
        for fr in (3150, 4230, 5480, 6710, 8020, 9350):
            fr *= rng.uniform(0.97, 1.03); part = np.sin(2 * np.pi * fr * tt[:n - off] + rng.random() * 6) * np.exp(-tt[:n - off] * rng.uniform(14, 26))
            s[off:] += part * (0.5 if k else 1.0)
    noise = fft_filter(rng.standard_normal(n), lambda f: highpass(f, 4000)) * np.exp(-tt * 30) * 0.4
    add(start, (s / 6 + noise) * 0.5, 0.45, gain)

def drone(start, end, gain):
    n = int((end - start + 2) * SR); tt = np.arange(n) / SR
    s = 0.6 * np.sin(2 * np.pi * mtof(TONIC - 12) * tt) + 0.3 * np.sin(2 * np.pi * mtof(TONIC - 5) * tt) + 0.2 * np.sin(2 * np.pi * mtof(TONIC) * tt)
    s *= (0.85 + 0.15 * np.sin(2 * np.pi * tt / 6.5)) * np.minimum(1, np.minimum(tt / 2.0, (n / SR - tt) / 2.0))
    add(start, s, 0, gain)

def boom(start, gain=1.0):
    n = int(4.0 * SR); tt = np.arange(n) / SR; fr = 40 + 60 * np.exp(-tt * 9)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 1.6)
    noise = fft_filter(rng.standard_normal(n), lambda f: lowpass(f, 1600) * highpass(f, 60)) * np.exp(-tt * 9) * 0.3
    add(start, (body + noise) * 0.8, 0, gain)

def riser(end, length=2.0, gain=1.0):
    n = int(length * SR); x = np.arange(n) / n; noise = rng.standard_normal(n); out = np.zeros(n); hop = 2048
    for i in range(0, n, hop):
        seg = noise[i:i + hop * 2]; fc = 300 + 5000 * (i / n) ** 2
        out[i:i + len(seg)] += fft_filter(seg, lambda f: bell(f, fc, fc * 0.6)) * np.hanning(len(seg))
    add(end - length, out * x ** 2.2 * 0.35, 0, gain)

def whoosh(t0, length=1.6, gain=1.0):
    n = int(length * SR); x = np.arange(n) / n
    s = fft_filter(rng.standard_normal(n), lambda f: np.exp(-((np.log(np.maximum(f, 1)) - np.log(900)) / 0.9) ** 2)) * np.sin(np.pi * x) ** 2 * 0.2
    add(t0, s, -0.3, gain); add(t0 + 0.05, s, 0.3, gain * 0.8)

# ---------------- composing ----------------
def phrase_notes(q, start, length, lo, hi, step_beats=1.0):
    """a stepwise pentatonic phrase that ends on the tonic or the fifth, long notes at phrase ends"""
    sc = scale_notes(q, lo, hi); i = int(rng.integers(len(sc) // 3, 2 * len(sc) // 3)); t = start; out = []
    while t < start + length - 0.3:
        d = BEAT * step_beats * float(rng.choice([1, 1, 1, 2, 0.5]))
        if t + d > start + length: d = start + length - t
        out.append((t, sc[i], d)); t += d
        i = int(np.clip(i + rng.choice([-1, -1, 1, 1, -2, 2, 0]), 0, len(sc) - 1))
    # cadence: settle on the tonic (or its fifth) and hold
    targets = [m for m in sc if (m - TONIC) % 12 in (0, 7)]
    if out and targets:
        last = min(targets, key=lambda m: abs(m - out[-1][1])); t0 = out[-1][0]; out[-1] = (t0, last, max(out[-1][2], BEAT * 1.5))
    return out

for sec in spec['sections']:
    t0, t1, q = sec['t0'], sec['t1'], sec['qenet']; lay = sec.get('layers', []); inten = sec.get('intensity', 0.5)
    if 'drone' in lay: drone(t0, t1, 0.10 + 0.06 * inten)
    if 'begena' in lay:   # slow prayerful arpeggio on the low strings
        sc = scale_notes(q, TONIC - 12, TONIC + 7); t = t0; k = 0
        while t < t1 - 0.2:
            m = sc[[0, 2, 1, 3, 0, 4, 2, 1][k % 8] % len(sc)]
            begena(m, t, (0.22 + 0.1 * inten) * (0.75 if speaking(t) else 1.0)); t += BEAT * sec.get('begenaBeats', 2); k += 1
    if 'krar' in lay:     # a repeating riff, the heartbeat of a song
        sc = scale_notes(q, TONIC + 7, TONIC + 24); riff = [sc[i % len(sc)] for i in rng.choice(len(sc), 4, replace=False)]
        t = t0; k = 0
        while t < t1 - 0.1:
            if not (speaking(t) and k % 2): krar(riff[k % 4] + (12 if k % 8 == 7 else 0), t, (0.10 + 0.08 * inten) * (0.6 if speaking(t) else 1.0))
            t += BEAT / 2; k += 1
    if 'kebero' in lay:
        rhythm = sec.get('rhythm', 'church')
        pat = {'church': [('dum', 0), ('ta', 1), ('dum', 2), ('dum', 2.5), ('ta', 3)], 'festive': [('dum', 0), ('ta', 0.5), ('ta', 1), ('dum', 1.5), ('ta', 2), ('dum', 2.5), ('ta', 3), ('ta', 3.5)],
               'slow': [('dum', 0), ('dum', 2)], 'heart': [('dum', 0), ('dum', 0.45)]}[rhythm]
        bar = t0
        while bar < t1 - 0.1:
            for kind, b in pat:
                st = bar + b * BEAT
                if st < t1: kebero(st, kind, 0.30 + 0.4 * inten)
            bar += 4 * BEAT
    if 'tsenatsil' in lay:
        t = t0 + BEAT
        while t < t1 - 0.1:
            tsenatsil(t, 0.10 + 0.12 * inten); t += BEAT * (2 if sec.get('rhythm') != 'festive' else 1)
    # melody: phrases bloom in the narrator's pauses, and murmur quietly while he speaks
    voice = sec.get('melody')
    if voice:
        inst = masinqo if voice == 'masinqo' else washint
        lo, hi = (TONIC, TONIC + 19) if voice == 'masinqo' else (TONIC + 12, TONIC + 31)
        gaps = [(b, a2) for (a, b), (a2, b2) in zip(SPEECH, SPEECH[1:]) if t0 - 0.5 <= b <= t1] + ([(SPEECH[-1][1], t1)] if SPEECH and t0 <= SPEECH[-1][1] <= t1 else [])
        if t0 < (SPEECH[0][0] if SPEECH else t1): gaps.insert(0, (t0, SPEECH[0][0] if SPEECH else t1))
        for a, b in gaps:
            length = min(max(1.6, b - a + 1.0), 4.5)
            ph = phrase_notes(q, a + 0.05, length, lo, hi, 0.75 if voice == 'washint' else 1.0)
            if ph: inst(ph, 0.28 + 0.1 * inten)
        # under longer speech, a quiet sustained line keeps the colour without competing
        for k, (a, b) in enumerate(SPEECH):
            if k % 2 == 0 and b - a > 5.0 and t0 <= a <= t1 and sec.get('underSpeech', True):
                ph = phrase_notes(q, a + 1.5, min(b - a - 1.8, 4.0), lo - 5, hi - 7, 2.0)   # lower and slower than the voice
                if ph: inst(ph, 0.045 + 0.02 * inten)

for h in spec.get('hits', []): boom(h['t'], h.get('gain', 1.0))
for r in spec.get('risers', []): riser(r['t'], r.get('length', 2.0), r.get('gain', 1.0))
for w in spec.get('whooshes', []): whoosh(w['t'], w.get('length', 1.6), w.get('gain', 1.0))

# ---------------- mix ----------------
def reverb(x, seconds=2.8, seed=1):
    r = np.random.default_rng(seed); n = int(seconds * SR); tt = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-tt * 6.9 / seconds); ir[:int(0.015 * SR)] = 0
    ir = fft_filter(ir, lambda f: lowpass(f, 6000) * highpass(f, 150)); ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
mix = np.stack([L * 0.8 + reverb(L, seed=1) * 0.42, R * 0.8 + reverb(R, seed=2) * 0.42], 1)
tall = np.arange(N) / SR
mix *= np.clip(np.minimum(tall / 0.8, (DUR - tall) / 1.5), 0, 1)[:, None]
mix = np.tanh(mix * 1.5) / np.tanh(1.5); mix /= max(1e-9, np.abs(mix).max()) / 0.89
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ethio score written', sys.argv[2], f'{DUR:.1f}s')
