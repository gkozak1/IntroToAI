import numpy as np, json, re
W = dict(np.load('/home/claude/lab/exp/gpt2_weights.npz'))
ENC = json.load(open('/home/claude/lab/exp/encoder.json'))
DEC = {v:k for k,v in ENC.items()}
MER = [tuple(l.split()) for l in open('/home/claude/lab/exp/vocab.bpe',encoding='utf-8').read().split('\n')[1:] if l.strip()]
RANK = {m:i for i,m in enumerate(MER)}
def b2u():
    bs=list(range(33,127))+list(range(161,173))+list(range(174,256)); cs=bs[:]; n=0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256+n); n+=1
    return {b:chr(c) for b,c in zip(bs,cs)}
BE=b2u(); BD={v:k for k,v in BE.items()}
PAT=re.compile(r"""'s|'t|'re|'ve|'m|'ll|'d| ?[^\W\d_]+| ?\d+| ?[^\s\w]+|\s+(?!\S)|\s+""")
def bpe(tok):
    w=list(tok)
    while len(w)>1:
        pairs=[(RANK.get((w[i],w[i+1]),1e18),i) for i in range(len(w)-1)]
        r,i=min(pairs)
        if r==1e18: break
        a,b=w[i],w[i+1]; nw=[]; j=0
        while j<len(w):
            if j<len(w)-1 and w[j]==a and w[j+1]==b: nw.append(a+b); j+=2
            else: nw.append(w[j]); j+=1
        w=nw
    return w
def encode(t):
    ids=[]
    for m in PAT.findall(t):
        ids+= [ENC[p] for p in bpe(''.join(BE[b] for b in m.encode('utf-8')))]
    return ids
def decode(ids): return bytes(BD[c] for i in ids for c in DEC[i]).decode('utf-8','replace')
def ln(x,g,b,eps=1e-5):
    mu=x.mean(-1,keepdims=True); v=((x-mu)**2).mean(-1,keepdims=True); return (x-mu)/np.sqrt(v+eps)*g+b
def gelu(x): return 0.5*x*(1+np.tanh(np.sqrt(2/np.pi)*(x+0.044715*x**3)))
def forward(ids, keep=True):
    T=len(ids); x=W['wte.weight'][ids]+W['wpe.weight'][:T]
    out={'tok':W['wte.weight'][ids].copy(),'pos':W['wpe.weight'][:T].copy(),'h':[x.copy()],'attn':[]}
    mask=np.triu(np.full((T,T),-1e10,dtype=np.float32),1)
    for l in range(12):
        p=f'h.{l}.'
        a=ln(x,W[p+'ln_1.weight'],W[p+'ln_1.bias'])@W[p+'attn.c_attn.weight']+W[p+'attn.c_attn.bias']
        q,k,v=np.split(a,3,-1)
        q=q.reshape(T,12,64).transpose(1,0,2); k=k.reshape(T,12,64).transpose(1,0,2); v=v.reshape(T,12,64).transpose(1,0,2)
        s=q@k.transpose(0,2,1)/8.0+mask; s=s-s.max(-1,keepdims=True); e=np.exp(s); A=e/e.sum(-1,keepdims=True)
        out['attn'].append(A)
        y=(A@v).transpose(1,0,2).reshape(T,768)@W[p+'attn.c_proj.weight']+W[p+'attn.c_proj.bias']
        x=x+y
        m_=gelu(ln(x,W[p+'ln_2.weight'],W[p+'ln_2.bias'])@W[p+'mlp.c_fc.weight']+W[p+'mlp.c_fc.bias'])@W[p+'mlp.c_proj.weight']+W[p+'mlp.c_proj.bias']
        x=x+m_
        out['h'].append(x.copy())
    f=ln(x,W['ln_f.weight'],W['ln_f.bias'])
    out['final']=f; out['logits']=f@W['wte.weight'].T
    return out
