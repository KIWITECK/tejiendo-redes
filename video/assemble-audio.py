# Coloca cada trozo de narración en su instante exacto y normaliza el volumen: hf/assets/narration.wav
import json, wave, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
sched = json.load(open(f'{here}/audio/schedule.json'))
RATE = 24000
total = sched[-1]['start'] + sched[-1]['times'][-1] + sched[-1]['durs'][-1] + 6
buf = bytearray(int(total * RATE) * 2)
missing = 0
for sc in sched:
    for i, t in enumerate(sc['times']):
        p = f"{here}/audio/{sc['id']}-{i}.wav"
        if not os.path.exists(p): missing += 1; continue
        with wave.open(p) as w:
            assert w.getframerate() == RATE and w.getnchannels() == 1 and w.getsampwidth() == 2, p
            data = w.readframes(w.getnframes())
        off = int((sc['start'] + t) * RATE) * 2
        buf[off:off + len(data)] = data[:len(buf) - off]
raw = f'{here}/audio/narration_raw.wav'
with wave.open(raw, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(RATE); w.writeframes(bytes(buf))
os.makedirs(f'{here}/hf/assets', exist_ok=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', f'{here}/hf/assets/narration.wav'], check=True)
print('narración lista; trozos faltantes:', missing)
