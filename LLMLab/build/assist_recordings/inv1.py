import torch, json, sys
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]
out={}
prompt="User: Give me three tips for studying. Assistant:"
for name in ["base","instruct"]:
    p=f"{S}/SmolLM2-135M/{name}/configs"
    tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,torch_dtype=torch.float32).eval()
    n=sum(x.numel() for x in m.parameters())
    ids=tok(prompt,return_tensors="pt").input_ids
    res={}
    for label,kw in [("greedy",dict(do_sample=False)),("t07_seed1",dict(do_sample=True,temperature=0.7,top_k=50,top_p=1.0))]:
        torch.manual_seed(1)
        g=m.generate(ids,max_new_tokens=120,pad_token_id=tok.eos_token_id,**kw)
        res[label]=tok.decode(g[0][ids.shape[1]:],skip_special_tokens=False)
    # chat-template run for instruct only
    if name=="instruct":
        msgs=[{"role":"user","content":"Give me three tips for studying."}]
        t=tok.apply_chat_template(msgs,tokenize=False,add_generation_prompt=True)
        ids2=tok(t,return_tensors="pt").input_ids
        g=m.generate(ids2,max_new_tokens=150,do_sample=False,pad_token_id=tok.eos_token_id)
        res["chat_template_text"]=t; res["chat_greedy"]=tok.decode(g[0][ids2.shape[1]:],skip_special_tokens=False)
    out[name]=dict(params=n,vocab=len(tok),ctx=m.config.max_position_embeddings,layers=m.config.num_hidden_layers,heads=m.config.num_attention_heads,hidden=m.config.hidden_size,prompt_tokens=tok.convert_ids_to_tokens(ids[0]),**res)
json.dump(out,open(f"{S}/rec/inv1.json","w"),indent=1)
for k,v in out.items():
    print("=====",k,v["params"],v["vocab"],v["ctx"])
    for kk in ["greedy","t07_seed1","chat_template_text","chat_greedy"]:
        if kk in v: print("--",kk,"\n",v[kk])
