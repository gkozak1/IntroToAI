import torch, json, sys, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; p=f"{S}/qwen3"; torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
probs=[(238,47,7869),(386,58,9475),(479,63,18288)]
res=[]
for b,n,g0 in probs:
    q=f"A school orders {b} boxes of {n} pencils each and gives out {g0:,} pencils. How many pencils are left? Show your steps."
    ans=b*n-g0
    t=tok.apply_chat_template([{"role":"user","content":q}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
    ids=tok(t,return_tensors="pt").input_ids
    for sd in range(1,6):
        torch.manual_seed(sd)
        g=m.generate(ids,max_new_tokens=260,do_sample=True,temperature=0.7,top_p=0.8,top_k=20,pad_token_id=tok.eos_token_id)
        txt=tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True)
        t2=txt.replace("\\times","×").replace("\\,","")
        prod=re.findall(rf"{b}\s*[×x\*]\s*{n}\s*=\s*\*?\*?([\d,]+)",t2)
        box=re.findall(r"boxed\{([\d,]+)\}",t2) or re.findall(r"\*\*([\d,]+)\s*pencils",t2)
        r=dict(q=q,answer=ans,product=b*n,seed=sd,text=txt,prod_found=prod,final=box[-1:],ntok=int(len(g[0])-ids.shape[1]))
        res.append(r); print(b,n,g0,"seed",sd,"prod",prod[:1],"(true",b*n,") final",box[-1:],"(true",ans,")",flush=True)
        json.dump(res,open(f"{S}/rec/inv3d.json","w"),indent=1)
