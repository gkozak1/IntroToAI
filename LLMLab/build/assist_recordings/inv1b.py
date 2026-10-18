import torch, json, sys
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]
L={}
for name in ["base","instruct"]:
    p=f"{S}/SmolLM2-135M/{name}/configs"
    L[name]=(AutoTokenizer.from_pretrained(p),AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval())
tokI=L["instruct"][0]
chat=tokI.apply_chat_template([{"role":"user","content":"Give me three tips for studying."}],tokenize=False,add_generation_prompt=True)
prompts={"chat":chat,"labels2":"User: Give me three tips for studying.\nAssistant:"}
out={}
for pk,pt in prompts.items():
  for name,(tok,m) in L.items():
    ids=tok(pt,return_tensors="pt").input_ids
    runs=[]
    for seed in [None,1,2,3]:
        if seed is None: kw=dict(do_sample=False)
        else: torch.manual_seed(seed); kw=dict(do_sample=True,temperature=0.7,top_k=50,top_p=1.0)
        g=m.generate(ids,max_new_tokens=260,pad_token_id=0,eos_token_id=None,**kw)
        runs.append(tok.decode(g[0][ids.shape[1]:],skip_special_tokens=False))
    out[f"{pk}|{name}"]=runs
json.dump(out,open(f"{S}/rec/inv1b.json","w"),indent=1)
for k,v in out.items():
    for i,r in enumerate(v): print(f"===== {k} run{i}\n{r[:900]}")
