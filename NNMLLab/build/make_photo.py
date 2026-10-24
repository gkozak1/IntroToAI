"""Train a small fully connected photo classifier on a CIFAR-10 sample (real), precompute example results."""
import numpy as np, os, json, base64
from PIL import Image
import importlib.util
spec = importlib.util.spec_from_file_location('md', 'make_data.py')
CL = ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']
SHOW = ['plane', 'car', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck']
def load(split, n):
    X, Y = [], []
    for k, c in enumerate(CL):
        for i in range(n):
            p = f'cifar/{split}/{c}/{i:04d}.jpg'
            try: X.append(np.asarray(Image.open(p).convert('RGB'), np.uint8)); Y.append(k)
            except Exception: pass
    return np.array(X), np.array(Y)
Xtr, Ytr = load('train', 400); Xte, Yte = load('test', 100)
print(Xtr.shape, Xte.shape)
mean = Xtr.reshape(-1, 3072).mean(0) / 255
f = lambda X: X.reshape(len(X), 3072) / 255 - mean
def softmax(z): z = z - z.max(1, keepdims=True); e = np.exp(z); return e / e.sum(1, keepdims=True)
r = np.random.default_rng(3); W1 = r.normal(0, np.sqrt(2 / 3072), (3072, 64)); b1 = np.zeros(64); W2 = r.normal(0, np.sqrt(2 / 64), (64, 10)); b2 = np.zeros(10)
P = [W1, b1, W2, b2]; m = [np.zeros_like(p) for p in P]; v = [np.zeros_like(p) for p in P]; t = 0
perm = np.random.default_rng(1).permutation(len(Xtr)); va, tr_ = perm[:400], perm[400:]
Fall = f(Xtr); Ftr, Fva, Yva = Fall[tr_], Fall[va], Ytr[va]; Ytr = Ytr[tr_]; Fte = f(Xte); best = None
for ep in range(40):
    order = r.permutation(len(Ftr))
    for s in range(0, len(Ftr), 64):
        ix = order[s:s + 64]; x = Ftr[ix]; z = x @ P[0] + P[1]; hh = np.maximum(z, 0); p = softmax(hh @ P[2] + P[3])
        g = p.copy(); g[np.arange(len(ix)), Ytr[ix]] -= 1; g /= len(ix)
        gW2 = hh.T @ g; gb2 = g.sum(0); gh = (g @ P[2].T) * (z > 0) + 0; gW1 = x.T @ gh; gb1 = gh.sum(0)
        grads = [gW1 + 1e-3 * P[0], gb1, gW2 + 1e-3 * P[2], gb2]; t += 1
        for i in range(4):
            m[i] = .9 * m[i] + .1 * grads[i]; v[i] = .999 * v[i] + .001 * grads[i] ** 2
            P[i] = P[i] - 5e-4 * (m[i] / (1 - .9 ** t)) / (np.sqrt(v[i] / (1 - .999 ** t)) + 1e-8)
    pv = softmax(np.maximum(Fva @ P[0] + P[1], 0) @ P[2] + P[3]); vacc = (pv.argmax(1) == Yva).mean()
    if best is None or vacc > best[0]: best = (vacc, ep, [p.copy() for p in P])
vacc, ep, P = best
pr = softmax(np.maximum(Fte @ P[0] + P[1], 0) @ P[2] + P[3]); acc = (pr.argmax(1) == Yte).mean()
print('chosen on practice set: epoch', ep, 'practice', vacc, 'final test', acc)
pred = pr.argmax(1); rng = np.random.default_rng(9); ex = []
right = [i for i in range(len(Yte)) if pred[i] == Yte[i]]; wrong = [i for i in range(len(Yte)) if pred[i] != Yte[i]]
for k in range(10):
    rk = [i for i in right if Yte[i] == k]; wk = [i for i in wrong if Yte[i] == k]
    pick = ([rng.choice(rk)] if rk else []) + ([rng.choice(wk)] if (wk and k % 2 == 0) else [])
    for i in pick: ex.append(dict(img=base64.b64encode(Xte[i].tobytes()).decode(), label=int(Yte[i]), pred=int(pred[i]), p=[round(float(x), 3) for x in pr[i]]))
D = dict(classes=SHOW, acc=float(acc), nTrain=int(len(Ytr)), nTest=int(len(Yte)), examples=ex, note='CIFAR-10 sample; 3072-64-10 fully connected; trained offline with numpy')
open('../data/photo-data.js', 'w').write('window.NN_PHOTO=' + json.dumps(D, separators=(',', ':')) + ';\n')
print('examples', len(ex))
