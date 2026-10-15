import onnx, numpy as np, sys
from onnx import numpy_helper
m=onnx.load(sys.argv[1], load_external_data=False)
inits={i.name:i for i in m.graph.initializer}
W={}
for k,v in inits.items():
    if k.startswith('model.transformer.') and 'attn.bias' not in k.replace('c_attn.bias','X').replace('c_proj.bias','Y') or k.endswith('c_attn.bias') or k.endswith('c_proj.bias'):
        if k.endswith('.attn.bias'): continue
        W[k.replace('model.transformer.','')]=numpy_helper.to_array(v).astype(np.float32)
for nd in m.graph.node:
    if nd.op_type=='MatMul':
        for x in nd.input:
            if x.startswith('onnx::') and x in inits:
                name=nd.name.strip('/').replace('model/','').replace('/','.').replace('.MatMul','')+'.weight'
                W[name]=numpy_helper.to_array(inits[x]).astype(np.float32)
print(len(W)); print(sorted(k for k in W if not k.startswith('h.'))); print([k for k in W if k.startswith('h.0.')])
np.savez('gpt2_weights.npz',**W)
