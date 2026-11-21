"""Finite M/L checks; the six-level checker is preserved in publication/."""
from pathlib import Path
import hashlib
import itertools
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent

def main():
    checks=[]
    def record(id,detail,instances=1):
        checks.append(dict(id=id,status='passed',instances=instances,detail=detail))
    docs={}
    sources=sorted((ROOT/'mcs-content/objects').rglob('*.md'))+sorted((ROOT/'mcs-content/nodes').rglob('*.md'))
    for path in sources:
        text=path.read_text(encoding='utf-8')
        blocks=re.findall(r'^(`{3,})(mcs-object|mcs-node)\n(.*?)^\1\s*$',text,re.M|re.S)
        assert len(blocks)==1,path
        data=json.loads(blocks[0][2]);assert data['id'] not in docs
        docs[data['id']]=data
    objects={k:v for k,v in docs.items() if v['schema']=='mcs-object/1'}
    nodes={k:v for k,v in docs.items() if v['schema']=='mcs-node/1'}
    rank={'atom':0,'molecule':1,'unit':2,'topic':3,'subdiscipline':4}
    assert {o['scale'] for o in objects.values()}==set(rank)
    record('S01_formal_scales','实际源覆盖五级；语法分类由共享内核测试核对。',len(objects))
    assert all('scale' not in n and n['goals'] for n in nodes.values())
    assert all(k not in o for o in objects.values() for k in ['goals','mastery','learnerId'])
    record('S02_M_L_boundary','对象无教学目标/学习者字段，学习节点无尺度。',len(docs))
    allowed={'unit':{'atom','molecule'},'topic':{'unit'},'subdiscipline':{'topic'}}
    edges=[]
    for o in objects.values():
        for r in o['members']:
            assert r['id'] in objects
            child=objects[r['id']]
            assert child['scale'] in allowed[o['scale']]
            assert rank[child['scale']]<rank[o['scale']]
            assert r['version']==child['version'] and r['anchor']=='$'
            edges.append((o['id'],child['id']))
    record('S03_typed_members','成员类型正确、秩严格下降，节点不能成为成员。',len(edges))
    def flat(id):
        o=objects[id]
        return {id} if o['scale'] in ['atom','molecule'] else set().union(*(flat(r['id']) for r in o['members']))
    assert len(flat('obj:group:subdiscipline'))==5
    record('S04_flattening','展开至五个形式表达，不读取节点或个人状态。',5)
    for n in nodes.values():
        for r in n['objects']:
            o=objects[r['id']];assert r['version']==o['version']
            assert r['anchor']=='$' or any(d['id']==r['anchor'] for d in o['declarations'])
    assert sum(any(r['id']=='obj:group:injective' for r in n['objects']) for n in nodes.values())==3
    assert any(len({objects[r['id']]['scale'] for r in n['objects']})>1 for n in nodes.values())
    record('S05_reading_references','同一对象三篇讲解、节点多对象与跨尺度引用。',3)
    count=0
    for size in range(1,4):
        cells=[(g,x) for g in range(size) for x in range(1,size)]
        for values in itertools.product(range(size),repeat=len(cells)):
            table={(g,0):g for g in range(size)};table.update(zip(cells,values))
            rows=[tuple(table[g,x] for x in range(size)) for g in range(size)]
            assert len(set(rows))==size;count+=1
    constant_rows=[tuple(0 for _ in range(2)) for _ in range(2)]
    assert len(set(constant_rows))<2
    record('S06_right_identity','穷举 1–3 元右单位运算均单射，另检查删条件反例；不推断无限情形。',count+1)
    result=subprocess.run(['node','--test','tests/content-documents.test.mjs'],cwd=ROOT/'mcs-web',capture_output=True,text=True,encoding='utf-8')
    (OUT/'scale-protocol-tests.log').write_text(result.stdout+result.stderr,encoding='utf-8')
    assert result.returncode==0,result.stdout+result.stderr
    record('S07_shared_protocol','共享实现正负例：类型、展开、成员、循环、交叉归属、失效引用、版本、非干扰及审阅。')
    binding=objects['obj:group:injective']['lean'][0]
    assert binding['target']=='MCS.Expected.rightUnitInjective'
    assert binding['registrationId']=='lean-group-injective' and binding['review']=='pending'
    record('S08_Lean_boundary','准确声明与目标登记；此脚本不执行 Lean，不改写人工审阅。')
    chapter=(ROOT/'mcs-foundations/09-话题、领域、学科与元理论.md').read_text(encoding='utf-8')
    assert '五级形式尺度' in chapter and '学习节点属于独立公共 L' in chapter
    assert (ROOT/'mcs-foundations/publication/before-20261018-object-node/validation/verify_scale_model.py').exists()
    record('S09_migration','当前五级定义与六级历史脚本分别保存。')
    artifacts=sources+sorted((ROOT/'mcs-content/relations').rglob('*.md'))+[Path(__file__),ROOT/'mcs-web/shared/content-documents.mjs',ROOT/'mcs-web/shared/content-relations.mjs',ROOT/'mcs-web/shared/content-evidence.mjs',ROOT/'mcs-web/tests/content-documents.test.mjs',ROOT/'mcs-web/tests/topology-content.test.mjs']
    report={'scope':'五级形式结构与 M/L 边界的有限检查；不是一般证明。','not_claimed':['一般 HOL—Lean 翻译','Lean 实测（另查报告）','人工对应审阅','教学效果','完整全站迁移'],'checks':checks,'artifacts_sha256':{str(p.relative_to(ROOT)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in artifacts}}
    (OUT/'report-scale-model.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# 五级形式尺度有限核验报告','','执行：`python mcs-foundations/validation/verify_scale_model.py`。Python 标准库加本机 Node 共享协议测试；全部断言通过后才写出本报告。','','| 检查 | 状态 | 实例数 | 结果 |','|---|---|---:|---|']
    lines += [f"| {c['id']} | FINITE / {c['status']} | {c['instances']} | {c['detail']} |" for c in checks]
    lines += ['','源码摘要见 [JSON 报告](report-scale-model.json)。旧报告在 publication/before-20261018-object-node/validation。','']
    (OUT/'REPORT-scale-model.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps({'status':'passed','checks':len(checks),'finite_right_unital_structures':count}))

if __name__=='__main__':main()
