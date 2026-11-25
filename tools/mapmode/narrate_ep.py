# narrate_ep.py <episode>: voices every line with ElevenLabs (Daniel), keeps word timings, lays the
# lines on one timeline, writes episodes/<ep>/voice.wav and timing.js. The key comes from the proxy.
import json, subprocess, base64, urllib.request, os, sys
EP = sys.argv[1]; D = f'episodes/{EP}'
VOICE = 'onwK4e9ZLuTAKqWW03F9'
S = json.loads(subprocess.check_output(['node', '-e', f"global.window={{}}; require('./{D}/story.js'); console.log(JSON.stringify(window.STORY))"]))
spoken, caps = S['spoken'], S['captions']
LEAD, GAP, TAIL = 0.45, 0.32, 8.0
os.makedirs(f'{D}/voice', exist_ok=True)
t = LEAD; lines = []; parts = []
for i, line in enumerate(spoken):
    mp3 = f'{D}/voice/line{i}.mp3'; aln = f'{D}/voice/line{i}.json'
    if not os.path.exists(aln):   # never pay twice for the same line
        body = {'text': line, 'model_id': 'eleven_multilingual_v2',
                'voice_settings': {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.25, 'use_speaker_boost': True},
                'previous_text': ' '.join(spoken[:i])[-300:] or None, 'next_text': ' '.join(spoken[i + 1:])[:300] or None}
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128',
                                     data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
        d = json.load(urllib.request.urlopen(req, timeout=120))
        open(mp3, 'wb').write(base64.b64decode(d['audio_base64'])); json.dump(d['alignment'], open(aln, 'w'))
    al = json.load(open(aln))
    words, cur = [], None
    for c, a, b in zip(al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']):
        if c.isspace():
            if cur: words.append(cur); cur = None
        elif cur is None: cur = [a, b]
        else: cur[1] = b
    if cur: words.append(cur)
    cw = caps[i].split(' ')
    assert len(words) == len(cw), (EP, i, len(words), len(cw))
    end = words[-1][1]
    lines.append({'t0': round(t, 3), 't1': round(t + end, 3), 'words': [{'w': w, 't0': round(t + a, 3), 't1': round(t + b, 3)} for w, (a, b) in zip(cw, words)]})
    parts.append((t, mp3)); print(f'{EP} line {i}: {end:.2f}s')
    t += end + GAP
duration = round(lines[-1]['t1'] + TAIL, 3)
open(f'{D}/timing.js', 'w', encoding='utf-8').write('window.TIMING = ' + json.dumps({'duration': duration, 'lines': lines}) + '\n')
inputs, filt = [], []
for k, (start, mp3) in enumerate(parts):
    inputs += ['-i', mp3]; filt.append(f'[{k}:a]aresample=48000,adelay={int(start*1000)}|{int(start*1000)}[a{k}]')
filt.append(''.join(f'[a{k}]' for k in range(len(parts))) + f'amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{duration}[out]')
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', ';'.join(filt), '-map', '[out]', '-ac', '1', f'{D}/voice.wav'])
print(EP, 'duration', duration)
