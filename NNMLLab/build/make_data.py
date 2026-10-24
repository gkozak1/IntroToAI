"""Builds every real number NNML Lab shows. Run: python3 make_data.py  (writes ../data/*.js)
All training is ordinary numpy with fixed seeds, so results are reproducible."""
import numpy as np, gzip, json, base64

rng = np.random.default_rng(2026)
OUT = '../data/'

def li(f):
    with gzip.open('mnist/' + f) as g: d = g.read()
    return np.frombuffer(d, np.uint8, offset=16).reshape(-1, 28, 28)
def ll(f):
    with gzip.open('mnist/' + f) as g: d = g.read()
    return np.frombuffer(d, np.uint8, offset=8)

Xtr = li('train-images-idx3-ubyte.gz'); Ytr = ll('train-labels-idx1-ubyte.gz')
Xte = li('t10k-images-idx3-ubyte.gz'); Yte = ll('t10k-labels-idx1-ubyte.gz')

def b64(a): return base64.b64encode(np.asarray(a, np.uint8).tobytes()).decode()
def counts(img):
    dk = (img >= 128)
    return dk.reshape(-1, 4, 7, 2, 14).sum(axis=(2, 4)).reshape(-1, 8)
def bits(img): return (counts(img) >= 5).astype(np.float64)

# ---------------- hand-built (rigged) network ----------------
R = json.load(open('rigged.json'))
W1r = np.array(R['W1']).T  # 8 x 10  rows = inputs (leaving), cols = hidden (entering)
W2r = np.array(R['W2']).T  # 10 x 10 rows = hidden, cols = outputs
cur = np.array([R['digits'][str(d)]['full'] for d in range(10)], np.uint8)
def rig(b):
    h = ((b @ W1r) - 1 >= -1e-9).astype(float); o = ((h @ W2r) - 1 >= -1e-9).astype(float); return h, o
hc, oc = rig(bits(cur))
assert (oc == np.eye(10)).all(), 'hand-built network must give identity on curated digits'

# real stats for "Break it"
Btr = bits(Xtr); _, Otr = rig(Btr)
rig_correct = float(((Otr.sum(1) == 1) & (Otr.argmax(1) == Ytr)).mean())
rig_none = float((Otr.sum(1) == 0).mean()); rig_multi = float((Otr.sum(1) > 1).mean())
pats = (Btr @ (1 << np.arange(8))).astype(int)
tab = np.zeros((256, 10)); np.add.at(tab, (pats, Ytr), 1)
best8 = float(tab.max(1).sum() / len(Ytr)); npat = int((tab.sum(1) > 0).sum())

# gallery: 12 test images per digit, seeded
gal = []
for d in range(10):
    idx = np.where(Yte == d)[0]; gal += list(rng.choice(idx, 12, replace=False))
gal = np.array(gal)
# collision pairs: different digits, identical 8 inputs, one of them matching a curated pattern
Bte = bits(Xte); pte = (Bte @ (1 << np.arange(8))).astype(int)
curp = (bits(cur) @ (1 << np.arange(8))).astype(int)
pairs = []
for d in [4, 7, 0, 2]:
    same = np.where((pte == curp[d]))[0]
    a = [i for i in same if Yte[i] == d]; b = [i for i in same if Yte[i] != d]
    if a and b: pairs.append([int(a[0]), int(b[0])])
pairs = pairs[:3]

# ---------------- small numpy MLP trainer (softmax + cross-entropy, Adam) ----------------
def init(sizes, seed):
    r = np.random.default_rng(seed); P = []
    for a, b in zip(sizes[:-1], sizes[1:]):
        P.append([r.normal(0, np.sqrt(2 / a), (a, b)), np.zeros(b)])
    return P
def fwd(P, X):
    acts = [X]; h = X
    for i, (W, b) in enumerate(P):
        z = h @ W + b
        h = np.maximum(z, 0) if i < len(P) - 1 else z
        acts.append(h)
    return acts
def softmax(z):
    z = z - z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)
def train(P, X, Y, epochs, bs=64, lr=1e-3, seed=0, log=None):
    r = np.random.default_rng(seed); m = [[np.zeros_like(W), np.zeros_like(b)] for W, b in P]; v = [[np.zeros_like(W), np.zeros_like(b)] for W, b in P]; t = 0
    for ep in range(epochs):
        order = r.permutation(len(X))
        for s in range(0, len(X), bs):
            ix = order[s:s + bs]; acts = fwd(P, X[ix]); p = softmax(acts[-1])
            g = p.copy(); g[np.arange(len(ix)), Y[ix]] -= 1; g /= len(ix); t += 1
            for i in range(len(P) - 1, -1, -1):
                W, b = P[i]; gW = acts[i].T @ g; gb = g.sum(0)
                if i > 0: g = (g @ W.T) * (acts[i] > 0)
                for k, gr in ((0, gW), (1, gb)):
                    m[i][k] = .9 * m[i][k] + .1 * gr; v[i][k] = .999 * v[i][k] + .001 * gr * gr
                    P[i][k] = P[i][k] - lr * (m[i][k] / (1 - .9 ** t)) / (np.sqrt(v[i][k] / (1 - .999 ** t)) + 1e-8)
        if log: log(ep, P)
    return P
def acc(P, X, Y): return float((fwd(P, X)[-1].argmax(1) == Y).mean())
def loss(P, X, Y):
    p = softmax(fwd(P, X)[-1]); return float(-np.log(p[np.arange(len(Y)), Y] + 1e-12).mean())

# ---------------- ladder of 4 real models ----------------
perm = rng.permutation(60000); tri, vai = perm[:50000], perm[50000:]
def feat(kind, imgs):
    if kind == 'bits8': return bits(imgs)
    if kind == 'pool7': return imgs.reshape(-1, 7, 4, 7, 4).mean(axis=(2, 4)).reshape(-1, 49) / 255
    return imgs.reshape(-1, 784) / 255
ladder_spec = [
    ('bits8', [8, 10, 10], '8 on/off regions', 8),
    ('pool7', [49, 32, 10], '7×7 shades', 6),
    ('full', [784, 32, 10], '28×28 pixels, 32 hidden', 6),
    ('full', [784, 128, 10], '28×28 pixels, 128 hidden', 6)]
ladder = []
for k, (kind, sizes, name, ep) in enumerate(ladder_spec):
    P = train(init(sizes, 10 + k), feat(kind, Xtr[tri]), Ytr[tri], ep, seed=k)
    params = sum(W.size + b.size for W, b in P)
    ent = dict(kind=kind, sizes=sizes, name=name, params=int(params),
               practice=acc(P, feat(kind, Xtr[vai]), Ytr[vai]), final=acc(P, feat(kind, Xte), Yte))
    layers = []
    for W, b in P:
        s = float(np.abs(W).max() / 127)
        layers.append(dict(rows=W.shape[0], cols=W.shape[1], scale=s,
                           w=base64.b64encode(np.round(W / s).astype(np.int8).tobytes()).decode(),
                           b=[round(float(x), 5) for x in b]))
    ent['layers'] = layers
    # accuracy of the quantized weights (what the browser really runs)
    Pq = [[np.frombuffer(base64.b64decode(L['w']), np.int8).reshape(L['rows'], L['cols']) * L['scale'], np.array(L['b'])] for L in layers]
    ent['finalQ'] = acc(Pq, feat(kind, Xte), Yte)
    if kind == 'full' and sizes[1] == 32:
        pr = softmax(fwd(Pq, feat(kind, Xte))[-1]); pred = pr.argmax(1); wrong = np.where(pred != Yte)[0]
        conf = pr[wrong, pred[wrong]]; pick = wrong[np.argsort(-conf)][:40:3][:12]
        ent['mistakes'] = [dict(i=int(i), y=int(Yte[i]), p=int(pred[i]), c=round(float(pr[i, pred[i]]), 3)) for i in pick]
        cm = np.zeros((10, 10), int); np.add.at(cm, (Yte, pred), 1); np.fill_diagonal(cm, 0)
        top = np.dstack(np.unravel_index(np.argsort(-cm.ravel())[:5], cm.shape))[0]
        ent['confused'] = [dict(y=int(a), p=int(b), n=int(cm[a, b])) for a, b in top]
        mist_idx = pick
    ladder.append(ent)
    print(name, params, ent['practice'], ent['final'], ent['finalQ'])

# ---------------- the Learner (8-10-10, sigmoid hidden, linear output, MSE) ----------------
sig = lambda z: 1 / (1 + np.exp(-z))
deck = []
for d in range(10):
    idx = np.where(Ytr == d)[0]; deck += list(rng.choice(idx, 25, replace=False))
deck = np.array(deck); rng.shuffle(deck)
Xd = bits(Xtr[deck]); Yd = Ytr[deck]; Td = np.eye(10)[Yd]
r = np.random.default_rng(7)
L0 = dict(W1=r.uniform(-1, 1, (8, 10)), b1=np.zeros(10), W2=r.uniform(-.5, .5, (10, 10)), b2=np.zeros(10))
LR = 0.1
def lfwd(L, X):
    h = sig(X @ L['W1'] + L['b1']); return h, h @ L['W2'] + L['b2']
def lstep(L, X, T, lr):
    h, y = lfwd(L, X); M = len(X); g = 2 * (y - T) / M
    gW2 = h.T @ g; gb2 = g.sum(0); gh = (g @ L['W2'].T) * h * (1 - h); gW1 = X.T @ gh; gb1 = gh.sum(0)
    return dict(W1=L['W1'] - lr * gW1, b1=L['b1'] - lr * gb1, W2=L['W2'] - lr * gW2, b2=L['b2'] - lr * gb2)
L = {k: v.copy() for k, v in L0.items()}; curve = []
for ep in range(80):
    for s in range(0, len(deck), 5):
        L = lstep(L, Xd[s:s + 5], Td[s:s + 5], LR)
    h, y = lfwd(L, Xd); curve.append(dict(ep=ep + 1, mse=round(float(((y - Td) ** 2).sum(1).mean()), 4), acc=round(float((y.argmax(1) == Yd).mean()), 3)))
    if ep + 1 == 30: S = {k: v.copy() for k, v in L.items()}
print('learner final', curve[-1], 'snapshot', curve[29])
# choose which hidden neuron is shown as HL3: the one whose value best separates 4s, with spread
hS, _ = lfwd(S, Xd)
score = [hS[Yd == 4, j].mean() - hS[Yd != 4, j].mean() for j in range(10)]
j = int(np.argmax(score)); order = list(range(10)); order[2], order[j] = order[j], order[2]
for key in ('W1', 'b1'):
    pass
S = dict(W1=S['W1'][:, order], b1=S['b1'][order], W2=S['W2'][order, :], b2=S['b2'])
hS, yS = lfwd(S, Xd)
# make HL3's value high for 4s on average (flip not allowed; just report)
print('HL3 mean for 4s', hS[Yd == 4, 2].mean(), 'others', hS[Yd != 4, 2].mean())
# batches A-E: 5 deck images each, exactly one 4, chosen for a spread of HL3 values
fours = sorted([i for i in range(len(deck)) if Yd[i] == 4], key=lambda i: -hS[i, 2])
pat = (Xd @ (1 << np.arange(8))).astype(int)
batches = []; used = set(); r2 = np.random.default_rng(11)
for f in fours:
    if len(batches) == 5: break
    cand = [i for i in range(len(deck)) if Yd[i] != 4 and pat[i] != pat[f] and i not in used and hS[i, 2] < hS[f, 2] - 0.05]
    if len(cand) < 4: continue
    cand.sort(key=lambda i: hS[i, 2]); pick = []; seen = set(); pats = {pat[f]}
    for q in (0.0, 0.33, 0.66, 1.0):
        for i in sorted(cand, key=lambda i: abs(cand.index(i) / (len(cand) - 1) - q)):
            if Yd[i] not in seen and pat[i] not in pats: pick.append(i); seen.add(Yd[i]); pats.add(pat[i]); break
    if len(pick) < 4: continue
    used |= set(pick); bb = [f] + pick; r2.shuffle(bb); batches.append([int(x) for x in bb])
    print('batch', len(batches), [(int(Yd[i]), round(float(hS[i, 2]), 2)) for i in bb])
# ---------------- overtraining runs (M6) ----------------
test_i = rng.choice(10000, 2000, replace=False)
ink = (Xtr >= 128).reshape(-1, 784).sum(1)
narrow = []
for d in range(10):
    idx = np.where(Ytr == d)[0]; lo = idx[np.argsort(ink[idx])][:200]; narrow += list(rng.choice(lo, 30, replace=False))
varied = list(rng.choice(60000, 300, replace=False)); more = list(rng.choice(60000, 5000, replace=False))
runs = {}
for name, ix, ep in (('narrow', narrow, 60), ('varied', varied, 60), ('more', more, 30)):
    ix = np.array(ix); rec = []
    def lg(e, P, ix=ix, rec=rec):
        rec.append(dict(ep=e + 1, train=round(acc(P, Xtr[ix].reshape(-1, 784) / 255, Ytr[ix]), 4),
                        test=round(acc(P, Xte[test_i].reshape(-1, 784) / 255, Yte[test_i]), 4),
                        trainLoss=round(loss(P, Xtr[ix].reshape(-1, 784) / 255, Ytr[ix]), 4),
                        testLoss=round(loss(P, Xte[test_i].reshape(-1, 784) / 255, Yte[test_i]), 4)))
    train(init([784, 64, 10], 99), Xtr[ix].reshape(-1, 784) / 255, Ytr[ix], ep, bs=32, lr=1e-3, seed=5, log=lg)
    runs[name] = dict(n=len(ix), curve=rec, sample=[int(i) for i in ix[:12]])
    print(name, rec[-1])

# ---------------- delivery time (regression) and Late? (binary) ----------------
r3 = np.random.default_rng(5); N = 3000
dist = r3.uniform(.5, 8, N); items = r3.integers(1, 11, N); rain = (r3.random(N) < .25).astype(float); rush = (r3.random(N) < .3).astype(float)
mins = 12 + 3.2 * dist + .8 * items + rain * (4 + .7 * dist) + rush * (6 + .5 * dist) + r3.normal(0, 3, N)
F = np.stack([dist / 8, items / 10, rain, rush], 1)
def tr_reg(F, T, binary, seed):
    r = np.random.default_rng(seed); W1 = r.normal(0, .7, (4, 8)); b1 = np.zeros(8); W2 = r.normal(0, .5, (8, 1)); b2 = np.zeros(1)
    if not binary: b2 += T.mean()
    lr = .01 if not binary else .5
    for it in range(6000):
        z = F @ W1 + b1; h = np.maximum(z, 0); o = h @ W2 + b2
        p = sig(o) if binary else o
        g = (p - T[:, None]) / len(F) * (1 if binary else 2)
        gW2 = h.T @ g; gb2 = g.sum(0); gh = (g @ W2.T) * (z > 0); gW1 = F.T @ gh; gb1 = gh.sum(0)
        W1 -= lr * gW1; b1 -= lr * gb1; W2 -= lr * gW2; b2 -= lr * gb2
    return W1, b1, W2, b2
trn, tst = slice(0, 2400), slice(2400, N)
reg = tr_reg(F[trn], mins[trn], False, 1)
def run(m, F, binary):
    W1, b1, W2, b2 = m; o = (np.maximum(F @ W1 + b1, 0) @ W2 + b2)[:, 0]; return sig(o) if binary else o
mae = float(np.abs(run(reg, F[tst], False) - mins[tst]).mean())
late = (mins > 35).astype(float)
bin_ = tr_reg(F[trn], late[trn], True, 2)
lacc = float(((run(bin_, F[tst], True) > .5) == (late[tst] > .5)).mean())
print('delivery MAE', mae, 'late acc', lacc, 'late rate', late.mean())
pk = lambda m: dict(W1=np.round(m[0], 5).tolist(), b1=np.round(m[1], 5).tolist(), W2=np.round(m[2][:, 0], 5).tolist(), b2=round(float(m[3][0]), 5))
examples = [dict(dist=round(float(dist[i]), 1), items=int(items[i]), rain=int(rain[i]), rush=int(rush[i]), mins=round(float(mins[i]), 1)) for i in range(2400, 2406)]

# ---------------- write ----------------
imgs_needed = sorted(set(gal.tolist()) | {i for p in pairs for i in p} | {m['i'] for m in ladder[2]['mistakes']})
D = dict(
    curated=dict(images=[b64(c) for c in cur], counts=counts(cur).tolist(), bits=bits(cur).astype(int).tolist(), mnist=R['mnistIdx']),
    W1=W1r.tolist(), W2=W2r.tolist(), pairs=R['hiddenPairs'],
    stats=dict(rigCorrect=rig_correct, rigNone=rig_none, rigMulti=rig_multi, best8=best8, patterns=npat, nTrain=60000),
    test=dict(idx=imgs_needed, labels=[int(Yte[i]) for i in imgs_needed], images=b64(Xte[imgs_needed])),
    gallery=[int(i) for i in gal], collisions=pairs,
)
open(OUT + 'core-data.js', 'w').write('window.NN_CORE=' + json.dumps(D, separators=(',', ':')) + ';\n')
open(OUT + 'ladder-data.js', 'w').write('window.NN_LADDER=' + json.dumps(ladder, separators=(',', ':')) + ';\n')
rnd = lambda a: np.round(np.asarray(a), 6).tolist()
LD = dict(deckImages=b64(Xtr[deck]), deckLabels=Yd.tolist(), deckBits=Xd.astype(int).tolist(),
          init={k: rnd(v) for k, v in L0.items()}, snapshot={k: rnd(v) for k, v in S.items()}, snapshotEpoch=30,
          lr=LR, batch=5, curve=curve, batches=batches, hl3Order=order)
open(OUT + 'learner-data.js', 'w').write('window.NN_LEARNER=' + json.dumps(LD, separators=(',', ':')) + ';\n')
RD = dict(runs={k: dict(n=v['n'], curve=v['curve']) for k, v in runs.items()},
          narrowImages=b64(Xtr[np.array(narrow)[[q * 30 + r for q in range(10) for r in (0, 1)]]]), variedImages=b64(Xtr[np.array(varied)[:20]]))
open(OUT + 'runs-data.js', 'w').write('window.NN_RUNS=' + json.dumps(RD, separators=(',', ':')) + ';\n')
DD = dict(reg=pk(reg), late=pk(bin_), mae=mae, lateAcc=lacc, scale=dict(dist=8, items=10), examples=examples, n=N)
open(OUT + 'delivery-data.js', 'w').write('window.NN_DELIVERY=' + json.dumps(DD, separators=(',', ':')) + ';\n')
print('stats', D['stats'], 'pairs', pairs)
