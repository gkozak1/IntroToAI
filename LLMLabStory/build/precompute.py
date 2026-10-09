import sys, json, base64, numpy as np
sys.path.insert(0,'.')
from gpt2np import *
OUT='/home/claude/lab/NextTokenLab/data'
b64=lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
def f16(a): return b64(np.asarray(a,dtype='<f2'))
def top(logits,k=50):
    idx=np.argsort(-logits)[:k]; return {'ids':idx.tolist(),'logits':[round(float(x),3) for x in logits[idx]]}
def att_u8(o):
    A=np.stack(o['attn'])  # 12 blocks x 12 heads x T x T
    return b64(np.clip(np.round(A*255),0,255).astype(np.uint8))
EX={
 'banker':'The banker left the bank and',
 'river':'The banker left the bank and sat on the left bank of the river.',
 'trophyLarge':"The trophy wouldn't fit in the suitcase because it was too large.",
 'trophySmall':"The trophy wouldn't fit in the suitcase because it was too small.",
 'annie':"When Annie brought her picnic basket to Jim's house because they were going on a picnic, she made sure to pack a",
}
data={'examples':{}}
for key,t in EX.items():
    ids=encode(t); o=forward(ids)
    e={'text':t,'ids':ids,'tokens':[decode([i]) for i in ids],'attn':att_u8(o),'T':len(ids),'next':top(o['logits'][-1])}
    data['examples'][key]=e
    print(key,len(ids))
# banker extras
ids=encode(EX['banker']); o=forward(ids)
b=data['examples']['banker']
b['fullLogits']=f16(o['logits'][-1]); b['final']=f16(o['final'][-1])
b['tok']=f16(o['tok']); b['pos']=f16(o['pos'])
tops=np.argsort(-o['logits'][-1])[:15]
b['topRows']={'ids':tops.tolist(),'rows':f16(W['wte.weight'][tops])}
# river: token/pos rows to show identical bank rows
ids=encode(EX['river']); o=forward(ids); r=data['examples']['river']; r['tok']=f16(o['tok']); r['pos']=f16(o['pos'])
# Context experiment (raw cosine), money vs river banks + banker-sentence banks
money=['She deposited her paycheck at the bank','He opened a savings account at the bank','The robbers stole money from the bank']
riverS=['They watched the boats along the river bank','The ducks rested on the grassy bank','The canoe drifted toward the muddy bank']
cos=lambda a,b: float(a@b/np.linalg.norm(a)/np.linalg.norm(b))
M=[[h[-1] for h in forward(encode(s))['h']] for s in money]; R=[[h[-1] for h in forward(encode(s))['h']] for s in riverS]
within=[];cross=[]
for l in range(13):
    G=[[v[l] for v in M],[v[l] for v in R]]
    within.append(round(np.mean([cos(G[g][i],G[g][j]) for g in range(2) for i in range(3) for j in range(i+1,3)]),4))
    cross.append(round(np.mean([cos(a,c) for a in G[0] for c in G[1]]),4))
ro=forward(encode(EX['river'])); pos=[i for i,t in enumerate(encode(EX['river'])) if t==ENC['Ġbank']]
banks=[]
for p in pos:
    banks.append({'pos':p,'money':[round(np.mean([cos(ro['h'][l][p],m[l]) for m in M]),4) for l in range(13)],'river':[round(np.mean([cos(ro['h'][l][p],x[l]) for x in R]),4) for l in range(13)]})
data['context']={'money':money,'river':riverS,'within':within,'cross':cross,'banks':banks}
print('within',within); print('cross',cross); print(banks)
# Stored rounds for banker: greedy path, a seeded sampled path, and a depth-2 tree
store={}
def node(prefix):
    k=','.join(map(str,prefix))
    if k not in store: store[k]=top(forward(prefix)['logits'][-1])
    return store[k]
base=encode(EX['banker'])
g=list(base); greedy=[]
for _ in range(40):
    n=node(g); g.append(n['ids'][0]); greedy.append(n['ids'][0])
print('greedy:',decode(greedy))
rng=np.random.default_rng(7); s=list(base); trace=[]
def sample(n,T,K,r):
    L=np.array(n['logits'][:K])/T; p=np.exp(L-L.max()); p/=p.sum(); c=np.cumsum(p)
    return int(np.searchsorted(c,r,side='right'))
for _ in range(12):
    n=node(s); r=float(rng.random()); i=sample(n,1.0,10,r); trace.append({'r':round(r,4),'id':n['ids'][i]}); s.append(n['ids'][i])
print('trace:',decode([t['id'] for t in trace]))
for i in node(base)['ids'][:10]: node(base+[i])
data['rounds']={'store':store,'greedy':greedy,'trace':{'T':1.0,'K':10,'steps':trace}}
data['wpeFirst']=64
data['wpe']=f16(W['wpe.weight'][:64])
# Training
D=json.load(open('train_lr0.002.json')); 
dick=''.join(['It was the best of times,',' it was the worst of times,',' it was the age of wisdom,',' it was the age of foolishness,',' it was the epoch of belief,',' it was the epoch of incredulity,',' it was the season of light,',' it was the season of darkness,',' it was the spring of hope,',' it was the winter of despair.'])
did=encode(dick)
runs={}
for lr in ['0.0001','0.002','0.01']:
    H=json.load(open(f'train_lr{lr}.json'))
    runs[lr]=[{'loss':round(h['loss'],4),'per':[round(x,3) for x in h['per']]} for h in H]
data['training']={'text':dick,'ids':did,'tokens':[decode([i]) for i in did],'runs':runs,'uniform':round(float(np.log(50257)),3)}
open(OUT+'/lab-data.js','w').write('window.LAB='+json.dumps(data,separators=(',',':'))+';')
# Embedding rows, int8 with per-row scale, chunks of 512 rows
E=W['wte.weight']; sc=np.abs(E).max(1)/127.0
q=np.clip(np.round(E/sc[:,None]),-127,127).astype(np.int8)
for c in range(0,E.shape[0],512):
    blk=q[c:c+512]; s=sc[c:c+512].astype('<f4')
    open(f'{OUT}/emb/{c//512:03d}.bin','wb').write(s.tobytes()+blk.tobytes())
print('chunks',(E.shape[0]+511)//512)
import os; print('lab-data bytes',os.path.getsize(OUT+'/lab-data.js'))
