# "How it really works" trace for the story sentence: every block's real Q, K, V, scores, attention, head outputs, W_O result,
# MLP pre-activation, MLP result and Case Files (GPT-2 small, biases and layer norms included). Writes data/really-data.js.
import sys, json, base64, numpy as np
sys.path.insert(0, '/home/claude/w'); import g2
W = g2.W
ids = [464, 33371, 1364, 262, 3331, 290, 3332, 319, 262, 1364, 3331, 286, 262]
T = len(ids)
def ln(x, g, b): return g2.ln(x, g, b)
x = W['wte.weight'][ids] + W['wpe.weight'][:T]
mask = np.triu(np.full((T, T), -np.inf, dtype=np.float32), 1)
def pack(a):  # rows of int8 with a per-row scale
    a = np.asarray(a, np.float32).reshape(-1, a.shape[-1]); sc = np.abs(a).max(1); sc[sc == 0] = 1
    q = np.clip(np.round(a / sc[:, None] * 127), -127, 127).astype(np.int8)
    return {'d': base64.b64encode(q.tobytes()).decode(), 's': [float('%.5g' % v) for v in sc], 'n': int(a.shape[-1])}
blocks = []; checks = []
for l in range(12):
    p = f'h.{l}.'
    a = ln(x, W[p + 'ln_1.weight'], W[p + 'ln_1.bias']) @ W[p + 'attn.c_attn.weight'] + W[p + 'attn.c_attn.bias']
    q, k, v = [m.reshape(T, 12, 64).transpose(1, 0, 2) for m in np.split(a, 3, -1)]
    raw = q @ k.transpose(0, 2, 1)                      # Q·Kᵀ (12, T, T)
    s = raw / 8 + mask; s = np.exp(s - s.max(-1, keepdims=True)); att = s / s.sum(-1, keepdims=True)
    z = att @ v                                          # each head's note (12, T, 64)
    cat = z.transpose(1, 0, 2).reshape(T, 768)
    o = cat @ W[p + 'attn.c_proj.weight'] + W[p + 'attn.c_proj.bias']
    xm = x + o
    u = ln(xm, W[p + 'ln_2.weight'], W[p + 'ln_2.bias']) @ W[p + 'mlp.c_fc.weight'] + W[p + 'mlp.c_fc.bias']
    f = g2.gelu(u) @ W[p + 'mlp.c_proj.weight'] + W[p + 'mlp.c_proj.bias']
    xo = xm + f
    tri = lambda m: [[round(float(m[h, i, j]), 4) for j in range(i + 1)] for h in range(12) for i in range(T)]
    blocks.append({'x': pack(x), 'q': pack(q), 'k': pack(k), 'v': pack(v), 'z': pack(z), 'o': pack(o), 'm': pack(xm), 'u': pack(u), 'f': pack(f),
                   'raw': tri(raw), 'att': tri(att)})
    checks.append((l, float(np.abs(att.sum(-1) - 1).max())))
    x = xo
# the final scores: after block 12 the last token's vector (final layer norm) against every token's embedding row
z = ln(x[-1], W['ln_f.weight'], W['ln_f.bias']) @ W['wte.weight'].T
pz = np.exp(z - z.max()); pz /= pz.sum(); top = np.argsort(-z)[:10]
out = {'T': T, 'ids': ids, 'blocks': blocks, 'xo': pack(x), 'top': {'ids': [int(i) for i in top], 'logits': [round(float(z[i]), 2) for i in top], 'p': [float('%.5g' % pz[i]) for i in top]}}
# sampled real weights for the matrix pictures, one small file per block (loaded only for the block on screen)
import os
wd = os.path.join(os.path.dirname(sys.argv[1]), 'really-w'); os.makedirs(wd, exist_ok=True)
def mat(m, rs, cs):
    m = np.asarray(m, np.float32)[::rs, ::cs]; sc = float(np.percentile(np.abs(m), 99)) or 1
    q = np.clip(np.round(m / sc * 127), -127, 127).astype(np.int8)
    return {'d': base64.b64encode(q.tobytes()).decode(), 'r': int(m.shape[0]), 'c': int(m.shape[1])}
for l in range(12):
    p = f'h.{l}.'; A = W[p + 'attn.c_attn.weight']
    wf = {'q': mat(A[:, 0:64], 4, 1), 'k': mat(A[:, 768:832], 4, 1), 'v': mat(A[:, 1536:1600], 4, 1),
          'o': mat(W[p + 'attn.c_proj.weight'], 6, 6), 'm1': mat(W[p + 'mlp.c_fc.weight'], 8, 8), 'm2': mat(W[p + 'mlp.c_proj.weight'], 8, 8)}
    open(os.path.join(wd, f'b{l + 1}.js'), 'w').write(f'(window.REALLY_W=window.REALLY_W||{{}})[{l + 1}]=' + json.dumps(wf, separators=(',', ':')) + ';\n')
js = '/* real GPT-2 small trace for "The banker left the bank and sat on the left bank of the" (build/build_really.py) */\nwindow.REALLY_DATA=' + json.dumps(out, separators=(',', ':')) + ';\n'
open(sys.argv[1], 'w').write(js)
print('bytes', len(js), 'max |row sum-1|', max(c for _, c in checks))
# a few spot values for the test record
b0 = blocks[0]; print('block1 head1 last "the": raw', b0['raw'][12][:4], 'att', b0['att'][12][:4])
