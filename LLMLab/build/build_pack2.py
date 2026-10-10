"""Adds full-vocabulary logits (fine precision) to lab-data.js.
Stores (max - logit) in uint16 steps of 0.001, so softmax is exact to ~0.1 percent.
Keys: the five presets, plus 'The banker left the bank and' + each of GPT-2's 15 likeliest next words."""
import sys, json, base64, numpy as np
sys.path.insert(0, '/home/claude/lab/exp')
from gpt2np import *
SRC = '/home/claude/lab/LLMLab-v1/data/lab-data.js'
OUT = '/home/claude/lab/LLMLab2/data/lab-data.js'
s = open(SRC).read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
def pack(ids):
    L = forward(ids)['logits'][-1].astype(np.float64)
    m = float(L.max()); q = np.round((m - L) / 0.001)
    assert q.max() < 65535, ('range too big', q.max() * 0.001)
    return {'m': round(m, 3), 'd': b64(q.astype('<u2'))}, float(m - L.min())
full = {}; spread = 0
for k, e in d['examples'].items():
    p, sp = pack(e['ids']); full[','.join(map(str, e['ids']))] = p; spread = max(spread, sp)
base = d['examples']['banker']['ids']
tops = np.argsort(-forward(base)['logits'][-1])[:15].tolist()
for t in tops:
    p, sp = pack(base + [t]); full[','.join(map(str, base + [t]))] = p; spread = max(spread, sp)
d['full'] = full
for e in d['examples'].values(): e.pop('fullLogits', None)
open(OUT, 'w').write('window.LAB=' + json.dumps(d, separators=(',', ':')) + ';')
import os
print('keys', len(full), 'max spread', round(spread, 2), 'bytes', os.path.getsize(OUT))
# accuracy check against float64 softmax
ids = base; L = forward(ids)['logits'][-1].astype(np.float64); P = np.exp(L - L.max()); P /= P.sum()
p = full[','.join(map(str, ids))]; q = np.frombuffer(base64.b64decode(p['d']), '<u2').astype(np.float64)
L2 = -q * 0.001; P2 = np.exp(L2 - L2.max()); P2 /= P2.sum()
o = np.argsort(-P)[:5]; print([(decode([i]), round(P[i] * 100, 3), round(P2[i] * 100, 3)) for i in o])
