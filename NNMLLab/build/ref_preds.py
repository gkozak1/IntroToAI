# reference predictions from the quantized ladder models, for the test images shipped with the app
import json, base64, numpy as np, re
core = json.loads(open('../data/core-data.js').read().split('=', 1)[1].rstrip(';\n'))
lad = json.loads(open('../data/ladder-data.js').read().split('=', 1)[1].rstrip(';\n'))
imgs = np.frombuffer(base64.b64decode(core['test']['images']), np.uint8).reshape(-1, 28, 28)
def feat(kind, im):
    if kind == 'bits8': return ((im >= 128).reshape(-1, 4, 7, 2, 14).sum(axis=(2, 4)).reshape(-1, 8) >= 5).astype(float)
    if kind == 'pool7': return im.reshape(-1, 7, 4, 7, 4).mean(axis=(2, 4)).reshape(-1, 49) / 255
    return im.reshape(-1, 784) / 255
out = {}
for m in lad:
    h = feat(m['kind'], imgs)
    for li, L in enumerate(m['layers']):
        W = np.frombuffer(base64.b64decode(L['w']), np.int8).reshape(L['rows'], L['cols']) * L['scale']; h = h @ W + np.array(L['b'])
        if li < len(m['layers']) - 1: h = np.maximum(h, 0)
    out[m['name']] = h.argmax(1).tolist()
json.dump(out, open('../test/ref_preds.json', 'w'))
print({k: len(v) for k, v in out.items()})
