import torch, json, sys, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; p=f"{S}/qwen3"; torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
CORPUS=[
 {"title":"Mount Everest (Wikipedia)","url":"https://en.wikipedia.org/wiki/Mount_Everest","text":"Its height was most recently measured in 2020 through a joint survey by Nepalese and Chinese authorities as 8,848.86 m (29,031 ft 8½ in)."},
 {"title":"K2 (Wikipedia)","url":"https://en.wikipedia.org/wiki/K2","text":"K2 is the second-highest mountain on Earth, at 8,611 metres (28,251 ft) above sea level."},
]
def search(query):
    qw=set(re.findall(r"\w+",query.lower()))
    best=max(CORPUS,key=lambda d:len(qw & set(re.findall(r"\w+",(d["title"]+" "+d["text"]).lower()))))
    return json.dumps(best)
def calculate(expression):
    e=expression.replace("×","*").replace(",","")
    if not re.fullmatch(r"[\d\.\s\+\-\*/\(\)]+",e): return "error"
    v=eval(e); return str(round(v,4))
TOOLS={"search":search,"calculate":calculate}
SCHEMA=[{"type":"function","function":{"name":"calculate","description":"Evaluate an arithmetic expression and return the result.","parameters":{"type":"object","properties":{"expression":{"type":"string","description":"For example 12*7-3"}},"required":["expression"]}}},
        {"type":"function","function":{"name":"search","description":"Search a small library of saved reference pages and return the best matching passage with its source.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}}]
def agent(question,tools,maxsteps=6):
    msgs=[{"role":"user","content":question}]; steps=[]
    for _ in range(maxsteps):
        t=tok.apply_chat_template(msgs,tools=tools,tokenize=False,add_generation_prompt=True,enable_thinking=False)
        ids=tok(t,return_tensors="pt").input_ids
        g=m.generate(ids,max_new_tokens=200,do_sample=False,pad_token_id=tok.eos_token_id)
        out=tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True).strip()
        calls=re.findall(r"<tool_call>\s*(\{.*?\})\s*</tool_call>",out,re.S)
        msgs.append({"role":"assistant","content":out}); steps.append({"model":out})
        if not calls: break
        for c in calls:
            c=json.loads(c); r=TOOLS[c["name"]](**c["arguments"])
            msgs.append({"role":"tool","content":r}); steps.append({"tool":c["name"],"args":c["arguments"],"result":r})
    final_text=tok.apply_chat_template(msgs,tools=tools,tokenize=False,enable_thinking=False)
    return dict(question=question,steps=steps,context_text=final_text,context_tokens=len(tok(final_text).input_ids))
res={}
res["pencil_tool"]=agent("A school orders 238 boxes of 47 pencils each and gives out 7,869 pencils. How many pencils are left?",[SCHEMA[0]])
res["everest_retrieval"]=agent("How tall is Mount Everest? Cite your source.",[SCHEMA[1]])
res["agent_everest_k2"]=agent("How much taller is Mount Everest than K2, in meters? Look up both heights.",SCHEMA)
# long, unsourced answer
t=tok.apply_chat_template([{"role":"user","content":"How tall is Mount Everest? Explain carefully."}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
ids=tok(t,return_tensors="pt").input_ids; g=m.generate(ids,max_new_tokens=300,do_sample=False,pad_token_id=tok.eos_token_id)
res["everest_long_no_source"]=tok.decode(g[0][ids.shape[1]:],skip_special_tokens=True)
json.dump(res,open(f"{S}/rec/inv34_tools.json","w"),indent=1)
for k,v in res.items():
    print("=====",k)
    if isinstance(v,dict):
        for s in v["steps"]: print(json.dumps(s)[:600])
        print("context tokens",v["context_tokens"])
    else: print(v)
