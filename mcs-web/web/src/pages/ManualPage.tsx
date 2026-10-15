import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { MANUAL_BY_LOCALE } from '../manual-content';

/**
 * 用户手册页（2026-10 加）。
 *
 * 三件事定这一页的形状：
 *
 * 1. **正文是静态数据**（`manual-content.ts`）：不请求任何接口，因此打开即读，
 *    也不存在「加载失败但页面看起来正常」的中间态。规模数字一个都不写死——
 *    正文里本来就不放数量，数量随本体与配置变动。
 * 2. **结构固定**：每个功能按「解决什么问题 → 从哪里进入 → 怎样操作 → 会得到什么 →
 *    容易误解什么」五段写；组件只按这个顺序渲染存在的字段，不额外发明段落。
 *    表格（证据标签 / 网络手势 / 背景入口）与 FAQ 由环节单独补，仍然来自同一份数据。
 * 3. **锚点是契约**：章节 id 是 `manual-<section.id>`，中英文共用同一批 id
 *    （切换语言由 `switchLocalePath` 保留 hash，所以换语言后还停在同一章）。
 *
 * 直接打开带 hash 的地址时的定位：SPA 里目标元素在首次渲染后才出现，浏览器的原生
 * 片段跳转发生在渲染之前，所以这里自己滚一次——`scroll-margin-top`（见 styles.css）
 * 负责让标题落在吸顶栏下面，而不是被顶栏压住。点击页内目录锚点时原生跳转照常生效，
 * 这一次滚动落在同一位置，不产生跳动。
 */
export function ManualPage() {
  const { pick, hrefFor } = useI18n();
  const location = useLocation();
  const text = pick(MANUAL_BY_LOCALE);
  const sections = text.sections;

  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  const contents = (
    <ul>
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#manual-${section.id}`}>{section.title}</a>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="page manual-page">
      <header className="intro-hero">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="lede intro-summary">{text.lede}</p>
        <p className="muted">{text.note}</p>
        <div className="intro-hero-actions">
          <a className="button primary" data-manual-cta="tutorial" href="#manual-first-run">{text.ctaTutorial}</a>
          <a className="button" data-manual-cta="browse" href="#manual-functions">{text.ctaBrowse}</a>
        </div>
      </header>

      {/* 学习流程示意：五步一条链，窄屏自动换行。 */}
      <section className="card manual-flow-card">
        <h2>{text.flowTitle}</h2>
        <p className="intro-lead">{text.flowLead}</p>
        <ol className="manual-flow">
          {text.flow.map((step, index) => (
            <li key={step}>
              {/* 序号代替箭头：窄屏换行时箭头会悬在行尾指向空处，序号不会。 */}
              <span className="manual-flow-index" aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      {/* 功能速查：带「解决什么问题」的章节列表；同时是全页的第二个入口。 */}
      <section className="card manual-functions" id="manual-functions">
        <h2>{text.functionsTitle}</h2>
        <p className="intro-lead">{text.functionsLead}</p>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#manual-${section.id}`}>{section.title}</a>
              {section.problem && <span className="manual-function-note">{section.problem}</span>}
            </li>
          ))}
        </ul>
      </section>

      {/* 窄屏目录：桌面隐藏（右侧吸附目录接管），窄屏展开即用。 */}
      <details className="card manual-toc-details">
        <summary>{text.tocOpen}</summary>
        <nav className="manual-toc" aria-label={text.tocAria}>{contents}</nav>
      </details>

      <div className="manual-layout">
        <article className="manual-main">
          {sections.map((section) => {
            const anchor = `manual-${section.id}`;
            return (
              <section className="card manual-section" id={anchor} key={section.id} data-manual-section={section.id}>
                <h2>{section.title}</h2>

                {section.problem && (
                  <>
                    <p className="manual-label">{text.labelProblem}</p>
                    <p className="intro-lead">{section.problem}</p>
                  </>
                )}

                {section.entry && (
                  <>
                    <p className="manual-label">{text.labelEntry}</p>
                    <p>{section.entry}</p>
                  </>
                )}
                {section.entryLinks && (
                  <p className="manual-links">
                    {section.entryLinks.map((link) => (
                      <Link className="button small" key={link.to + link.label} to={hrefFor(link.to)}>
                        {link.label}
                      </Link>
                    ))}
                  </p>
                )}

                {section.steps && (
                  <>
                    <p className="manual-label">{text.labelSteps}</p>
                    <ol className="manual-steps">
                      {section.steps.map((step) => (
                        <li key={step.text.slice(0, 24)}>
                          {step.text}
                          {step.link && (
                            <>
                              {' '}
                              <Link className="button small" to={hrefFor(step.link.to)}>{step.link.label}</Link>
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                )}

                {section.id === 'nodes' && (
                  <div className="manual-table-block">
                    <p className="manual-label">{text.evidenceTitle}</p>
                    <p className="muted">{text.evidenceLead}</p>
                    <div className="manual-table-wrap">
                      <table className="manual-table manual-evidence">
                        <tbody>
                          {text.evidence.map((row) => (
                            <tr key={row.tag}>
                              <th scope="row"><code>{row.tag}</code></th>
                              <td>{row.meaning}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section.id === 'network' && (
                  <div className="manual-table-block">
                    <p className="manual-label">{text.gesturesTitle}</p>
                    <p className="muted">{text.gesturesLead}</p>
                    <div className="manual-table-wrap">
                      <table className="manual-table manual-gestures">
                        <thead>
                          <tr>
                            <th scope="col">{text.gestureColumns.action}</th>
                            <th scope="col">{text.gestureColumns.mouse}</th>
                            <th scope="col">{text.gestureColumns.touch}</th>
                            <th scope="col">{text.gestureColumns.keyboard}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {text.gestures.map((row) => (
                            <tr key={row.action}>
                              <th scope="row">{row.action}</th>
                              <td>{row.mouse}</td>
                              <td>{row.touch}</td>
                              <td>{row.keyboard}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {section.id === 'plan' && (
                  <div className="manual-table-block">
                    <p className="manual-label">{text.planEntriesTitle}</p>
                    <p className="muted">{text.planEntriesLead}</p>
                    <dl className="manual-entry-kinds">
                      {text.planEntries.map((row) => (
                        <div key={row.label}>
                          <dt>{row.label}</dt>
                          <dd>{row.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}

                {section.id === 'advanced' && (
                  <div className="manual-advanced-grid">
                    {text.advanced.map((item) => (
                      <article className="manual-advanced-card" key={item.to}>
                        <h3>{item.title}</h3>
                        <p>{item.what}</p>
                        <p className="manual-advanced-condition">{text.advancedConditionPrefix}{item.condition}</p>
                        <p className="manual-links">
                          <Link className="button small" to={hrefFor(item.to)}>{item.label}</Link>
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                {section.id === 'faq' && (
                  <div className="manual-faq">
                    {text.faq.map((item) => (
                      <details className="manual-faq-item" key={item.q}>
                        <summary>{item.q}</summary>
                        <p>{item.a}</p>
                      </details>
                    ))}
                  </div>
                )}

                {section.result && (
                  <>
                    <p className="manual-label">{text.labelResult}</p>
                    <p className="manual-result">{section.result}</p>
                  </>
                )}

                {section.misreads && (
                  <>
                    <p className="manual-label">{text.labelMisread}</p>
                    <ul className="manual-misreads">
                      {section.misreads.map((item) => <li key={item.slice(0, 24)}>{item}</li>)}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </article>

        <aside className="manual-aside">
          <nav className="manual-toc card" aria-label={text.tocAria}>
            <p className="manual-toc-title">{text.tocTitle}</p>
            {contents}
          </nav>
        </aside>
      </div>
    </div>
  );
}
