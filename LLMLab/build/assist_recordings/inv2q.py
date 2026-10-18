import torch, json, sys
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; p=f"{S}/qwen3"
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32,attn_implementation="eager").eval()
def gen(msgs,n=220):
    t=tok.apply_chat_template(msgs,tokenize=False,add_generation_prompt=True,enable_thinking=False)
    ids=tok(t,return_tensors="pt").input_ids
    g=m.generate(ids,max_new_tokens=n,do_sample=False,pad_token_id=tok.eos_token_id)
    return t,tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True)
out={}
SYS="You are a helpful assistant."
m1=[{"role":"system","content":SYS},{"role":"user","content":"Explain photosynthesis."}]
t,a1=gen(m1); out["turn1"]=a1
m2=m1+[{"role":"assistant","content":a1},{"role":"user","content":"Can you make that simpler?"}]
t2,a2=gen(m2); out["turn2_with_history"]=a2; out["turn2_text"]=t2
m3=[{"role":"system","content":SYS},{"role":"user","content":"Can you make that simpler?"}]
_,a3=gen(m3); out["turn2_no_history"]=a3
# memory
mm=[{"role":"system","content":SYS+"\nSaved memory: The user's name is Jordan. Jordan prefers short answers."},{"role":"user","content":"Explain photosynthesis."}]
_,a4=gen(mm); out["memory_photo"]=a4
mm2=[{"role":"system","content":SYS+"\nSaved memory: The user's name is Jordan. Jordan prefers short answers."},{"role":"user","content":"What is my name?"}]
_,a5=gen(mm2,60); out["memory_name"]=a5
nm=[{"role":"system","content":SYS},{"role":"user","content":"What is my name?"}]
_,a6=gen(nm,60); out["nomemory_name"]=a6
# trimming
conv=[{"role":"system","content":SYS},{"role":"user","content":"Hi! My name is Jordan."}]
_,b1=gen(conv,60); conv+=[{"role":"assistant","content":b1}]
for q in ["What is the capital of France?","Name a fruit that is red."]:
    conv+=[{"role":"user","content":q}]; _,b=gen(conv,60); conv+=[{"role":"assistant","content":b}]
full=conv+[{"role":"user","content":"What is my name?"}]
tf,c1=gen(full,60)
trim=[conv[0]]+conv[3:]+[{"role":"user","content":"What is my name?"}]
tt,c2=gen(trim,60)
out["trim_conv"]=conv; out["name_full"]=c1; out["name_trimmed"]=c2
out["tokens_full"]=len(tok(tf).input_ids); out["tokens_trim"]=len(tok(tt).input_ids)
# attention from "that"
ids=tok(t2,return_tensors="pt").input_ids
toks=tok.convert_ids_to_tokens(ids[0])
idx=[i for i,x in enumerate(toks) if x in("Ġthat","that")][-1]
with torch.no_grad(): o=m(ids,output_attentions=True)
A=torch.stack([a[0,:,idx,:] for a in o.attentions]).mean(dim=(0,1))  # avg layers, heads
A[0]=0  # ignore first token sink
top=torch.topk(A,15)
out["that_attention_top"]=[(toks[i].replace("Ġ"," ").replace("Ċ","\\n"),round(float(A[i]),4)) for i in top.indices]
# share going to turn1 region vs rest
um=tok.apply_chat_template(m1,tokenize=False,add_generation_prompt=True,enable_thinking=False); n1=len(tok(um).input_ids)
a1end=len(tok(tok.apply_chat_template(m1+[{"role":"assistant","content":a1}],tokenize=False)).input_ids)
out["that_share"]={"system+question":float(A[1:n1].sum()),"answer1":float(A[n1:a1end].sum()),"new_message":float(A[a1end:idx+1].sum())}
json.dump(out,open(f"{S}/rec/inv2_qwen.json","w"),indent=1)
for k,v in out.items():
    if k not in("turn2_text","trim_conv"): print("=====",k,"\n",v)
