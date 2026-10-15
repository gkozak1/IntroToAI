"""Builds the stored GPT-2 data for the story sentences (offline, NumPy GPT-2 from the same weights the app downloads).
lab-data.js: examples.story / umbrella / trophy (+ final, tok, pos, topRows for annie), full-vocabulary logits for each,
and for the story sentence + each of its 15 likeliest next tokens.
context-data.js: stack.<key> for story, umbrella, trophy, annie (next-token guess after every block, scores before/after
each feed-forward, the last token's vector after each block, how much each block changed each token; every token's vector for story)."""
import json, base64, numpy as np, sys
sys.path.insert(0, '.')
from g2 import forward, ln, W
E = W['wte.weight']; P = W['wpe.weight']
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
f16 = lambda a: b64(np.asarray(a, dtype='<f2'))
def logits(h): return ln(h, W['ln_f.weight'], W['ln_f.bias']) @ E.T
def pack(L):
    L = L.astype(np.float64); m = float(L.max()); q = np.round((m - L) / 0.001); assert q.max() < 65535; return {'m': round(m, 3), 'd': b64(q.astype('<u2'))}
def norm(v): v = v - v.mean(-1, keepdims=True); return v / (v.std(-1, keepdims=True) + 1e-6)
def i8(a): return b64(np.clip(np.round(a / 3 * 127), -127, 127).astype(np.int8))
src = open('lab-data.bak.js').read(); LAB = json.loads(src[src.index('{'):src.rindex('}') + 1])
csrc = open('context-data.bak.js').read(); CTX = json.loads(csrc[csrc.index('{'):csrc.rindex('}') + 1])
S = {x['t']: x for x in json.load(open('st_ids.json'))}
keys = {'story': "The banker left the bank and sat on the left bank of the", 'umbrella': "She grabbed her umbrella on the way out because it was starting to", 'trophy': "The trophy wouldn't fit in the suitcase because it was too"}
def example(text, ids, toks):
    r = forward(ids); T = len(ids); A = np.stack(r['att'])  # 12 x 12 x T x T
    z = logits(r['h'][12][-1]); top = np.argsort(-z)
    e = {'text': text, 'ids': ids, 'tokens': toks, 'T': T, 'attn': b64(np.round(A * 255).astype(np.uint8)),
         'next': {'ids': [int(i) for i in top[:50]], 'logits': [round(float(z[i]), 3) for i in top[:50]]},
         'final': f16(ln(r['h'][12][-1], W['ln_f.weight'], W['ln_f.bias'])), 'tok': f16(E[ids]), 'pos': f16(P[:T]),
         'topRows': {'ids': [int(i) for i in top[:15]], 'rows': f16(E[top[:15]])}}
    return e, r, z
def stack(ids, toks, r, withVec):
    T = len(ids); o = {'toks': toks, 'ids': ids}
    o['lens'] = []; o['lg'] = []; o['lgA'] = []; o['lnf'] = []
    for b in range(13):
        z = logits(r['h'][b][-1]); p = np.exp(z - z.max()); p /= p.sum(); t = np.argsort(-z)
        o['lens'].append([[int(i), round(float(p[i]), 6)] for i in t[:50]]); o['lg'].append([[int(i), round(float(z[i]), 3)] for i in t[:10]])
        o['lnf'].append([round(float(x), 3) for x in ln(r['h'][b][-1], W['ln_f.weight'], W['ln_f.bias'])])
        if b < 12:
            za = logits(r['h'][b][-1] + r['attn'][b][-1]); ta = np.argsort(-za); o['lgA'].append([[int(i), round(float(za[i]), 3)] for i in ta[:10]])
    z = logits(r['h'][12][-1]); p = np.exp(z - z.max()); p /= p.sum(); t = np.argsort(-z)
    o['final'] = [[int(i), round(float(z[i]), 3), round(float(p[i]), 5)] for i in t[:10]]
    o['change'] = []
    for b in range(12):
        hb = r['h'][b]; n0 = np.linalg.norm(hb, axis=-1)
        o['change'].append([[round(float(np.linalg.norm(r['attn'][b][t_]) / n0[t_]), 3), round(float(np.linalg.norm(r['mlp'][b][t_]) / np.linalg.norm(hb[t_] + r['attn'][b][t_])), 3)] for t_ in range(T)])
    if withVec: o['vec'] = i8(np.stack([norm(r['h'][b]) for b in range(13)]))
    return o
for k, text in keys.items():
    x = S[text]; e, r, z = example(text, x['ids'], x['toks'])
    LAB['examples'][k] = e; LAB['full'][','.join(map(str, x['ids']))] = pack(z)
    CTX['stack'][k] = stack(x['ids'], x['toks'], r, k == 'story')
    print(k, len(x['ids']), [LAB['examples'][k]['next']['ids'][:3]])
    if k == 'story':
        for t in np.argsort(-z)[:5]:
            ids2 = x['ids'] + [int(t)]; LAB['full'][','.join(map(str, ids2))] = pack(logits(forward(ids2)['h'][12][-1]))
# annie: add the final vector, rows and its stack
a = LAB['examples']['annie']; r = forward(a['ids']); z = logits(r['h'][12][-1]); top = np.argsort(-z)
a['final'] = f16(ln(r['h'][12][-1], W['ln_f.weight'], W['ln_f.bias'])); a['topRows'] = {'ids': [int(i) for i in top[:15]], 'rows': f16(E[top[:15]])}
a['tok'] = f16(E[a['ids']]); a['pos'] = f16(P[:len(a['ids'])])
CTX['stack']['annie'] = stack(a['ids'], a['tokens'], r, False)
# drop stacks no longer used by the app
for k in ['banker', 'river', 'trophyLarge', 'trophySmall']: CTX['stack'].pop(k, None)
CTX['meaning'] = [m for m in CTX['meaning'] if m['id'] != 'bank2']
open('../lab/LLMLab/data/lab-data.js', 'w').write('window.LAB=' + json.dumps(LAB, separators=(',', ':')) + ';')
open('../lab/LLMLab/data/context-data.js', 'w').write('window.CTX_DATA=' + json.dumps(CTX, separators=(',', ':')) + ';\n')
import os; print('lab', os.path.getsize('../lab/LLMLab/data/lab-data.js'), 'ctx', os.path.getsize('../lab/LLMLab/data/context-data.js'))
