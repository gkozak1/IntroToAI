import torch, json, sys, time, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; q=sys.argv[2]; outf=sys.argv[3]; seeds=json.loads(sys.argv[4]); N=int(sys.argv[5])
p=f"{S}/qwen3"; torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
res=[]
# direct: no thinking, answer prefilled so the model must give the number immediately
t=tok.apply_chat_template([{"role":"user","content":q}],tokenize=False,add_generation_prompt=True,enable_thinking=False)+"The answer is"
ids=tok(t,return_tensors="pt").input_ids
for sd in [1,2,3,4,5]:
    torch.manual_seed(sd); g=m.generate(ids,max_new_tokens=8,do_sample=True,temperature=0.7,top_p=0.8,top_k=20,pad_token_id=tok.eos_token_id)
    res.append(dict(mode="direct",seed=sd,prompt=t,text="The answer is"+tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True)))
    print(res[-1]["text"],flush=True)
greedy=m.generate(ids,max_new_tokens=8,do_sample=False,pad_token_id=tok.eos_token_id)
res.append(dict(mode="direct",seed="greedy",text="The answer is"+tok.decode(greedy[0][ids.shape[1]:],skip_special_tokens=True))); print(res[-1]["text"],flush=True)
json.dump(res,open(outf,"w"),indent=1)
t=tok.apply_chat_template([{"role":"user","content":q}],tokenize=False,add_generation_prompt=True,enable_thinking=True)
ids=tok(t,return_tensors="pt").input_ids
for sd in seeds:
    torch.manual_seed(sd); t0=time.time()
    g=m.generate(ids,max_new_tokens=N,do_sample=True,temperature=0.6,top_p=0.95,top_k=20,pad_token_id=tok.eos_token_id)
    new=g[0][ids.shape[1]:]; txt=tok.decode(new,skip_special_tokens=False)
    th=txt.split("</think>")[0]; fin=txt.split("</think>")[-1] if "</think>" in txt else ""
    res.append(dict(mode="thinking",seed=sd,prompt=t,text=txt,ntok=len(new),think_tokens=len(tok(th).input_ids),final=fin,secs=round(time.time()-t0)))
    print("thinking",sd,len(new),"tok",round(time.time()-t0),"s | final:",fin[-200:].replace("\n"," "),flush=True)
    json.dump(res,open(outf,"w"),indent=1)
