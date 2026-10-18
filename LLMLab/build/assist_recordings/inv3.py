import torch, json, sys, time, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; problems=json.loads(sys.argv[2]); seeds=json.loads(sys.argv[3]); outf=sys.argv[4]
p=f"{S}/qwen3"; torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
def run(q,think,seed,n):
    t=tok.apply_chat_template([{"role":"user","content":q}],tokenize=False,add_generation_prompt=True,enable_thinking=think)
    ids=tok(t,return_tensors="pt").input_ids; torch.manual_seed(seed)
    kw=dict(do_sample=True,temperature=0.6,top_p=0.95,top_k=20) if think else dict(do_sample=True,temperature=0.7,top_p=0.8,top_k=20)
    t0=time.time(); g=m.generate(ids,max_new_tokens=n,pad_token_id=tok.eos_token_id,**kw)
    new=g[0][ids.shape[1]:]
    return dict(text=tok.decode(new,skip_special_tokens=False),ntok=len(new),secs=round(time.time()-t0,1))
res=[]
for pr in problems:
    for mode,think,n in [("direct",False,40),("thinking",True,1400)]:
        for sd in seeds:
            q=pr["q"]+(" Answer with just the number." if not think else "")
            r=run(q,think,sd,n); r.update(mode=mode,seed=sd,q=q,answer=pr["a"])
            final=r["text"].split("</think>")[-1]
            nums=re.findall(r"[\d,]+",final.replace("**",""))
            r["final_nums"]=nums[-3:]
            th=r["text"].split("</think>")[0] if "</think>" in r["text"] else ""
            r["think_tokens"]=len(tok(th).input_ids) if th else 0
            res.append(r); print(mode,sd,pr["a"],"->",nums[-1:] if nums else None,r["ntok"],"tok",r["secs"],"s",flush=True)
            json.dump(res,open(outf,"w"),indent=1)
