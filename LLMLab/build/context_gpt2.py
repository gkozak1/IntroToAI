import numpy as np
W = dict(np.load('w.npz'))
def ln(x, g, b, eps=1e-5):
    mu = x.mean(-1, keepdims=True); v = ((x - mu) ** 2).mean(-1, keepdims=True); return (x - mu) / np.sqrt(v + eps) * g + b
def gelu(x): return 0.5 * x * (1 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))
def forward(ids):
    T = len(ids); x = W['wte.weight'][ids] + W['wpe.weight'][:T]
    hs = [x.copy()]; attn_out = []; mlp_out = []; qkv = []; att = []
    mask = np.triu(np.full((T, T), -1e10, dtype=np.float32), 1)
    for l in range(12):
        p = f'h.{l}.'
        a = ln(x, W[p + 'ln_1.weight'], W[p + 'ln_1.bias']) @ W[p + 'attn.c_attn.weight'] + W[p + 'attn.c_attn.bias']
        q, k, v = np.split(a, 3, -1)
        q = q.reshape(T, 12, 64).transpose(1, 0, 2); k = k.reshape(T, 12, 64).transpose(1, 0, 2); v = v.reshape(T, 12, 64).transpose(1, 0, 2)
        s = q @ k.transpose(0, 2, 1) / 8 + mask; s = np.exp(s - s.max(-1, keepdims=True)); s /= s.sum(-1, keepdims=True)
        att.append(s.copy())
        o = (s @ v).transpose(1, 0, 2).reshape(T, 768) @ W[p + 'attn.c_proj.weight'] + W[p + 'attn.c_proj.bias']
        x = x + o; attn_out.append(o)
        f = gelu(ln(x, W[p + 'ln_2.weight'], W[p + 'ln_2.bias']) @ W[p + 'mlp.c_fc.weight'] + W[p + 'mlp.c_fc.bias']) @ W[p + 'mlp.c_proj.weight'] + W[p + 'mlp.c_proj.bias']
        x = x + f; mlp_out.append(f); hs.append(x.copy())
    return {"h": hs, "attn": attn_out, "mlp": mlp_out, "att": att}
def lens(h):  # what GPT-2 would predict from this vector if it stopped here
    z = ln(h, W['ln_f.weight'], W['ln_f.bias']) @ W['wte.weight'].T
    z = z - z.max(-1, keepdims=True); p = np.exp(z); p /= p.sum(-1, keepdims=True); return p
