/**
 * 学科入口笔记的共享编写接口。正文由人工编写的成对段落组成；
 * 这里只统一 Markdown 骨架与引用，不生成数学断言或证据。
 */
export const pair = (zh, en) => ({ zh, en });
export const ENTRY_SOURCES = {
  algebra: { title: 'MIT Algebra I student notes (2021), lectures 1–2', url: 'https://ocw.mit.edu/courses/res-18-011-algebra-i-student-notes-fall-2021/mit18_701f21_full_lec.pdf', location: 'Lectures 1–2, definition of subgroup; subsequent statements below are independently explained, not attributed to unread chapters.' },
  algebraClosure: { title: 'MIT Algebra II student notes (2022), Theorem 28.6', url: 'https://ocw.mit.edu/courses/res-18-012-algebra-ii-student-notes-spring-2022/mit18_702s22_full_lec.pdf#page=126', location: 'Section 28.2, Theorem 28.6 (PDF page 126): statement and opening winding-number argument read; root existence is cited as REF, not proved in this introductory note.' },
  linear: { title: 'Gilbert Strang, Lecture Notes for Linear Algebra', url: 'https://math.mit.edu/~gs/LectureNotes/', location: 'Sections on vector spaces, bases, nullspaces and eigenvalues; public sample and section descriptions, not the full book.' },
  tensor: { title: 'Keith Conrad, Tensor Products', url: 'https://kconrad.math.uconn.edu/blurbs/linmultialg/tensorprod.pdf', location: 'Sections 1–3: multilinearity and the universal property.' },
  set: { title: 'Jonathan Pila, B1.2 Set Theory (2018)', url: 'https://www.maths.ox.ac.uk/system/files/attachments/SetTheoryHT18.pdf', location: 'Selected definitions in Sections 1–3 and 8; Theorems 10.6–10.9 (PDF page 25): powersets, cardinal comparison and Cantor’s argument. Not a full-document reading claim.' },
  logic: { title: 'Oxford B1.1 Logic lecture notes', url: 'https://www.maths.ox.ac.uk/system/files/attachments/B1.1%20Logic%20Lecture%20Notes.pdf', location: 'Propositional soundness/completeness and lectures on first-order syntax, structures and completeness; incompleteness is an explicitly cited metatheorem.' },
  incompleteness: { title: 'Martin Bays, Introspection and Gödel’s theorems', url: 'https://people.maths.ox.ac.uk/bays/teaching/3TP3/notes/5-introspection.html', location: 'Gödel–Rosser G1T statement and surrounding assumptions; Appendix C on effective systems and PA/Q. The source itself omits the Rosser proof; this note cites the result as REF.' },
  presburger: { title: 'Christoph Haase, A Survival Guide to Presburger Arithmetic', url: 'https://www.cs.ox.ac.uk/people/christoph.haase/home/publication/haa-18/haa-18.pdf', location: 'Introduction, PDF pages 1–2: complete effective additive arithmetic and quantifier elimination. Used only as the REF boundary example, not a proof of the general algorithm.' },
  measure: { title: 'MIT 18.125 Measure and Integration (2003)', url: 'https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/pages/lecture-notes/', location: 'Selected definitions and arguments in Lectures 1–2, Lecture 4 Theorem 0.2, Lecture 5 Theorem 0.3 and a.e. equivalence, Lectures 8–9 on measurable sets and the non-measurable example. Not the complete course.' },
  gr: { title: 'David Tong, General Relativity, The Einstein Equations', url: 'https://www.davidtong.org/teaching/general-relativity/grhtml/S4', location: 'Sections on coupling matter, perfect fluids and cosmology; conventions stated explicitly in each note.' },
  analysis: { title: 'Walter Rudin, Principles of Mathematical Analysis, third edition', url: 'https://www.mheducation.me/principles-of-mathematical-analysis-int-l-ed-9780070856134-mea', location: 'Chapters 1, 5–8; publisher bibliography and contents checked, not a claim to have read all proofs. The elementary arguments below are written out independently.' },
  topology: { title: 'MCS point-set topology notes', url: '/nodes/top%3Aspace', location: 'Overview and definitions of open sets, continuity, compactness and connectedness in the current public topology notes.' },
  geometry: { title: 'MCS differentiable-manifold notes', url: '/nodes/top%3Adifferentiable-manifold', location: 'The current public chart-compatibility interface; coordinate and tensor conventions are stated in the linked node notes.' },
  methods: { title: 'MCS cognitive-development methodology', url: '/method', location: 'Motivation, counterexamples, introspection and local-to-global examples in the current MCS methodology and case notes.' },
};

export function note(spec) {
  const required = ['title', 'intuition', 'internal', 'external', 'growth', 'definition', 'example', 'boundary', 'proof', 'application', 'misconception', 'review', 'thought', 'technique'];
  for (const key of required) {
    if (!spec[key]?.zh || !spec[key]?.en) throw new Error(spec.id + ': missing bilingual ' + key);
  }
  return { status: 'DEF', requires: [], ...spec };
}

const HEADINGS = {
  zh: ['总览', '前置知识', '引入与构造动机', '直觉与精确定义', '例子与条件边界', '论证概括与检查', '应用与联动', '常见误解与回看', '思想与方法', '参考资料与证据范围'],
  en: ['Overview', 'Prerequisites', 'Motivation and growth', 'Intuition and precise formulation', 'Examples and conditions', 'Argument overview and checks', 'Applications and connections', 'Misconceptions and review', 'Ideas and methods', 'References and evidence scope'],
};

export function renderEntryNote(spec, locale = 'zh') {
  const h = HEADINGS[locale];
  const text = key => spec[key][locale];
  const zh = locale === 'zh';
  const required = spec.requires.map(id => '[' + id + '](/nodes/' + encodeURIComponent(id) + ')').join(zh ? '、' : ', ');
  const references = spec.sources.map(key => {
    const source = ENTRY_SOURCES[key];
    return '- [' + source.title + '](' + source.url + ') — ' + source.location;
  }).join('\n');
  return [
    '# ' + text('title'),
    '#' + (zh ? (spec.discipline ?? '数学') : 'Mathematics') + ' #' + spec.status,
    '## ' + h[0], text('intuition'),
    '## ' + h[1],
    (zh ? '**必备。** ' : '**Essential.** ') + (required || (zh ? '阅读本页中的集合、运算和符号说明即可开始；遇到未知符号先回到具体例子。' : 'Begin with the sets, operations and notation explained here; use the concrete example when a symbol is unfamiliar.')),
    zh ? '**辅助。** 先计算本页的例子，再比较定义中的条件。\n\n**拓展。** 下文的应用与联动提供继续探索的方向。' : '**Supporting.** Work through the example before comparing the conditions.\n\n**Extension.** Use the applications and connections below to explore further.',
    '## ' + h[2],
    (zh ? '**内部问题。** ' : '**Internal question.** ') + text('internal'),
    (zh ? '**另一条动机。** ' : '**Another motivation.** ') + text('external'),
    (zh ? '**生长线。** ' : '**Growth.** ') + text('growth'),
    '## ' + h[3], text('definition'),
    ...(spec.formula ? ['$$\n' + spec.formula + '\n$$'] : []),
    '## ' + h[4], text('example'), text('boundary'),
    '## ' + h[5],
    '**' + spec.status + '** — ' + text('proof'),
    zh ? '复现入口：重做上面的计算或逐项检查条件。自动格式与形成检查不认证这里的数学内容。' : 'Reproduce the calculation above or check the conditions one by one. Automated format and formation checks do not certify the mathematics here.',
    '## ' + h[6], text('application'),
    '## ' + h[7], text('misconception'), text('review'),
    '## ' + h[8],
    (zh ? '**思想。** ' : '**Idea.** ') + text('thought'),
    (zh ? '**方法（用于上面的例子与论证）。** ' : '**Method (used in the example and argument above).** ') + text('technique'),
    '## ' + h[9], references,
    zh ? '本文是本站编写的入门笔记。来源条目的阅读范围按引用说明记录；REF 是引用结论，ILLUSTRATION 是启发方法，均不表示机器认证。' : 'This is an introductory note written for MCS. The reading scope is recorded with each reference; REF denotes a cited result and ILLUSTRATION a heuristic, neither a machine certification.',
  ].join('\n\n');
}
