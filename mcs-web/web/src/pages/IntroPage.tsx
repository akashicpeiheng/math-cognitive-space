import { Link } from 'react-router-dom';
import { useApi } from '../api';
import {
  INTRO_COUNT_LABELS, INTRO_ENTRIES, SITE_INTRO_SECTIONS, SITE_INTRO_SUMMARY, SITE_INTRO_TITLE,
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
 */
export function IntroPage() {
  const health = useApi<{ ontology: { counts: HealthCounts; version: string } }>('/health');
  const counts = health.data?.ontology.counts;

  return (
    <div className="page intro-page">
      <header className="intro-hero">
        <p className="eyebrow">研究专稿与论文的对外入口</p>
        <h1>{SITE_INTRO_TITLE}</h1>
        <p className="lede intro-summary">{SITE_INTRO_SUMMARY}</p>
        <div className="intro-hero-actions">
          <Link className="button primary" to="/method">学习方法论</Link>
          <Link className="button" to="/nodes">直接开始读</Link>
          <Link className="button ghost" to="/lab">研究台与证据</Link>
        </div>
      </header>

      {/* 站内规模：现取，取不到就说明取不到，不编数字。 */}
      <section className="card intro-scale" aria-label="站内规模">
        {health.loading && <p className="muted">正在读取站内规模…</p>}
        {health.error && <p className="error">站内规模读取失败，本页其余内容不受影响。</p>}
        {counts && (
          <>
            <dl className="intro-scale-grid">
              {Object.entries(INTRO_COUNT_LABELS).map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{String((counts as Record<string, number | undefined>)[key] ?? '—')}</dd>
                </div>
              ))}
            </dl>
            <p className="muted intro-version">
              本体版本 <code>{health.data?.ontology.version}</code>。
              这些数字由只读接口现场读出，与「数学对象」页面上看到的是同一份数据。
            </p>
          </>
        )}
      </section>

      {SITE_INTRO_SECTIONS.map((section) => (
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
          {section.evidence && <p className="intro-evidence">依据：{section.evidence}</p>}
        </section>
      ))}

      <section className="card">
        <h2>从哪进</h2>
        <p className="intro-lead">四条入口对应四种读法，不是四个功能按钮。</p>
        <ul className="intro-entries">
          {INTRO_ENTRIES.map((entry) => (
            <li key={entry.to}>
              <Link to={entry.to}>{entry.label}</Link>
              <span className="intro-entry-note">{entry.note}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card intro-colophon">
        <h2>版本与作者</h2>
        <p>
          本页描述的是本机工作台的当前状态。理论专稿的分章 Markdown 是修订源，
          论文是可编辑的 LaTeX 源；两者都在本机，未在公开渠道发布。
        </p>
        <p className="muted">
          阅读顺序建议：先看<a href="#intro-problem">它要解决什么问题</a>，
          再看<a href="#intro-limits">明确不声称什么</a>，
          最后回到「从哪进」选一个案例动手。
        </p>
      </section>
    </div>
  );
}
