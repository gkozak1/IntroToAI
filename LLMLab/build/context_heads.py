import json, numpy as np, sys
sys.path.insert(0, '.')
from g2 import forward
D = json.load(open('i2.json'))
P = np.zeros((12, 12)); SELF = np.zeros((12, 12)); FIRST = np.zeros((12, 12)); DIST = np.zeros((12, 12)); N = 0
for d in D:
    ids = d['ids']; T = len(ids)
    if T < 6: continue
    r = forward(ids)
    for b in range(12):
        A = r['att'][b]  # 12 x T x T
        for i in range(2, T):
            a = A[:, i, :i + 1]
            FIRST[b] += a[:, 0]; SELF[b] += a[:, i]; P[b] += a[:, i - 1]
            rest = a[:, 1:].sum(1) + 1e-9
            DIST[b] += (a[:, 1:] * (i - np.arange(1, i + 1))).sum(1) / rest
        N_b = 1
    N += sum(1 for i in range(2, T))
P /= N; SELF /= N; FIRST /= N; DIST /= N
np.set_printoptions(precision=2, suppress=True, linewidth=200)
print('prev-token share per block (mean over heads):', P.mean(1)); print('first-word share:', FIRST.mean(1)); print('mean distance (excl first):', DIST.mean(1))
for b in range(12):
    print(b + 1, 'prev', P[b], '\n   first', FIRST[b], '\n   self', SELF[b], '\n   dist', DIST[b])
json.dump({'prev': P.tolist(), 'self': SELF.tolist(), 'first': FIRST.tolist(), 'dist': DIST.tolist()}, open('heads.json', 'w'))
