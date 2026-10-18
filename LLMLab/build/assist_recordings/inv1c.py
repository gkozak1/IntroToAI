import torch, json, sys, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]
res={}
for name in ["base","instruct"]:
    p=f"{S}/SmolLM2-135M/{name}/configs"
    tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
    pt="User: Give me three tips for studying.\nAssistant:"
    ids=tok(pt,return_tensors="pt").input_ids
    runs=[]
    for seed in range(1,31):
        torch.manual_seed(seed)
        g=m.generate(ids,max_new_tokens=150,do_sample=True,temperature=0.7,top_k=50,pad_token_id=0)
        runs.append(tok.decode(g[0][ids.shape[1]:],skip_special_tokens=False))
    res[name]=runs
    user=[i+1 for i,r in enumerate(runs) if re.search(r"\nUser:",r)]
    tips=[i+1 for i,r in enumerate(runs) if re.search(r"\b1\.",r) and re.search(r"\b3\.",r)]
    stop=[i+1 for i,r in enumerate(runs) if "<|im_end|>" in r or "<|endoftext|>" in r]
    print(name,"writes User: line seeds",user,"| numbered 1-3 seeds",tips,"| stops seeds",stop)
json.dump(res,open(f"{S}/rec/inv1c.json","w"),indent=1)
