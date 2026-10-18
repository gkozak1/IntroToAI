import torch, json, sys, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; torch.set_num_threads(2)
tokI=AutoTokenizer.from_pretrained(f"{S}/SmolLM2-135M/instruct/configs")
chat=tokI.apply_chat_template([{"role":"user","content":"Give me three tips for studying."}],tokenize=False,add_generation_prompt=True)
res={"prompt":chat}
for name in ["base","instruct"]:
    p=f"{S}/SmolLM2-135M/{name}/configs"; tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
    ids=tok(chat,return_tensors="pt").input_ids; runs=[]
    for seed in range(1,31):
        torch.manual_seed(seed)
        g=m.generate(ids,max_new_tokens=150,do_sample=True,temperature=0.7,top_k=50,pad_token_id=0,eos_token_id=tok.convert_tokens_to_ids("<|im_end|>"))
        runs.append(tok.decode(g[0][ids.shape[1]:],skip_special_tokens=False))
    res[name]=runs
    stop=[i+1 for i,r in enumerate(runs) if r.endswith("<|im_end|>")]
    tips=[i+1 for i,r in enumerate(runs) if re.search(r"\b1\.",r) and re.search(r"\b3\.",r)]
    empty=[i+1 for i,r in enumerate(runs) if r.replace("<|im_end|>","").strip()==""]
    both=sorted(set(stop)&set(tips))
    print(name,"stop",len(stop),"tips1-3",len(tips),"tips+stop",len(both),both,"empty",len(empty))
json.dump(res,open(f"{S}/rec/inv1d.json","w"),indent=1)
