import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  METHOD_CORE_BY_LOCALE,
  METHOD_NOT_INCLUDED_BY_LOCALE,
  METHOD_TEMPLATE_SKELETON_BY_LOCALE,
} from '../intro-content';
import { METHOD_LIBRARY_BY_LOCALE } from '../method-library';
import { plainMathText } from '../labels';

/**
 * 学习方法论页。
 *
 * 内容整理自 `MCS_vault/MCS/methodology/` 与 `MCS_vault/MCS/template/` 的现有文本，
 * 不改写原文。**空的地方就空着**：原文中若干小节尚未写出，本页明确列出没有收录什么，
 * 而不是补一段听起来合理的话——那会让「未验证」变成伪造的已验证。
 *
 * 页面结构（三块，各管一件事）：
 * 1. 三条核心原则——最短的结论；
 * 2. **方法库**（`web/src/method-library.ts`）——可以单独练的十条动作，每条一句简介，
 *    点进去是细致解析（`/method/<id>`：解决什么问题 / 怎么做 / 什么时候失效 / 本站哪里能看到）；
 * 3. 记在笔记里的八条原则（`METHOD_CORE`）——认知发展笔记里已有完整论述的那些。
 *    它与方法库有重叠（如「删掉某个条件会怎样」与「构造反例」），卡片上直接互相指路，
 *    而不是让读者自己猜两者什么关系。
 *
 * 中英双语（2026-10）：内容按语种取 `*_BY_LOCALE`，页面壳层文案在本文件里成对写。
 */
const METHOD_TEXT = {
  zh: {
    eyebrow: '跨数学分支通用，不依赖任何具体理论',
    title: '数学学习方法论',
    lede: '这套方法处理的是「怎么把数学学进自己的思维」，而不是「怎么解某一类题」。它的每条原则都来自一份持续更新的认知发展笔记：先讲为什么，再讲怎么做。',
    note: '它同时是本站节点模板的设计依据——你在每个数学对象页面上看到的结构（前置知识分三层、逐条件反例、证明概括先行、常见误解、总结与回看）就是这套方法论落到单篇笔记上的形状。',
    coreTitle: '三条核心原则',
    coreLead: '如果只记住三件事：用自己的话重写、给断言找证据、保留走错的路。',
    coreBodyPrefix: '其余条目都是这三条在不同环节上的展开。它们共同的对手是同一种失败——',
    coreBodyStrong: '被动的进步',
    coreBodySuffix: '：读了一遍别人的文字，感觉懂了，但思维本身没有发生变化。叶子的成长是光合作用、细胞分裂、趋光弯曲，都在发生，但没有任何意识在审视「我为什么朝这边长」。被动的进步也能产生结果，但它慢，而且伴随着大量可以被看作退步的演化废料——因为变异是随机的。',
    libraryTitle: (count: number) => `方法库 · ${count} 条可单独练的方法`,
    libraryLead: '下面这一栏只给一句简介；点进任意一条，是它的细致解析：解决什么问题、怎么做、什么时候会失效、本站哪里能看到它。',
    orderStrong: '排序依据',
    orderNote: '（重要性由本站判定）：先元方法与容器——内省、认知发展笔记；再收益最高也最廉价的两个动作——构造反例、从特例切入；然后是抽象与找证明的核心动作——找不变量、逆向分析；接着是判断「什么时候不该信直觉」与表达纪律——直觉的建立与失效、不轻易诉诸「显然」；最后是两条进阶分辨——独立的动机溯源练习、次阶段的应用 ≠ 本阶段的特定联系。',
    readMore: '读细致解析 →',
    notesTitle: '记在笔记里的八条原则',
    notesLeadPrefix: '下面八条来自认知发展笔记里',
    notesLeadStrong: '已经写出完整论述',
    notesLeadSuffix: '的小节，因此带「怎么做 / 为什么有效 / 出处」。它与上面的方法库有重叠：例如这里的「删掉某个条件会怎样」就是方法库里的「构造反例」，这里的「动机溯源」对应方法库里的「独立的动机溯源练习」——前者是笔记里的原则，后者是可以单独练的动作。',
    howTitle: '怎么做',
    whyTitle: '为什么有效',
    sourcePrefix: '出处：',
    skeletonTitle: '落到一篇笔记上：模板骨架',
    skeletonLead: '把上面八条装进一个固定骨架，就是「具体对象类的数学笔记模版」。顺序本身有含义。',
    skeletonNote: '本站的节点详情页用了这个骨架的一个子集：形式化字段、「删掉条件会怎样」的反例、先行概括证明、常见误解与回看提问都在页面上；个性十足的「个人启发」一节留给学习者的笔记区，不塞进公共本体。',
    gapsTitle: '本页没有收录什么',
    gapsLead: '空的地方就空着——这比补一段听起来合理的话诚实。',
    nextTitle: '接着去哪',
    nextIntro: '读网站介绍与论文要点',
    nextPlan: '看它怎么变成学习路线',
    nextNodes: '挑一个数学对象试一遍',
  },
  en: {
    eyebrow: 'Common across mathematical branches; it depends on no particular theory',
    title: 'Methodology for learning mathematics',
    lede: 'These methods are about “how to take mathematics into your own thinking”, not “how to solve a particular kind of problem”. Every principle comes from a notebook on cognitive development that keeps being updated: why first, then how.',
    note: 'It is also the design basis of this site’s node template — the structure you see on every mathematical object page (prerequisites in three tiers, condition-by-condition counterexamples, the proof overview first, common misconceptions, a summary with questions to revisit) is what this methodology looks like when it lands on a single note.',
    coreTitle: 'Three core principles',
    coreLead: 'If you remember only three things: rewrite in your own words, find evidence for every claim, and keep the wrong turns.',
    coreBodyPrefix: 'Every other entry is one of these three unfolded at a different point. Their common opponent is one kind of failure — ',
    coreBodyStrong: 'passive progress',
    coreBodySuffix: ': you read someone else’s words once and feel you understand, while your own thinking has not changed. A leaf grows by photosynthesis, by cell division, by bending towards light; all of it happens, but no awareness is examining “why am I growing this way”. Passive progress does produce results, but it is slow, and it comes with a great deal of evolutionary waste that can be read as regression — because variation is random.',
    libraryTitle: (count: number) => `Method library · ${count} methods you can train on their own`,
    libraryLead: 'Each card below gives one sentence only; open any of them for the detailed treatment: what problem it solves, how to do it, when it fails, and where you can see it on this site.',
    orderStrong: 'How the order was chosen',
    orderNote: ' (importance judged by this site): first the meta-method and the container — introspection, the cognitive-development notebook; then the two highest-yield and cheapest moves — constructing counterexamples, entering from a special case; then the core moves of abstraction and proof-finding — finding invariants, working backwards; then judging “when not to trust intuition” and expressive discipline — how intuition is built and fails, not appealing to “obvious” too readily; and finally two advanced distinctions — the independent motivation-tracing exercise, and an application at the next stage ≠ the specific link at this stage.',
    readMore: 'Read the detailed treatment →',
    notesTitle: 'Eight principles written into the notes',
    notesLeadPrefix: 'The eight entries below come from sections of the cognitive-development notebook that ',
    notesLeadStrong: 'already have a complete treatment written out',
    notesLeadSuffix: ', so each carries “how to do it / why it works / source”. They overlap with the method library above: the “what happens if this condition is deleted?” here is “constructing counterexamples” there, and “tracing the motivation back” here corresponds to “an independent motivation-tracing exercise” there — the first is a principle in the notes, the second a move you can train on its own.',
    howTitle: 'How to do it',
    whyTitle: 'Why it works',
    sourcePrefix: 'Source: ',
    skeletonTitle: 'Landing on a single note: the template skeleton',
    skeletonLead: 'Putting the eight principles into a fixed skeleton gives the “mathematical note template for a specific class of objects”. The order itself carries meaning.',
    skeletonNote: 'The node pages on this site use a subset of this skeleton: the formal fields, the “what happens if the condition is deleted” counterexamples, the proof overview first, common misconceptions and questions to revisit are all on the page; the strongly personal “personal insights” section is left to the learner’s own notes and is not pushed into the public ontology.',
    gapsTitle: 'What this page does not include',
    gapsLead: 'Where something is empty it stays empty — that is more honest than filling it with a plausible-sounding paragraph.',
    nextTitle: 'Where to go next',
    nextIntro: 'Read the introduction and the paper’s key points',
    nextPlan: 'See how it becomes a learning route',
    nextNodes: 'Pick a mathematical object and try it once',
  },
};

export function MethodPage() {
  const { pick } = useI18n();
  const text = pick(METHOD_TEXT);
  const library = pick(METHOD_LIBRARY_BY_LOCALE);
  const core = pick(METHOD_CORE_BY_LOCALE);
  const skeleton = pick(METHOD_TEMPLATE_SKELETON_BY_LOCALE);
  const gaps = pick(METHOD_NOT_INCLUDED_BY_LOCALE);

  return (
    <div className="page method-page">
      <header className="intro-hero">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="lede intro-summary">
          {text.lede}
        </p>
        <p className="muted">
          {text.note}
        </p>
      </header>

      <section className="card">
        <h2>{text.coreTitle}</h2>
        <p className="intro-lead">
          {text.coreLead}
        </p>
        <p>
          {text.coreBodyPrefix}<strong>{text.coreBodyStrong}</strong>{text.coreBodySuffix}
        </p>
      </section>

      {/*
        方法库：十条可以单独练的方法，按重要性排序（顺序即序号）。
        这一块是「带简介的栏目」——每张卡只给一句简介与一行的由来，点击进细致解析。
      */}
      <section className="method-library" id="library">
        <div className="method-library-head">
          <h2>{text.libraryTitle(library.length)}</h2>
          <p className="intro-lead">
            {text.libraryLead}
          </p>
          <p className="muted">
            <strong>{text.orderStrong}</strong>{text.orderNote}
          </p>
        </div>
        <ol className="method-library-grid">
          {library.map((entry, index) => (
            <li className="card method-entry" key={entry.id}>
              <Link className="method-entry-link" to={`/method/${entry.id}`}>
                <span className="method-entry-top">
                  <span className="method-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="method-entry-tag">{entry.tag}</span>
                </span>
                <span className="method-entry-title">{plainMathText(entry.title)}</span>
                <span className="method-entry-gist">{plainMathText(entry.gist)}</span>
                <span className="method-entry-more">{text.readMore}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>{text.notesTitle}</h2>
        <p className="intro-lead">
          {text.notesLeadPrefix}<strong>{text.notesLeadStrong}</strong>{text.notesLeadSuffix}
        </p>
      </section>

      <section className="method-grid">
        {core.map((item, index) => (
          <article className="card method-card" key={item.id} id={`method-${item.id}`}>
            <div className="method-card-head">
              <span className="method-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h2>{plainMathText(item.title)}</h2>
            </div>
            <p className="intro-lead">{plainMathText(item.gist)}</p>
            <h3>{text.howTitle}</h3>
            <ol className="method-how">
              {item.how.map((step) => <li key={step.slice(0, 20)}>{plainMathText(step)}</li>)}
            </ol>
            <h3>{text.whyTitle}</h3>
            <p>{plainMathText(item.why)}</p>
            <p className="intro-evidence">{text.sourcePrefix}{item.source}</p>
          </article>
        ))}
      </section>

      <section className="card">
        <h2>{text.skeletonTitle}</h2>
        <p className="intro-lead">
          {text.skeletonLead}
        </p>
        <ol className="method-skeleton">
          {skeleton.map((row) => (
            <li key={row.title}>
              <strong>{row.title}</strong>
              <span>{row.detail}</span>
            </li>
          ))}
        </ol>
        <p className="muted">
          {text.skeletonNote}
        </p>
      </section>

      <section className="card method-gaps">
        <h2>{text.gapsTitle}</h2>
        <p className="intro-lead">{text.gapsLead}</p>
        <ul className="intro-bullets">
          {gaps.map((item) => <li key={item.slice(0, 24)}>{item}</li>)}
        </ul>
      </section>

      <section className="card">
        <h2>{text.nextTitle}</h2>
        <div className="intro-hero-actions">
          <Link className="button primary" to="/intro">{text.nextIntro}</Link>
          <Link className="button" to="/plan">{text.nextPlan}</Link>
          <Link className="button ghost" to="/nodes">{text.nextNodes}</Link>
        </div>
      </section>
    </div>
  );
}
