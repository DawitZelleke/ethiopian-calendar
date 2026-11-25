# music.py <score.json> <out.wav>
# A small film-score synthesizer. The score is a list of sections (chords, intensity, which
# instruments play) placed on the narration's timeline, plus hits, risers and a final cadence.
# Everything is generated here, so there is nothing to license.
import json, sys, math
import numpy as np

SR = 44100
spec = json.load(open(sys.argv[1]))
DUR = spec['duration']; N = int(SR * DUR)
rng = np.random.default_rng(spec.get('seed', 7))
t_all = np.arange(N) / SR

MODES = {'aeolian': [0, 2, 3, 5, 7, 8, 10], 'dorian': [0, 2, 3, 5, 7, 9, 10], 'phrygian': [0, 1, 3, 5, 7, 8, 10],
         'harmonic': [0, 2, 3, 5, 7, 8, 11], 'major': [0, 2, 4, 5, 7, 9, 11], 'mixolydian': [0, 2, 4, 5, 7, 9, 10]}
NOTES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
ROOT = 36 + NOTES[spec['key']]          # tonic in octave 2
SCALE = MODES[spec['mode']]
BEAT = 60 / spec['bpm']
ROMAN = {'i': 0, 'ii': 1, 'iii': 2, 'iv': 3, 'v': 4, 'vi': 5, 'vii': 6}

def chord(sym):
    """'i', 'VI', 'iv', 'V', 'I' (major tonic), 'sus' variants like 'isus' -> semitone offsets"""
    sus = sym.endswith('sus'); s = sym[:-3] if sus else sym
    deg = ROMAN[s.lower()]
    root = SCALE[deg]
    third = (SCALE[(deg + 2) % 7] - root) % 12
    fifth = (SCALE[(deg + 4) % 7] - root) % 12
    third = 4 if s.isupper() else 3       # case decides major or minor
    fifth = 7                              # always a perfect fifth: no accidental diminished/augmented chords
    if sus: third = 5
    return root, [0, third, fifth]

mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain; ai = min(n, int(a * SR)); ri = min(n, int(r * SR))
    if ai: e[:ai] = np.linspace(0, sustain, ai) ** 1.5
    if ri: e[-ri:] *= np.linspace(1, 0, ri) ** 1.2
    return e

def saw(freq, n, phase=0.0):
    p = (freq * np.arange(n) / SR + phase) % 1.0
    return 2 * p - 1

def fft_filter(x, shape):
    """apply a frequency response (function of Hz) to a mono signal"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); return np.fft.irfft(X * shape(f), len(x))

def lowpass(f, fc, order=2): return 1 / np.sqrt(1 + (f / fc) ** (2 * order))
def highpass(f, fc, order=2): return 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** (2 * order))

L = np.zeros(N); R = np.zeros(N)                  # dry stereo bus
strings_L = np.zeros(N); strings_R = np.zeros(N)  # filtered separately (dark, warm)
choir = np.zeros(N)

def add(buf, start, sig):
    i0 = int(start * SR); i1 = min(N, i0 + len(sig))
    if i1 > i0 and i0 >= 0: buf[i0:i1] += sig[:i1 - i0]

def place(sig, start, pan=0.0, gain=1.0):
    gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
    add(L, start, sig * gain * gl); add(R, start, sig * gain * gr)

# ---------------- instruments ----------------
def strings(notes, t0, t1, inten):
    n = int((t1 - t0 + 1.6) * SR)
    for k, m in enumerate(notes):
        f = mtof(m)
        for det, pan in ((-0.09, -0.55), (0.0, 0.0), (0.11, 0.55)):
            # a bowed string: gentle vibrato that settles in after the attack
            tt = np.arange(n) / SR; vib = 1 + 0.0035 * np.minimum(1, tt / 0.8) * np.sin(2 * np.pi * (5.0 + rng.random()) * tt + rng.random() * 6)
            ph = np.cumsum(f * 2 ** (det / 12) * vib) / SR + rng.random()
            v = (2 * (ph % 1) - 1) * env(n, 1.4, 1.6) * (0.10 + 0.10 * inten) / len(notes) ** 0.5
            gl, gr = math.cos((pan + 1) * math.pi / 4), math.sin((pan + 1) * math.pi / 4)
            add(strings_L, t0, v * gl); add(strings_R, t0, v * gr)

def choir_pad(notes, t0, t1, inten):
    n = int((t1 - t0 + 2.0) * SR); vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * np.arange(n) / SR)
    for m in notes:
        f = mtof(m) * vib; ph = np.cumsum(f) / SR
        add(choir, t0, (2 * (ph % 1) - 1) * env(n, 2.0, 2.0) * 0.12 * inten / len(notes) ** 0.5)

def drone(t0, t1, inten):
    n = int((t1 - t0 + 2) * SR); tt = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * mtof(ROOT - 12) * tt) * 0.5 + np.sin(2 * np.pi * mtof(ROOT) * tt) * 0.35 + np.sin(2 * np.pi * mtof(ROOT + 7) * tt) * 0.2)
    sig *= (0.85 + 0.15 * np.sin(2 * np.pi * tt / 7.0)) * env(n, 2.5, 2.5) * 0.16 * (0.6 + 0.4 * inten)
    place(sig, t0, 0, 1)

def pluck(m, start, gain, pan):
    f = mtof(m); P = max(2, int(SR / f)); n = int(2.6 * SR)
    buf = rng.uniform(-1, 1, P); buf = fft_filter(np.concatenate([buf] * 4), lambda fr: lowpass(fr, 4000))[:P]
    out = np.zeros(n); out[:P] = buf; decay = 0.996
    for i in range(P, n, P):
        prev = out[i - P:i]; blk = decay * 0.5 * (prev + np.roll(prev, 1)); out[i:i + P] = blk[:min(P, n - i)]
    out *= np.exp(-np.arange(n) / SR * 1.6)
    place(out * gain, start, pan)

def drum(start, kind, gain):
    if kind == 'dum':
        n = int(0.7 * SR); tt = np.arange(n) / SR; fr = 46 + 70 * np.exp(-tt * 18)
        body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 6.5)
        skin = fft_filter(rng.standard_normal(n), lambda f: lowpass(f, 900) * highpass(f, 120)) * np.exp(-tt * 30) * 0.25
        place((body + skin) * gain, start, -0.1)
    else:   # 'tek': a slap on the rim
        n = int(0.2 * SR); tt = np.arange(n) / SR
        s = fft_filter(rng.standard_normal(n), lambda f: np.exp(-((f - 3200) / 1600) ** 2)) * np.exp(-tt * 45)
        place(s * gain * 0.55, start, 0.25)

def boom(start, gain=1.0):
    n = int(4.0 * SR); tt = np.arange(n) / SR; fr = 38 + 60 * np.exp(-tt * 9)
    body = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 1.6)
    noise = fft_filter(rng.standard_normal(n), lambda f: lowpass(f, 1800) * highpass(f, 60)) * np.exp(-tt * 9) * 0.35
    place((body + noise) * 0.9 * gain, start, 0)

def riser(end, length=2.2, gain=1.0):
    n = int(length * SR); tt = np.arange(n) / SR; x = tt / length
    noise = rng.standard_normal(n); out = np.zeros(n); hop = 2048
    for i in range(0, n, hop):   # sweep a band upward, chunk by chunk
        seg = noise[i:i + hop * 2]; fc = 300 + 5000 * (i / n) ** 2
        out[i:i + len(seg)] += fft_filter(seg, lambda f: np.exp(-((f - fc) / (fc * 0.6)) ** 2)) * np.hanning(len(seg))
    out *= x ** 2.2 * 0.45 * gain
    glide = np.sin(2 * np.pi * np.cumsum(mtof(ROOT + 12) * (1 + x)) / SR) * x ** 3 * 0.12 * gain
    place(out + glide, end - length, 0)

def pulse(notes_root, t0, t1, inten):
    # low ostinato in eighths: tension under the story
    k = 0; t = t0
    while t < t1:
        n = int(0.32 * SR); tt = np.arange(n) / SR
        m = notes_root + (12 if k % 4 == 3 else 0)
        s = fft_filter(saw(mtof(m), n), lambda f: lowpass(f, 650, 3)) * np.exp(-tt * 9)
        place(s * (0.20 + 0.15 * inten) * (1.0 if k % 2 == 0 else 0.7), t, -0.3 if k % 2 else 0.3)
        t += BEAT / 2; k += 1

# ---------------- the score ----------------
def melody_notes(root_off, triad, bars, density):
    """arpeggiated lyre lines over a chord, with the odd scale step between, in octave 4-5"""
    base = ROOT + 24 + root_off; tones = [base + x for x in triad] + [base + 12 + triad[0], base + 12 + triad[1]]
    scale_tones = [ROOT + 24 + s for s in SCALE] + [ROOT + 36 + s for s in SCALE]
    out = []
    for b in range(bars):
        patt = rng.choice([[0, 1, 2, 3], [0, 2, 1, 3], [0, 1, 2, 4], [2, 1, 0, 1], [0, 2, 3, 2]])
        for i, step in enumerate(patt):
            if rng.random() > density: continue
            m = tones[step % len(tones)]
            if rng.random() < 0.18:  # passing tone
                cands = [s for s in scale_tones if abs(s - m) <= 2 and s != m]
                if cands: m = int(rng.choice(cands))
            out.append((b * 4 + i, m))
    return out

for sec in spec['sections']:
    t0, t1 = sec['t0'], sec['t1']; inten = sec.get('intensity', 0.5); layers = sec.get('layers', [])
    chords = sec.get('chords', ['i']); per = sec.get('beatsPerChord', 4) * BEAT
    # chords cycle through the section
    t = t0; ci = 0
    while t < t1 - 0.05:
        sym = chords[ci % len(chords)]; off, triad = chord(sym); end = min(t1, t + per)
        voicing = [ROOT + 12 + off + triad[0], ROOT + 12 + off + triad[1] + (12 if triad[1] < 5 else 0), ROOT + 12 + off + triad[2], ROOT + 24 + off + triad[0]]
        if 'strings' in layers: strings(voicing + [ROOT + off], t, end, inten)
        if 'choir' in layers: choir_pad([ROOT + 24 + off + triad[0], ROOT + 24 + off + triad[1], ROOT + 24 + off + triad[2]], t, end, inten)
        if 'pluck' in layers:
            for beat, m in melody_notes(off, triad, max(1, int(round((end - t) / (4 * BEAT)))), sec.get('density', 0.7)):
                st = t + beat * BEAT
                if st < end: pluck(m, st, 0.16 + 0.1 * inten, float(rng.uniform(-0.5, 0.5)))
        if 'pulse' in layers: pulse(ROOT + off, t, end, inten)
        t = end; ci += 1
    if 'drone' in layers: drone(t0, t1, inten)
    if 'drum' in layers:
        patt = sec.get('drumPattern', 'proc')
        pat = {'proc': [('dum', 0), ('dum', 1.5), ('tek', 2), ('tek', 3.5)], 'heart': [('dum', 0), ('dum', 0.5)],
               'war': [('dum', 0), ('tek', 1), ('dum', 1.5), ('dum', 2), ('tek', 3), ('tek', 3.5)]}[patt]
        bar = t0
        while bar < t1 - 0.05:
            for kind, b in pat:
                st = bar + b * BEAT
                if st < t1: drum(st, kind, (0.35 + 0.45 * inten) * (1.0 if kind == 'dum' else 0.8))
            bar += 4 * BEAT
for h in spec.get('hits', []): boom(h['t'], h.get('gain', 1.0))
for r in spec.get('risers', []): riser(r['t'], r.get('length', 2.2), r.get('gain', 1.0))
def whoosh(t0, length=1.6, gain=1.0):
    # air moving past the camera on a big move
    n = int(length * SR); x = np.arange(n) / n
    s = fft_filter(rng.standard_normal(n), lambda f: np.exp(-((np.log(np.maximum(f, 1)) - np.log(900)) / 0.9) ** 2))
    pan = np.sin(np.pi * x) * 0.0
    sig = s * np.sin(np.pi * x) ** 2 * 0.22 * gain
    add(L, t0, sig * (1 - 0.4 * x)); add(R, t0, sig * (0.6 + 0.4 * x))
for wt in spec.get('whooshes', []): whoosh(wt['t'], wt.get('length', 1.6), wt.get('gain', 1.0))

# ---------------- mix ----------------
warm = lambda f: lowpass(f, spec.get('stringsCutoff', 1700), 3) * highpass(f, 55)
strings_L = fft_filter(strings_L, warm); strings_R = fft_filter(strings_R, warm)
# 'aah' formants for the choir
form = lambda f: (np.exp(-((f - 730) / 160) ** 2) + 0.7 * np.exp(-((f - 1090) / 180) ** 2) + 0.35 * np.exp(-((f - 2440) / 300) ** 2) + 0.15 * lowpass(f, 500))
choir_f = fft_filter(choir, form) * 2.2
L += strings_L + choir_f * 0.9; R += strings_R + choir_f * 1.1

def reverb(x, seconds=3.2, seed=1):
    r = np.random.default_rng(seed); n = int(seconds * SR); tt = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-tt * 6.9 / seconds); ir[:int(0.012 * SR)] = 0
    ir = fft_filter(ir, lambda f: lowpass(f, 5000) * highpass(f, 120)); ir /= np.sqrt((ir ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:len(x)]
wetL, wetR = reverb(L, seed=1), reverb(R, seed=2)
mix = np.stack([L * 0.75 + wetL * 0.55, R * 0.75 + wetR * 0.55], 1)
fade = np.minimum(1, np.minimum(t_all / 0.8, (DUR - t_all) / 1.5)).clip(0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix /= max(1e-9, np.abs(mix).max()) / 0.89
pcm = (mix * 32767).astype(np.int16)
import wave
with wave.open(sys.argv[2], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('score written', sys.argv[2], f'{DUR:.1f}s')
