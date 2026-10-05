"""Evidence schema/staleness checker, NOT a natural-language proof verifier."""
from pathlib import Path
import copy
import datetime as dt
import json
import sys
import kernel as K

HERE=Path(__file__).resolve().parent
FOUNDATIONS=HERE.parents[1]
ALLOWED={'not_run','passed','failed','unsupported','resource_exhausted'}
LABELS={'DEF','PROOF','REF','FINITE','ILLUSTRATION','NOT-CLAIMED'}

def save(path,obj):
    Path(path).parent.mkdir(parents=True,exist_ok=True)
    Path(path).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def location(filename,anchor):
    p=FOUNDATIONS/filename
    text=p.read_text(encoding='utf-8')
    K.need(anchor in text,'missing source anchor '+anchor)
    return {'path':filename,'anchor':anchor,'line':text[:text.index(anchor)].count('\n')+1,'sha256':K.file_hash(p)}

def pinned(path):
    return {'path':str(path.relative_to(FOUNDATIONS)).replace('\\','/'),'sha256':K.file_hash(path)}

def refresh():
    sources=[
      {'id':'S01','title':'Henkin, Completeness in the Theory of Types (1950)',
       'url':'https://aaronxyliu.github.io/download/PL/Henkin.pdf','review_level':'partial_full_text',
       'checked_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'printed_pages':[83,84,85],'pdf_pages':[4,5,6],
       'location':'axiom 11 / logical constant interpretation; general model definition; Theorem 1',
       'basis':'web PDF extracted text, local appendix B independently compared; not a full paper audit',
       'finding':'Original calculus includes choice facilities. General-model theorem is not a direct certificate for the no-default-choice MCS subset.',
       'version':'JSL 15(2),81-91,DOI:10.2307/2266967','source_file_sha256':None,
       'boundary':'No local PDF hash captured by web reader; printed/PDF positions refer to accessed 12-page scan.'},
      {'id':'S07','title':'Harrison, Towards self-verification of HOL Light',
       'url':'https://www.cl.cam.ac.uk/~jrh13/papers/holhol.pdf','review_level':'partial_full_text',
       'checked_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'printed_pages':None,'pdf_pages':[1,2],
       'location':'abstract and section 2 LCF opening',
       'basis':'author-hosted PDF extracted text; no complete proof or versioned source audit',
       'finding':'Separates logic and implementation validation; historical modeled core excludes definitions.',
       'version':'author-hosted 15-page manuscript; publication version not newly verified','source_file_sha256':None,
       'boundary':'Not evidence that this Python kernel is formally verified.'},
      {'id':'R03-b','title':'Prestel–Delzell, Mathematical Logic and Model Theory, section 1.5',
       'url':None,'review_level':'inherited_local_register','printed_pages':'36–46','pdf_pages':'46–56',
       'location':'Appendix B R03-b; evidence/foundations_prestel_verified.txt',
       'basis':'Appendix B registration and extraction-file inventory inspected; this extraction does not contain the cited section1.5 pages; original pages not re-read this run',
       'finding':'First-order baseline remains an explicit external mathematical dependency.',
       'version':'local reference edition registered in B.1','source_file_sha256':None,
       'boundary':'Does not by itself verify the Python implementation or all many-sorted translation obligations.'}
    ]
    save(HERE/'sources-audit.json',{'schema':'mcs-source-audit/1','sources':sources,
      'advice_search_mismatches':'References 1,2,4 in the advice are not adopted as HOL engineering evidence; empty lambda-lifting search is not evidence of absence.',
      'truncated_conclusion':'No requirements inferred after the final word 以及.'})
    obligations=[]
    for ident,chapter,anchor,code,boundary in [
      ('O-TYPE','02-对象语言：简单类型论.md','命题 2.8','infer, canonical, object_substitute','all supported well-typed inputs'),
      ('O-LIFT','03-语义：Henkin与标准.md','命题 3.7','lift, axiom(abstraction)','all type trees, terms and legal valuations'),
      ('O-SUBST','02-对象语言：简单类型论.md','翻译—替换交换','fsub, term_sub','translation/substitution equality is provable, not syntactic identity'),
      ('O-RULES','03-语义：Henkin与标准.md','定理 3.9','check.visit','rule preservation incl. discharge/eigenvariables'),
      ('O-DEFINITIONS','03-语义：Henkin与标准.md','命题 3.13','environment','old-language closed term definitions only'),
      ('O-MODELS','03-语义：Henkin与标准.md','命题 3.8','no general machine model construction','general externalization and lambda closure'),
      ('O-COMPLETENESS','03-语义：Henkin与标准.md','定理 3.9','unsupported full calculus','subset has no completeness claim')]:
        obligations.append({'id':ident,'source':location(chapter,anchor),'implementation':code,
          'natural_language_proof':'present; depends on stated hypotheses and references',
          'implementation_correspondence_review':'finite/manual only' if ident not in ['O-MODELS','O-COMPLETENESS'] else 'not implemented',
          'machine_meta_proof':'not_run','remaining':boundary})
    save(HERE/'obligations.json',{'schema':'mcs-proof-obligations/1','obligations':obligations})
    claims=[]
    def add(ident,filename,anchor,statement,assumptions,semantic_scope,labels,**kw):
        row={'id':ident,'source':location(filename,anchor),'statement':statement,'assumptions':assumptions,
             'semantic_scope':semantic_scope,'evidence_labels':labels,'dependencies':[],
             'reference_ids':[],'unresolved_premises':[], 'check_status':'not_run',
             'mathematical_proof':'not_claimed','machine_certificate_accepted':False,
             'kernel_formally_verified':False,'finite_bound':None,'synthetic':False,
             'unsupported_generalizations':[],'next_obligation':'review the stated scope',
             'manual_review':'Open source at the anchor and inspect hypotheses and argument.',
             'checks':[]}
        row.update(kw); claims.append(row); return row
    add('DEF-LANGUAGE','02-对象语言：简单类型论.md','定义 2.1','Implementation represents finite simply typed terms and a distinct sorted certification language.',
        ['explicit finite base/constant signature','finite bounded JSON syntax'],'syntax, not semantic truth',['DEF','FINITE'],
        check_status='passed',finite_bound='35 enumerated terms, sizes1..5, binder depth<=2; 175 valuations comparisons; see kernel-report',
        checks=[{'command':'python mcs-foundations/validation/certification/test_kernel.py','output':pinned(HERE/'kernel-report.json')}])
    add('THM-HENKIN','03-语义：Henkin与标准.md','定理 3.9','The full specified ND calculus corresponds to Henkin consequence under the manuscript translation.',
        ['full rules and H_Sigma of chapter02','closed theory, open hypotheses with valuations','classical many-sorted first-order soundness/completeness'],'general Henkin models',['PROOF','REF'],
        dependencies=['DEF-LANGUAGE'],reference_ids=['S01','R03-b'],mathematical_proof='present_in_manuscript',
        unresolved_premises=['implementation-to-calculus preservation not machine proved'],
        unsupported_generalizations=['subset completeness','standard HOL effective completeness'],next_obligation='formal implementation preservation proof; keep first-order metatheorem explicit')
    add('SEM-DIRECTION','03-语义：Henkin与标准.md','例 3.16','The displayed branching-function sentence is standard-valid but false in the displayed Henkin model.',
        ['Boolean auxiliary equivalence universal','individual domain has distinct a,b','arrow domains preserve auxiliary equivalence'],'specific Henkin countermodel and all standard models',['PROOF'],mathematical_proof='present_in_manuscript',next_obligation='machine formalization of the general logical-relations construction')
    add('REF-KERNEL','B-文献证据表.md','S07','Harrison is a proof-engineering comparison, not a certificate of MCS correctness.',
        ['only the stated author-paper passages checked'],'bibliographic and local text review',['REF'],reference_ids=['S07'],next_obligation='audit versioned source only if an external prover is integrated')
    add('RULES-FINITE','02-对象语言：简单类型论.md','定义 2.12','Implemented ND subset rejects the enumerated attacks and matches the recorded finite reference cases.',
        ['kernel.py current hash','explicit finite theories','resource bounds and submitted examples'],'finite regression',['FINITE'],
        check_status='passed',dependencies=['DEF-LANGUAGE'],finite_bound='kernel-report: finite positive/negative suite; 35 terms,175 comparisons,42 case valuations,11 background schemas,2 mutations',
        checks=[{'command':'python mcs-foundations/validation/certification/test_kernel.py','output':pinned(HERE/'kernel-report.json')}],
        next_obligation='independent general soundness proof of implementation',unsupported_generalizations=['all input soundness','full calculus completeness'])
    for name,filename in [('group','cases/04-群概念的多来源.md'),('limit','cases/01-极限与连续.md'),('manifold','cases/02-Ck与光滑流形.md'),('tensor','cases/03-张量与张量场.md')]:
        path=HERE/'certificates'/f'{name}.json'; bundle=K.load(path); result=K.check(bundle)
        receipt=HERE/'receipts'/f'{name}.json'; save(receipt,result)
        add('CASE-'+name,filename,'## 1',{'formal_conclusion':result['conclusion'],'object_conclusion':result['object_conclusion'],'scope':'actual mathematical fragment; see CASES.md'},
            {'theory':bundle['theory'],'open_hypotheses':result['open_hypotheses']},'specified theory, typed free parameters and open hypotheses',['PROOF','FINITE'],
            dependencies=['RULES-FINITE'],check_status='passed',mathematical_proof='fragment argument in CASES.md',
            machine_certificate_accepted=True,certificate={'input':pinned(path),'output':pinned(receipt),'proof_id':bundle['target'],'checker':K.VERSION,'checker_sha256':K.file_hash(HERE/'kernel.py')},
            finite_bound='one submitted proof DAG; independent example valuations documented in kernel-report',
            checks=[{'command':f'python mcs-foundations/validation/certification/kernel.py mcs-foundations/validation/certification/certificates/{name}.json','output':pinned(receipt)}],
            unsupported_generalizations=['complete case bridge','kernel meta-proof','personal mastery'],next_obligation='full mathematical libraries and remaining bridge steps in CASES.md')
    add('ACTION-MATCH','D-接口契约.md','D.3','Standalone adapter requires a replayed certificate matching the public conclusion, theory, hypotheses, types and versions.',
        ['fixed public action fixture','declared assumptions retain provenance'],'public conditional resources, not learner knowledge',['DEF','FINITE'],check_status='passed',
        dependencies=['CASE-group','CASE-limit','CASE-manifold','CASE-tensor'],finite_bound='four positive actions and five rejection scenarios',
        checks=[{'command':'python mcs-foundations/validation/certification/actions.py','output':pinned(HERE/'action-report.json')}],next_obligation='optional site integration and general adapter proof')
    add('RESEARCH-MODEL','07-软关系与认知状态.md','定义 7.8','Fixed synthetic Beta observation model runs participant/time holdout evaluation; stipulated action transitions preserve Unknown.',
        ['synthetic fixed seed20260929','model assumptions in research-input.json','no real participants'],'workflow validation',['DEF','ILLUSTRATION','FINITE'],
        check_status='passed',synthetic=True,finite_bound='36 simulated participants,24 items,864 rows; two fixed splits',
        checks=[{'command':'python mcs-foundations/validation/certification/research.py','output':pinned(HERE/'research-report.json')}],next_obligation='real protocol and external validation',unsupported_generalizations=['measurement validity','causal effect'])
    add('REP-COMPARE','16-开放问题.md','需要比较什么','Typed action graph, annotated bipartite graph and MCS agree on the fixed bounded comparison; plain all-incoming dependency encoding loses distinctions.',
        ['same content/actions/goal/budget','explicit baseline encodings','independent unknown-completion reference'],'finite representation capacity',['FINITE'],check_status='passed',
        finite_bound='4 actions,85 words length0..3,27 availability states,2295 candidates per representation, budget3',
        checks=[{'command':'python mcs-foundations/validation/certification/research.py','output':pinned(HERE/'research-report.json')}],next_obligation='larger independently implemented comparisons',unsupported_generalizations=['unique MCS advantage','all graph models insufficient'])
    add('NONIDENTIFICATION','16-开放问题.md','反例 16.1','Same observed a histories allow opposite untried b predictions.',
        ['two explicitly specified deterministic models','observations contain only action a'],'model nonidentification example',['PROOF','FINITE'],mathematical_proof='present_in_manuscript',check_status='passed',
        finite_bound='history lengths0..4; one b probe; general counterexample argued in manuscript',checks=[{'command':'python mcs-foundations/validation/certification/research.py','output':pinned(HERE/'research-report.json')}])
    add('REMAINING','15-验证与完成标准.md','15.6','Full HOL, kernel machine metaproof, complete four bridges and empirical learning claims remain uncompleted.',
        ['current scoped delivery'],'completion boundaries',['NOT-CLAIMED'],next_obligation='see obligations.json and DELIVERY.md')
    artifacts=[]
    for path in sorted(HERE.glob('*.py')):
        artifacts.append(pinned(path))
    for name in ['actions-fixture.json','research-input.json','sources-audit.json','obligations.json','DESIGN.md','CASES.md','RESEARCH.md']:
        artifacts.append(pinned(HERE/name))
    manifest={'schema':'mcs-assertion-evidence/1','recorded_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
              'checker':K.VERSION,'python':sys.version,'artifacts':artifacts,'claims':claims,
              'scope_note':'Evidence labels are independent responsibilities; check_status is separate. Hashes identify artifacts, not proof of natural-language correctness.'}
    save(HERE/'claims.json',manifest)
    print(json.dumps({'registered_claims':len(claims),'status':'recorded'}))

def validate(manifest,replay=True):
    def pin(item):
        path=(FOUNDATIONS/item['path']).resolve()
        K.need(path.is_relative_to(FOUNDATIONS),'out-of-scope artifact')
        K.need(path.is_file(),'dangling artifact: '+item['path'])
        K.need(K.file_hash(path)==item['sha256'],'stale artifact: '+item['path'])
        return path
    for a in manifest['artifacts']: pin(a)
    claims=manifest['claims']; ids={c['id'] for c in claims}; K.need(len(ids)==len(claims),'duplicate assertion ID')
    source_ids={r['id'] for r in K.load(HERE/'sources-audit.json')['sources']}
    for c in claims:
        K.need('assumptions' in c and c['assumptions'] is not None,'missing assumptions')
        K.need(c['statement'] and c['semantic_scope'],'missing statement or semantic scope')
        K.need(c['check_status'] in ALLOWED,'unknown check status')
        K.need(set(c['evidence_labels'])<=LABELS and c['evidence_labels'],'invalid evidence labels')
        K.need(all(d in ids for d in c['dependencies']),'dangling claim dependency')
        path=pin(c['source']); K.need(c['source']['anchor'] in path.read_text(encoding='utf-8'),'source anchor disappeared')
        K.need('FINITE' not in c['evidence_labels'] or c['finite_bound'],'finite claim lacks boundary')
        K.need('REF' not in c['evidence_labels'] or (c['reference_ids'] and all(r in source_ids for r in c['reference_ids'])),'missing or dangling source reference')
        K.need(c['kernel_formally_verified'] is False,'unsupported kernel meta-proof claim')
        if c['check_status']=='passed': K.need(bool(c['checks']),'passed status lacks check entry')
        for check in c['checks']:
            output_path=pin(check['output']); K.need(check['command'],'missing replay command')
            if c['check_status']=='passed':
                K.need(K.load(output_path).get('status')=='passed','passed assertion points to a nonpassing result')
        if c['machine_certificate_accepted']:
            cert=c.get('certificate'); K.need(bool(cert),'machine claim without replayable certificate')
            K.need(c['check_status']=='passed','accepted certificate with inconsistent status')
            K.need(cert['checker']==K.VERSION and cert['checker_sha256']==K.file_hash(HERE/'kernel.py'),'stale checker version')
            source=pin(cert['input']); output=pin(cert['output'])
            if replay:
                actual=K.check(K.load(source),cert['proof_id']); K.need(actual==K.load(output),'receipt does not match replay')
                K.need(c['statement']['formal_conclusion']==actual['conclusion'] and c['assumptions']['open_hypotheses']==actual['open_hypotheses'],'claim mismatches certificate')
    # Dependency closure must be a DAG even if all references exist.
    graph={c['id']:c['dependencies'] for c in claims}; done=set()
    def visit(n,active):
        K.need(n not in active,'cyclic evidence dependency')
        if n not in done:
            for d in graph[n]: visit(d,active|{n})
            done.add(n)
    for n in graph: visit(n,set())
    return len(claims)

def check():
    manifest=K.load(HERE/'claims.json'); count=validate(manifest)
    attacks=[]
    def probe(name,mutate):
        m=copy.deepcopy(manifest); mutate(m)
        try: validate(m,replay=False)
        except K.CheckError as e: attacks.append({'case':name,'rejected':str(e)})
        else: raise AssertionError('evidence attack accepted: '+name)
    probe('dangling_reference',lambda m:m['claims'][0]['dependencies'].append('absent'))
    probe('missing_assumptions',lambda m:m['claims'][0].pop('assumptions'))
    probe('missing_finite_boundary',lambda m:m['claims'][0].update(finite_bound=None))
    probe('machine_claim_without_certificate',lambda m:m['claims'][0].update(machine_certificate_accepted=True))
    probe('stale_checker',lambda m:next(c for c in m['claims'] if c['machine_certificate_accepted'])['certificate'].update(checker='old'))
    probe('stale_input',lambda m:m['artifacts'][0].update(sha256='old'))
    probe('unproved_kernel_claim',lambda m:m['claims'][0].update(kernel_formally_verified=True))
    probe('cyclic_evidence',lambda m:m['claims'][0]['dependencies'].append(m['claims'][0]['id']))
    save(HERE/'evidence-report.json',{'status':'passed','claims':count,'manifest_sha256':K.file_hash(HERE/'claims.json'),'negative_checks':attacks,'boundary':'schema, pinned artifacts and machine replays only; no automatic natural-language/source applicability judgment'})
    print(json.dumps({'status':'passed','claims':count,'negative_checks':len(attacks)}))

if __name__=='__main__':
    if sys.argv[1:]==['refresh']: refresh()
    elif sys.argv[1:]==['check']: check()
    else: raise SystemExit('Use evidence.py refresh | check. Refresh is an explicit evidence-recording action, not part of check.')
