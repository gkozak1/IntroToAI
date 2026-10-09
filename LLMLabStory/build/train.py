import sys, json, numpy as np, torch, torch.nn.functional as F
sys.path.insert(0,'.')
from gpt2np import encode, decode, W as NW
torch.manual_seed(0)
P={k:torch.tensor(v) for k,v in NW.items() if k!='lm_head.weight'}
for v in P.values(): v.requires_grad_(True)
def ln(x,g,b): return F.layer_norm(x,(768,),g,b,1e-5)
def fwd(ids):
    T=len(ids); x=P['wte.weight'][ids]+P['wpe.weight'][:T]
    mask=torch.triu(torch.ones(T,T,dtype=torch.bool),1)
    for l in range(12):
        p=f'h.{l}.'
        a=ln(x,P[p+'ln_1.weight'],P[p+'ln_1.bias'])@P[p+'attn.c_attn.weight']+P[p+'attn.c_attn.bias']
        q,k,v=a.split(768,-1); q=q.view(T,12,64).transpose(0,1); k=k.view(T,12,64).transpose(0,1); v=v.view(T,12,64).transpose(0,1)
        s=(q@k.transpose(1,2))/8.0; s=s.masked_fill(mask,-1e10); A=s.softmax(-1)
        x=x+((A@v).transpose(0,1).reshape(T,768)@P[p+'attn.c_proj.weight']+P[p+'attn.c_proj.bias'])
        h=F.gelu(ln(x,P[p+'ln_2.weight'],P[p+'ln_2.bias'])@P[p+'mlp.c_fc.weight']+P[p+'mlp.c_fc.bias'],approximate='tanh')
        x=x+(h@P[p+'mlp.c_proj.weight']+P[p+'mlp.c_proj.bias'])
    return ln(x,P['ln_f.weight'],P['ln_f.bias'])@P['wte.weight'].T
clauses=['It was the best of times,',' it was the worst of times,',' it was the age of wisdom,',' it was the age of foolishness,',' it was the epoch of belief,',' it was the epoch of incredulity,',' it was the season of light,',' it was the season of darkness,',' it was the spring of hope,',' it was the winter of despair.']
text=''.join(clauses); ids=torch.tensor(encode(text))
lr=float(sys.argv[1]); steps=int(sys.argv[2])
track=['light','darkness','spring','hope','winter','despair','wisdom','foolishness']
def probs():
    with torch.no_grad():
        L=fwd(ids[:-1]); lp=L.log_softmax(-1); tgt=ids[1:]
        tl=-lp[torch.arange(len(tgt)),tgt]
        out={}
        for i,t in enumerate(tgt.tolist()):
            w=decode([t]).strip()
            if w in track and w not in out: out[w]=float(lp[i,t].exp())
        return float(tl.mean()), out, tl.tolist()
hist=[]
for s in range(steps+1):
    loss,pr,per=probs(); hist.append({'step':s,'loss':loss,'p':pr,'per':per}); print(s, round(loss,4), {k:round(v,4) for k,v in pr.items()})
    if s==steps: break
    L=fwd(ids[:-1]); l=F.cross_entropy(L,ids[1:])
    for v in P.values(): v.grad=None
    l.backward()
    with torch.no_grad():
        for v in P.values(): v-=lr*v.grad
json.dump(hist,open(f'train_lr{lr}.json','w'))
