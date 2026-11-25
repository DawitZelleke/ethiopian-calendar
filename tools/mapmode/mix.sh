#!/bin/bash
# mix.sh <voice.wav> <music.wav> <out.wav>: music sits under the voice, rises in the pauses, final loudness -14 LUFS
set -e
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")
ffmpeg -v error -y -i "$1" -i "$2" -filter_complex "\
[0:a]aresample=48000,aformat=channel_layouts=mono,apad,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,pan=stereo|c0=c0|c1=c0[v];\
[v]asplit[vs][vm];\
[1:a]aresample=48000,volume=0.15[m];\
[m][vs]sidechaincompress=threshold=0.012:ratio=6:attack=35:release=500:makeup=1[md];\
[md][vm]amix=inputs=2:normalize=0:duration=first[x];[x]loudnorm=I=-14:TP=-1.5:LRA=11[out]" -map "[out]" -ar 48000 -t "$D" "$3"
