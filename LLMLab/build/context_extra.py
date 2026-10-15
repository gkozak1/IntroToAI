import json, numpy as np, sys
sys.path.insert(0, '.')
src = open('pre.py').read()
exec(src.split('# --- meaning ---')[0].split('out = {')[0])  # imports, I, norm, i8
exec(open('sents.py').read().split("allS =")[0])
from g2 import forward, ln, W
def tokvecs(text, word, which=-1):
    d = I[text]; r = forward(d['ids']); idx = [i for i, t in enumerate(d['toks']) if t == word]; i = idx[which]
    return np.stack([norm(r['h'][b][i]) for b in range(13)]), i, d['toks']
def refset(name, word): return np.stack([tokvecs(s, word)[0] for s in REF[name]])
def score(vecs, A, B):
    s = []
    for b in range(13):
        ma, mb = A[:, b].mean(0), B[:, b].mean(0); dd = ma - mb; mid = (ma + mb) / 2; den = (dd @ dd) / 2
        s.append(((vecs[..., b, :] - mid) @ dd) / den)
    return np.array(s)
out = {}
d = I['The banker left the bank and']; r = forward(d['ids'])
E = W['wte.weight']
lnf = [ln(r['h'][b][-1], W['ln_f.weight'], W['ln_f.bias']) for b in range(13)]
out['lnf'] = [[round(float(x), 3) for x in v] for v in lnf]
def top(z, k=10):
    t = np.argsort(-z)[:k]; return [[int(i), round(float(z[i]), 3)] for i in t]
out['lg'] = [top(v @ E.T) for v in lnf]
out['lgA'] = [top(ln(r['h'][b][-1] + r['attn'][b][-1], W['ln_f.weight'], W['ln_f.bias']) @ E.T) for b in range(12)]
z = lnf[12] @ E.T; p = np.exp(z - z.max()); p /= p.sum()
out['final'] = [[int(i), round(float(z[i]), 3), round(float(p[i]), 5)] for i in np.argsort(-z)[:10]]
out['dots'] = {}
for pid, word, a, b in [('bank1', ' bank', 'money', 'river'), ('left1', ' left', 'went', 'side'), ('bank2', ' bank', 'money', 'river')]:
    A, B = refset(a, word), refset(b, word)
    out['dots'][pid] = {'A': [[round(float(x), 3) for x in col] for col in score(A, A, B)], 'B': [[round(float(x), 3) for x in col] for col in score(B, A, B)]}
json.dump(out, open('extra.json', 'w'))
print(out['final'][:3], len(out['lnf']), np.array(out['dots']['bank1']['A']).shape)
