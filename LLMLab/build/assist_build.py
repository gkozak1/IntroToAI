"""Build data/assist-data.js for tabs 8 (Assistant) and 9 (Think & Act).

Inputs: the recordings made on Oct 18, 2026 (JSON files written by the assist_record_*.py scripts in this folder's
recordings/ subfolder) and the two tokenizers (SmolLM2-135M-Instruct, Qwen3-0.6B), used only to split each message
into tokens for "Show the tokens". Every recorded output is used as recorded; the only display changes are
markdown bold, LaTeX equations rendered as plain text, and the trimming of very long text where noted on screen.

Usage: python3 assist_build.py <recordings_dir> <smollm_instruct_dir> <qwen3_dir> <out_js>
"""
import json, re, sys
from transformers import AutoTokenizer

REC, SMOL, QWEN, OUT = sys.argv[1:5]
J = lambda f: json.load(open(f"{REC}/{f}"))
ts = AutoTokenizer.from_pretrained(SMOL); tq = AutoTokenizer.from_pretrained(QWEN)

SUB = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
def latex_plain(t):
    """$$ ... $$ blocks (chemistry equations) -> plain text with subscripts."""
    def conv(m):
        s = m.group(1)
        s = re.sub(r"\\text\{([^}]*)\}", r"\1", s)
        s = s.replace("\\rightarrow", "→").replace("\\,", "")
        s = re.sub(r"_\{(\d+)\}", lambda x: x.group(1).translate(SUB), s)
        s = re.sub(r"_(\d)", lambda x: x.group(1).translate(SUB), s)
        s = re.sub(r"\s+", " ", s).strip()
        return "\n" + s + "\n"
    return re.sub(r"\$\$(.*?)\$\$", conv, t, flags=re.S)
def clean(t):
    return re.sub(r"\n{3,}", "\n\n", latex_plain(t.replace("<|im_end|>", "").replace("<|endoftext|>", ""))).strip()
def toks(tok, text):
    """the real tokens, sliced from the text by offsets so a character split across tokens is never shown broken"""
    enc = tok(text, add_special_tokens=False, return_offsets_mapping=True)
    out, last = [], -1
    for a, b in enc["offset_mapping"]:
        if a < last: continue          # later pieces of a character already shown
        out.append(text[a:b]); last = b
    return out
def raw(t):
    return t.replace("<|im_end|>", "").replace("<|endoftext|>", "").strip()
def block(role, label, text, tok, extra=None, source=None):
    """text = what students read (bold and equations rendered); tokens = the real tokens of the recorded text"""
    b = {"role": role, "label": label, "text": text, "tokens": toks(tok, raw(source) if source is not None else text)}
    if extra: b.update(extra)
    return b

D = {"recorded": "Oct 18, 2026"}

# ---------- Screen 1: Before & After (SmolLM2-135M base vs Instruct, chat format) ----------
i1d = J("inv1d.json")
def tally(runs):
    lst = sum(bool(re.search(r"\b1\.", r) and re.search(r"\b3\.", r)) for r in runs)
    stop = sum(r.endswith("<|im_end|>") for r in runs)
    user = sum(bool(re.search(r"user\s*\n", r)) for r in runs)
    return {"list": lst, "stop": stop, "user": user}
D["s1"] = {
    "system": "You are a helpful AI assistant named SmolLM, trained by Hugging Face",
    "user": "Give me three tips for studying.",
    "promptTokens": len(ts(i1d["prompt"]).input_ids),
    "chatTokens": [ts.decode([i]) for i in ts(i1d["prompt"]).input_ids],
    "base": [r.replace("<|endoftext|>", "") for r in i1d["base"]],
    "inst": [r for r in i1d["instruct"]],
    "tally": {"base": tally(i1d["base"]), "inst": tally(i1d["instruct"])},
    "show": 19,
    "settings": {"params": "134,515,008", "vocab": "49,152 tokens", "window": "8,192 tokens", "temp": "0.7", "topk": "50", "max": 150},
    "plainEmpty": 14,
}

# ---------- Screen 2: Inside a Conversation (Qwen3-0.6B, non-thinking, greedy) ----------
q2 = J("inv2_qwen.json"); q2b = J("inv2_qwen_b.json"); tr = J("inv2_trim2.json")[0]
SYS = "You are a helpful assistant."
MEM = "Their name is Jordan. Jordan likes answers that are one or two sentences long."
D["s2"] = {
    "history": [block("system", "System", SYS, tq), block("user", "User", "Explain photosynthesis.", tq),
                block("assistant", "Assistant", clean(q2["turn1"]), tq, source=q2["turn1"]), block("user", "User", "Can you make that simpler?", tq)],
    "withReply": block("assistant", "Reply", clean(q2["turn2_with_history"]), tq, source=q2["turn2_with_history"]),
    "noHistory": [block("system", "System", SYS, tq), block("user", "User", "Can you make that simpler?", tq)],
    "noReply": block("assistant", "Reply", clean(q2["turn2_no_history"]), tq, source=q2["turn2_no_history"]),
    "fullTokens": len(tq(q2["turn2_text"]).input_ids),
    "thatShare": q2["that_share"],
    "memory": {"note": block("memory", "Saved memory", MEM, tq),
               "without": [["Explain photosynthesis.", clean(q2b["no_memory_photo"])], ["Do you know my name?", clean(q2b["no_memory_name"])]],
               "with": [["Explain photosynthesis.", clean(q2b["memory_photo"])], ["Do you know my name?", clean(q2b["memory_name"])]]},
    "trim": {"conv": [block(m["role"], m["role"].capitalize(), clean(m["content"]), tq, source=m["content"]) for m in tr["conv"]],
             "ask": block("user", "User", "What is my dog's name?", tq),
             "full": block("assistant", "Reply", clean(tr["full"]), tq, source=tr["full"]), "trimmed": block("assistant", "Reply", clean(tr["trim"]), tq, source=tr["trim"]),
             "tokensFull": tr["tokens_full"], "tokensTrim": tr["tokens_trim"], "window": "40,960"},
}

# ---------- Screen 3: Think & Use Tools (Qwen3-0.6B) ----------
d3 = J("inv3d.json"); dd = J("inv3_238_think.json"); ti = J("inv34_tools_instr_a.json"); tn = J("inv34_tools_noinstr.json")
ag2 = J("inv34_agent2.json"); ag4 = J("inv34_agent4.json"); ag6 = J("inv34_agent6.json")
think = [x for x in dd if x["mode"] == "thinking"][0]
greedy = [x for x in dd if x["mode"] == "direct" and x["seed"] == "greedy"][0]
th = think["text"].split("</think>")[0].replace("<think>", "").strip()
P3 = "A school orders 238 boxes of 47 pencils each and gives out 7,869 pencils. How many pencils are left?"
def steps_of(run):
    out = []
    for s in run["steps"]:
        if "model" in s:
            if "<tool_call>" in s["model"]: continue
            out.append({"kind": "answer", "text": clean(s["model"])})
        else:
            r = s["result"]
            if s["tool"] == "search":
                d = json.loads(r); out.append({"kind": "search", "query": s["args"]["query"], "title": d["title"], "url": d["url"], "text": d["text"]})
            else:
                out.append({"kind": "calc", "expr": s["args"]["expression"], "result": r})
    return out
def rounds(run):
    """group tool calls by the model turn that requested them"""
    R = []; cur = None
    for s in run["steps"]:
        if "model" in s:
            calls = re.findall(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", s["model"], re.S)
            if calls: cur = {"calls": [], "results": []}; R.append(cur); cur["calls"] = [json.loads(c) for c in calls]
            else: R.append({"answer": clean(s["model"])})
        else:
            r = s["result"]
            cur["results"].append(json.loads(r) if s["tool"] == "search" else {"calc": r})
    return R
D["s3"] = {
    "problem": P3, "answer": 3317, "product": 11186,
    "direct": {"text": clean(greedy["text"]), "tokens": 8},
    "steps": {"text": clean(d3[0]["text"]), "tokens": d3[0]["ntok"], "wrongProduct": "11,206", "final": "3,337"},
    "think": {"text": th, "tokens": think["think_tokens"], "answerTokens": think["ntok"] - think["think_tokens"], "minutes": round(think["secs"] / 60),
              "highlights": ["30 boxes is 1,260 pencils", "Wait, let me check that again.", "plus 376 is 11,186"], "final": "3,317"},
    "tool": {"system": "Always use the calculate tool for arithmetic.", "expr": "238 × 47 − 7,869", "rawExpr": "238 * 47 - 7869", "result": "3317",
             "final": clean(ti["pencil_tool"]["steps"][-1]["model"]),
             "rawReq": '<tool_call>\n{"name": "calculate", "arguments": {"expression": "238 * 47 - 7869"}}\n</tool_call>',
             "rawRes": "<tool_response>\n3317\n</tool_response>",
             "noInstr": clean(tn["pencil_tool"]["steps"][-1]["model"])},
    "agentOk": {"q": ag6["seq0"]["question"], "rounds": rounds(ag6["seq0"]), "note": "One tool request per turn: each turn stops after the model writes a request, so it sees each result before deciding its next step."},
    "agentBad": {"q": ag4["agent_k2_seq2"]["question"], "rounds": rounds(ag4["agent_k2_seq2"])},
}

# ---------- Screen 4: Which Answer? ----------
passage = json.loads(ti["everest_retrieval"]["steps"][1]["result"])
D["s4"] = {
    "A": {"prompt": "How tall is Mount Everest? Explain carefully.", "text": clean(tn["everest_long_no_source"]),
          "claims": ["8,848.86 meters", "in the Indian Himalayas"]},
    "B": {"prompt": "How tall is Mount Everest? Cite your source.", "text": clean(tn["everest_retrieval"]["steps"][-1]["model"]),
          "claims": ["8,848.86 meters", "National Geodetic Survey of India", "World Meteorological Organization"]},
    "C": {"prompt": "How tall is Mount Everest? Cite your source.", "text": clean(ti["everest_retrieval"]["steps"][-1]["model"]),
          "claims": ["8,848.86 meters", "a joint survey conducted by Nepalese and Chinese authorities in 2020", "Wikipedia article on Mount Everest"],
          "search": "Mount Everest height", "passage": passage},
    "evidence": [
        {"src": "Wikipedia, “Mount Everest”", "url": "https://en.wikipedia.org/wiki/Mount_Everest",
         "text": "Its height was most recently measured in 2020 through a joint survey by Nepalese and Chinese authorities as 8,848.86 m. The China–Nepal border runs across its summit."},
        {"src": "Kathmandu Post, Dec 8, 2020", "url": "https://kathmandupost.com/national/2020/12/08/it-s-official-mount-everest-is-8-848-86-metres-tall",
         "text": "8,848.86 metres is the new official height, announced at the same time in Kathmandu and Beijing by the foreign ministers of Nepal and China."},
        {"src": "Al Jazeera, Dec 8, 2020", "url": "https://www.aljazeera.com/news/2020/12/8/mt-everest-nepal-china-announce-revised-height-at-8848-metres",
         "text": "“The new official height is 8,848.86 metres (29,032 feet)…”"},
    ],
    "verdict": {"A": "Height supported. Location contradicted: Everest is on the Nepal–China border, not in the Indian Himalayas.",
                "B": "Height supported. Neither named source appears in the evidence; the model never looked anything up.",
                "C": "Height and survey supported, and its source is one you can open."},
}

js = "/* LLM Lab tabs 8 and 9: real recorded outputs (built by build/assist_build.py). Do not edit by hand. */\nwindow.NT_ASSIST = " + json.dumps(D, ensure_ascii=False) + ";\n"
open(OUT, "w").write(js)
print(OUT, len(js) // 1024, "KB")
