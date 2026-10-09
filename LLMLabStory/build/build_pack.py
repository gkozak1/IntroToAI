import json, sys
L=json.loads(open('LLMLab/data/lab-data.js').read()[len('window.LAB='):-1])
E=json.loads(open('LLMLab/data/embed-data.js').read()[len('window.EMBED_DATA='):].split(';\nwindow.EMBED_DATA.raw=')[0])
keep_ex={k:L['examples'][k] for k in ['banker','river']}
for k in keep_ex.values(): k.pop('next',None) if False else None
pack={'examples':keep_ex,'context':L['context'],'rounds':L['rounds'],'training':L['training'],'exact':L['exact'],'wpe':L['wpe'],'wpeFirst':L['wpeFirst'],
      'tok':{'tokens':E['tokens'],'merges':E['merges']},
      'meaning':{'coords':E['coords'],'coordScale':E['coordScale'],'analogies':E['analogies']}}
s='window.PACK='+json.dumps(pack,separators=(',',':'))+';'
open('story/data/pack.js','w').write(s); print(len(s)/1e6,'MB')
