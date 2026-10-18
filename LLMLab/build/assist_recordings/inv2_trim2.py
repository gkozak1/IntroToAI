import torch, json, sys
from transformers import AutoTokenizer, AutoModelForCausalLM
S = sys.argv[1]; p = f"{S}/qwen3"; torch.set_num_threads(2)
tok = AutoTokenizer.from_pretrained(p); m = AutoModelForCausalLM.from_pretrained(p, dtype=torch.float32).eval()
def gen(msgs, n=50):
    t = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True, enable_thinking=False)
    ids = tok(t, return_tensors="pt").input_ids
    g = m.generate(ids, max_new_tokens=n, do_sample=False, pad_token_id=tok.eos_token_id)
    return tok.decode(g[0][ids.shape[1]:], skip_special_tokens=True).strip(), ids.shape[1]
SYS = "You are a helpful assistant."
fillers = ["What is the capital of France?", "How many legs does a spider have?"]
res = []
CASES=[("Hi! My dog's name is Biscuit.","What is my dog's name?","Biscuit"),("Hi! My favorite color is green.","What is my favorite color?","green"),("Hi! I'm Jordan, and I play the trumpet.","What instrument do I play?","trumpet"),("Hi! My name is Jordan.","The user's name is what?","Jordan")]
for intro,ask,key in CASES:
    conv = [{"role": "system", "content": SYS}, {"role": "user", "content": intro}]
    a_, _ = gen(conv, 40); conv.append({"role": "assistant", "content": a_})
    for q in fillers:
        conv.append({"role": "user", "content": q}); a_, _ = gen(conv, 40); conv.append({"role": "assistant", "content": a_})
    full, n1 = gen(conv + [{"role": "user", "content": ask}])
    trim, n2 = gen([conv[0]] + conv[3:] + [{"role": "user", "content": ask}])
    ok = key.lower() in full.lower() and key.lower() not in trim.lower()
    res.append(dict(intro=intro, conv=conv, ask=ask, full=full, trim=trim, tokens_full=n1, tokens_trim=n2, clean=ok))
    print(("CLEAN " if ok else "      ") + f"{intro!r} | {ask!r}\n   FULL: {full}\n   TRIM: {trim}", flush=True)
json.dump(res, open(f"{S}/rec/inv2_trim2.json", "w"), indent=1)
