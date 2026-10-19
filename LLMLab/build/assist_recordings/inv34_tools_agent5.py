import torch, json, sys, re
from transformers import AutoTokenizer, AutoModelForCausalLM
S=sys.argv[1]; p=f"{S}/qwen3"; torch.set_num_threads(2)
tok=AutoTokenizer.from_pretrained(p); m=AutoModelForCausalLM.from_pretrained(p,dtype=torch.float32).eval()
CORPUS=[
 {"title":"Mount Everest (Wikipedia)","url":"https://en.wikipedia.org/wiki/Mount_Everest","text":"Its height was most recently measured in 2020 through a joint survey by Nepalese and Chinese authorities as 8,848.86 m (29,031 ft 8½ in)."},
 {"title":"K2 (Wikipedia)","url":"https://en.wikipedia.org/wiki/K2","text":"K2 is the second-highest mountain on Earth, at 8,611 metres (28,251 ft) above sea level."},
]
STOP={"the","of","a","an","is","what","how","tall","height","high","mount","in","and","to","m","ft","at"}
def search(query):
    qw=set(re.findall(r"\w+",query.lower()))-STOP
    def score(d):
        return 3*len(qw & set(re.findall(r"\w+",d["title"].lower())))+len(qw & set(re.findall(r"\w+",d["text"].lower())))
    best=max(CORPUS,key=score)
    return json.dumps(best)
def calculate(expression):
    e=expression.replace("×","*").replace(",","")
    if not re.fullmatch(r"[\d\.\s\+\-\*/\(\)]+",e): return "error"
    v=eval(e); return str(round(v,4))
TOOLS={"search":search,"calculate":calculate}
SCHEMA=[{"type":"function","function":{"name":"calculate","description":"Evaluate an arithmetic expression and return the result.","parameters":{"type":"object","properties":{"expression":{"type":"string","description":"For example 12*7-3"}},"required":["expression"]}}},
        {"type":"function","function":{"name":"search","description":"Search a small library of saved reference pages and return the best matching passage with its source.","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}}]
SYSI="Always use the calculate tool for arithmetic, even simple subtraction. Always use the search tool to look up facts, one fact per search. Make only one tool call at a time, then wait for its result before deciding what to do next."
def agent(question,tools,maxsteps=6):
    msgs=([{"role":"system","content":SYSI}] if SYSI else [])+[{"role":"user","content":question}]; steps=[]
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
res["seq0"]=agent('How much taller is Mount Everest than K2, in meters? First search for the height of Mount Everest. After you see that result, search for the height of K2. Then use the calculate tool to find the difference.',SCHEMA)
res["seq1"]=agent('I want to know how much taller Mount Everest is than K2, in meters. Look up one mountain at a time, then calculate the difference.',SCHEMA)
res["seq2"]=agent('Find the height of Mount Everest. Then find the height of K2. Then calculate how many meters taller Everest is.',SCHEMA)
json.dump(res,open(f"{S}/rec/inv34_agent5.json","w"),indent=1)
for k,v in res.items():
    print("=====",k)
    for s_ in v["steps"]: print(json.dumps(s_)[:700])
    print("context tokens",v["context_tokens"])
