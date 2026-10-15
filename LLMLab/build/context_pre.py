import json, numpy as np, base64, sys
sys.path.insert(0, '.')
from g2 import forward, lens, W
exec(open('sents.py').read().split("allS =")[0])
I = {x['t']: x for x in json.load(open('i2.json'))}
def norm(v): v = v - v.mean(-1, keepdims=True); return v / (v.std(-1, keepdims=True) + 1e-6)
def i8(a):  # values already standardized; keep -3..3
    q = np.clip(np.round(a / 3 * 127), -127, 127).astype(np.int8); return base64.b64encode(q.tobytes()).decode()
out = {'stack': {}, 'meaning': []}
for key, text in EX.items():
    d = I[text]; r = forward(d['ids']); T = len(d['ids'])
    L = []
    for b in range(13):
        p = lens(r['h'][b][-1]); top = np.argsort(-p)[:50]; L.append([[int(i), round(float(p[i]), 6)] for i in top])
    ch = []
    for b in range(12):
        hb = r['h'][b]; n0 = np.linalg.norm(hb, axis=-1)
        ch.append([[round(float(np.linalg.norm(r['attn'][b][t]) / n0[t]), 3), round(float(np.linalg.norm(r['mlp'][b][t]) / np.linalg.norm(hb[t] + r['attn'][b][t])), 3)] for t in range(T)])
    vec = np.stack([norm(r['h'][b]) for b in range(13)])  # 13 x T x 768
    out['stack'][key] = {'toks': d['toks'], 'ids': d['ids'], 'lens': L, 'change': ch, 'vec': i8(vec)}
    print(key, [NTt for NTt in [L[b][0] for b in (0, 4, 8, 12)]])
# --- meaning ---
def tokvecs(text, word, which=-1):
    d = I[text]; r = forward(d['ids']); idx = [i for i, t in enumerate(d['toks']) if t == word]; i = idx[which]
    return np.stack([norm(r['h'][b][i]) for b in range(13)]), i, d['toks']
def refset(name, word): return np.stack([tokvecs(s, word)[0] for s in REF[name]])  # n x 13 x 768
def score(vecs, A, B):
    s = []
    for b in range(13):
        ma, mb = A[:, b].mean(0), B[:, b].mean(0); dd = ma - mb; mid = (ma + mb) / 2; den = (dd @ dd) / 2
        s.append(((vecs[..., b, :] - mid) @ dd) / den)
    return np.array(s)
def pair(pid, label, word, nameA, nameB, labA, labB, t1, t2):
    A, B = refset(nameA, word), refset(nameB, word)
    v1, p1, k1 = tokvecs(t1[0], word, t1[1]); v2, p2, k2 = tokvecs(t2[0], word, t2[1])
    s1 = score(v1, A, B); s2 = score(v2, A, B); sA = score(A, A, B); sB = score(B, A, B)
    o = {'id': pid, 'label': label, 'word': word.strip(), 'senseA': labA, 'senseB': labB,
         't1': {'text': t1[0], 'toks': k1, 'pos': int(p1), 'note': t1[2]}, 't2': {'text': t2[0], 'toks': k2, 'pos': int(p2), 'note': t2[2]},
         's1': [round(float(x), 3) for x in s1], 's2': [round(float(x), 3) for x in s2],
         'bandA': [[round(float(x.min()), 3), round(float(x.max()), 3)] for x in sA], 'bandB': [[round(float(x.min()), 3), round(float(x.max()), 3)] for x in sB],
         'refA': REF[nameA], 'refB': REF[nameB], 'vec1': i8(v1), 'vec2': i8(v2)}
    out['meaning'].append(o); print(pid, 's1', o['s1']); print(pid, 's2', o['s2']); print('  bandA', o['bandA'][::3], 'bandB', o['bandB'][::3])
riv = EX['river']
pair('bank2', 'bank: two sentences', ' bank', 'money', 'river', 'money bank', 'river bank', [PAIRS[0][0], -1, 'money'], [PAIRS[0][1], -1, 'river'])
pair('bank1', 'bank: the banker sentence', ' bank', 'money', 'river', 'money bank', 'river bank', [riv, 0, 'money'], [riv, 1, 'river, but "river" comes later'])
pair('left1', 'left: the banker sentence', ' left', 'went', 'side', 'went away', 'direction / side', [riv, 0, 'went away'], [riv, 1, 'direction'])
json.dump(out, open('ctxdata.json', 'w'))
