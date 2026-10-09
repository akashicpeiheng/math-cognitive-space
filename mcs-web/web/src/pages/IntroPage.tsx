import { Link } from 'react-router-dom';
import { useApi } from '../api';
import { useI18n } from '../i18n';
import {
  INTRO_ENTRIES_BY_LOCALE,
  INTRO_COUNT_LABELS_BY_LOCALE,
  SITE_INTRO_SECTIONS_BY_LOCALE,
  SITE_INTRO_SUMMARY,
  SITE_INTRO_SUMMARY_EN,
  SITE_INTRO_TITLE,
  SITE_INTRO_TITLE_EN,
} from '../intro-content';

interface HealthCounts {
  nodes?: number;
  actions?: number;
  relations?: number;
  evidence?: number;
  support?: number;
  claims?: number;
  localizations?: number;
  templates?: number;
}

/**
 * 网站介绍页。
 *
 * 内容全部来自 `intro-content.ts`（纯文本，便于测试逐条核对与集中修订）；
 * 本页只负责渲染与把站内规模接上只读接口。
 *
 * 规模数字**运行时现取**，不写死在文案里：本体从 102 个节点长到 112 个时，
 * 写死的介绍会立刻变成假话。
 *
 * 中英双语（2026-10）：内容按语种取 `*_BY_LOCALE`；页面自己的壳层文案在本文件里成对写。
 */
const INTRO_TEXT = {
  zh: {
    eyebrow: '研究专稿与论文的对外入口',
    title: SITE_INTRO_TITLE,
    summary: SITE_INTRO_SUMMARY,
    methodButton: '学习方法论',
    readButton: '直接开始读',
    labButton: '研究台与证据',
    scaleAria: '站内规模',
    scaleLoading: '正在读取站内规模…',
    scaleError: '站内规模读取失败，本页其余内容不受影响。',
    versionPrefix: '本体版本 ',
    versionTail: '。这些数字由只读接口现场读出，与「数学对象」页面上看到的是同一份数据。',
    evidencePrefix: '依据：',
    entriesTitle: '从哪进',
    entriesLead: '四条入口对应四种读法，不是四个功能按钮。',
    colophonTitle: '版本与作者',
    colophonBody: '本页描述的是本机工作台的当前状态。理论专稿的分章 Markdown 是修订源，论文是可编辑的 LaTeX 源；两者都在本机，未在公开渠道发布。',
    readingOrderPrefix: '阅读顺序建议：先看',
    readingOrderMid: '，再看',
    readingOrderSuffix: '，最后回到「从哪进」选一个案例动手。',
    anchorProblem: '它要解决什么问题',
    anchorLimits: '明确不声称什么',
  },
  en: {
    eyebrow: 'The public entry to the monograph and the paper',
    title: SITE_INTRO_TITLE_EN,
    summary: SITE_INTRO_SUMMARY_EN,
    methodButton: 'Methodology',
    readButton: 'Start reading',
    labButton: 'Research workbench and evidence',
    scaleAria: 'Site scale',
    scaleLoading: 'Reading the site’s scale…',
    scaleError: 'Reading the site’s scale failed; the rest of this page is unaffected.',
    versionPrefix: 'Ontology version ',
    versionTail: '. These numbers are read live from a read-only API; they are the same data you see on the “mathematical objects” page.',
    evidencePrefix: 'Basis: ',
    entriesTitle: 'Where to enter',
    entriesLead: 'Four entries for four ways of reading, not four feature buttons.',
    colophonTitle: 'Version and author',
    colophonBody: 'This page describes the current state of the local workbench. The chapter Markdown of the theoretical monograph is the revision source and the paper is an editable LaTeX source; both are local and have not been published publicly.',
    readingOrderPrefix: 'Suggested reading order: first ',
    readingOrderMid: ', then ',
    readingOrderSuffix: ', and finally back to “where to enter” to pick a case and start.',
    anchorProblem: 'what problem it solves',
    anchorLimits: 'what is explicitly not claimed',
  },
};

export function IntroPage() {
  const health = useApi<{ ontology: { counts: HealthCounts; version: string } }>('/health');
  const counts = health.data?.ontology.counts;
  const { pick } = useI18n();
  const text = pick(INTRO_TEXT);
  const sections = pick(SITE_INTRO_SECTIONS_BY_LOCALE);
  const entries = pick(INTRO_ENTRIES_BY_LOCALE);
  const countLabels = pick(INTRO_COUNT_LABELS_BY_LOCALE);

  return (
    <div className="page intro-page">
      <header className="intro-hero">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="lede intro-summary">{text.summary}</p>
        <div className="intro-hero-actions">
          <Link className="button primary" to="/method">{text.methodButton}</Link>
          <Link className="button" to="/nodes">{text.readButton}</Link>
          <Link className="button ghost" to="/lab">{text.labButton}</Link>
        </div>
      </header>

      {/* 站内规模：现取，取不到就说明取不到，不编数字。 */}
      <section className="card intro-scale" aria-label={text.scaleAria}>
        {health.loading && <p className="muted">{text.scaleLoading}</p>}
        {health.error && <p className="error">{text.scaleError}</p>}
        {counts && (
          <>
            <dl className="intro-scale-grid">
              {/*
                `pick(...)` 直接内联在 `Object.entries()` 里，而不是先解构到一个变量：
                `tests/label-option-scan.test.mjs` 会扫「标签表当选项表」的写法并核对
                「附近真的渲染了计数、取不到时显示 — 而不是 0」。先解构会让这处用法
                从扫描里消失（白名单随即报「过期条目」），而那条检查正是这六项指标
                不伪造数字的保证。
              */}
              {Object.entries(pick(INTRO_COUNT_LABELS_BY_LOCALE)).map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{String((counts as Record<string, number | undefined>)[key] ?? '—')}</dd>
                </div>
              ))}
            </dl>
            <p className="muted intro-version">
              {text.versionPrefix}<code>{health.data?.ontology.version}</code>{text.versionTail}
            </p>
          </>
        )}
      </section>

      {sections.map((section) => (
        <section className="card intro-section" key={section.id} id={`intro-${section.id}`}>
          <h2>{section.title}</h2>
          <p className="intro-lead">{section.lead}</p>
          {section.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
          {section.facts && (
            <table className="intro-facts">
              <tbody>
                {section.facts.map((fact) => (
                  <tr key={fact.label}>
                    <th scope="row">{fact.label}</th>
                    <td>
                      {fact.value}
                      {fact.note && <span className="intro-fact-note">{fact.note}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {section.bullets && (
            <ul className="intro-bullets">
              {section.bullets.map((item) => <li key={item.slice(0, 24)}>{item}</li>)}
            </ul>
          )}
          {section.evidence && <p className="intro-evidence">{text.evidencePrefix}{section.evidence}</p>}
        </section>
      ))}

      <section className="card">
        <h2>{text.entriesTitle}</h2>
        <p className="intro-lead">{text.entriesLead}</p>
        <ul className="intro-entries">
          {entries.map((entry) => (
            <li key={entry.to}>
              <Link to={entry.to}>{entry.label}</Link>
              <span className="intro-entry-note">{entry.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card intro-colophon">
        <h2>{text.colophonTitle}</h2>
        <p>
          {text.colophonBody}
        </p>
        <p className="muted">
          {text.readingOrderPrefix}<a href="#intro-problem">{text.anchorProblem}</a>{text.readingOrderMid}
          <a href="#intro-limits">{text.anchorLimits}</a>{text.readingOrderSuffix}
        </p>
      </section>
    </div>
  );
}
