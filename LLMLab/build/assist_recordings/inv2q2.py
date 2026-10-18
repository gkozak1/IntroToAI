import torch, json, sys
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; p=f"{S}/qwen3"
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
def gen(msgs,n=160):
    t=tok.apply_chat_template(msgs,tokenize=False,add_generation_prompt=True,enable_thinking=False)
    ids=tok(t,return_tensors="pt").input_ids
    g=m.generate(ids,max_new_tokens=n,do_sample=False,pad_token_id=tok.eos_token_id)
    return t,tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True),ids.shape[1]
SYS="You are a helpful assistant."
MEM="\n\nSaved memory about this user: Their name is Jordan. Jordan likes answers that are one or two sentences long."
out={}
for k,s in [("no_memory",SYS),("memory",SYS+MEM)]:
    _,a,_=gen([{"role":"system","content":s},{"role":"user","content":"Explain photosynthesis."}]); out[k+"_photo"]=a
    _,a,_=gen([{"role":"system","content":s},{"role":"user","content":"Do you know my name?"}],60); out[k+"_name"]=a
conv=[{"role":"system","content":SYS},{"role":"user","content":"Hi! My name is Jordan."}]
_,b,_=gen(conv,60); conv+=[{"role":"assistant","content":b}]
for q in ["What is the capital of France?","Name a fruit that is red."]:
    conv+=[{"role":"user","content":q}]; _,b,_=gen(conv,60); conv+=[{"role":"assistant","content":b}]
q=[{"role":"user","content":"Do you know my name?"}]
tf,c1,n1=gen(conv+q,60); tt,c2,n2=gen([conv[0]]+conv[3:]+q,60)
out.update(trim_conv=conv,name_full=c1,name_trimmed=c2,tokens_full=n1,tokens_trim=n2,full_text=tf)
json.dump(out,open(f"{S}/rec/inv2_qwen_b.json","w"),indent=1)
for k,v in out.items():
    if k!="full_text": print("=====",k,"\n",v)
