import { Link, useParams } from 'react-router-dom';
import { useI18n } from '../i18n';
import { METHOD_LIBRARY_BY_LOCALE } from '../method-library';
import { plainMathText } from '../labels';

/**
 * 方法库里单条方法的细致解析页（`/method/<id>`）。
 *
 * 四段固定结构，顺序不是随意的：
 *
 * 1. **它解决什么问题**——不给问题的原则只会变成口号，所以问题放最前面；
 * 2. **怎么做**——可执行的步骤，不是「要重视」这类劝告；
 * 3. **什么时候会失效**——每条方法都有边界，只讲好处的写法会把方法变成信仰；
 * 4. **本站哪里能看到它**——给一个可以点进去的具体例子或页面，而不是停在抽象层。
 *
 * 出处单独一行，标明这条有没有文档依据（vault 里三份文件是 0 字节，必须写清楚）。
 *
 * 中英双语（2026-10）：条目按语种从 `METHOD_LIBRARY_BY_LOCALE` 取，壳层文案成对写在这里。
 */
const DETAIL_TEXT = {
  zh: {
    eyebrowLibrary: '方法库',
    missingTitle: '没有这一条方法',
    missingPrefix: '「',
    missingMid: '」不在方法库里。方法库目前有 ',
    missingSuffix: ' 条，链接可能拼错了。',
    backToLibrary: '回到学习方法论',
    crumb: (index: number, total: number, tag: string) => `方法库 · 第 ${index} / ${total} 条 · ${tag}`,
    backShort: '← 回到方法库',
    problemTitle: '它解决什么问题',
    howTitle: '怎么做',
    boundaryTitle: '什么时候会失效',
    boundaryLead: '只讲好处的写法会把方法变成信仰。这一节写的是它的边界与常见误用。',
    exampleTitle: '本站哪里能看到它',
    sourceTitle: '出处',
    discipline: '本站的取材纪律：有文档依据的写「整理自某文件」，没有依据的写「站点自己的整理」，不把站点写的东西伪装成既有文献的转述。',
    neighborsAria: '相邻方法',
    previous: (title: string) => `← 上一条：${title}`,
    next: (title: string) => `下一条：${title} →`,
  },
  en: {
    eyebrowLibrary: 'Method library',
    missingTitle: 'No such method',
    missingPrefix: '“',
    missingMid: '” is not in the method library. The library currently has ',
    missingSuffix: ' entries, so the link may be misspelled.',
    backToLibrary: 'Back to the methodology',
    crumb: (index: number, total: number, tag: string) => `Method library · ${index} of ${total} · ${tag}`,
    backShort: '← Back to the method library',
    problemTitle: 'What problem it solves',
    howTitle: 'How to do it',
    boundaryTitle: 'When it fails',
    boundaryLead: 'Writing only about the benefits turns a method into a belief. This section gives its boundaries and common misuses.',
    exampleTitle: 'Where you can see it on this site',
    sourceTitle: 'Source',
    discipline: 'The sourcing discipline on this site: where there is a document, it says “compiled from such-and-such file”; where there is none, it says “the site’s own compilation”. Nothing written by the site is dressed up as a rendering of existing literature.',
    neighborsAria: 'Neighbouring methods',
    previous: (title: string) => `← Previous: ${title}`,
    next: (title: string) => `Next: ${title} →`,
  },
};

export function MethodDetailPage() {
  const { methodId } = useParams();
  const { pick } = useI18n();
  const text = pick(DETAIL_TEXT);
  const library = pick(METHOD_LIBRARY_BY_LOCALE);
  const entry = library.find((item) => item.id === methodId);
  const index = entry ? library.findIndex((item) => item.id === entry.id) : -1;

  if (!entry) {
    return (
      <div className="page method-page">
        <header className="intro-hero">
          <p className="eyebrow">{text.eyebrowLibrary}</p>
          <h1>{text.missingTitle}</h1>
          <p className="lede">
            {text.missingPrefix}{methodId}{text.missingMid}{library.length}{text.missingSuffix}
          </p>
          <div className="intro-hero-actions">
            <Link className="button primary" to="/method">{text.backToLibrary}</Link>
          </div>
        </header>
      </div>
    );
  }

  const previous = index > 0 ? library[index - 1] : null;
  const next = index < library.length - 1 ? library[index + 1] : null;

  return (
    <div className="page method-page">
      <header className="intro-hero">
        <p className="eyebrow">
          {text.crumb(index + 1, library.length, entry.tag)}
        </p>
        <h1>{plainMathText(entry.title)}</h1>
        <p className="lede intro-summary">{plainMathText(entry.gist)}</p>
        <p className="muted">
          <Link to="/method">{text.backShort}</Link>
        </p>
      </header>

      <section className="card">
        <h2>{text.problemTitle}</h2>
        <p>{plainMathText(entry.problem)}</p>
      </section>

      <section className="card">
        <h2>{text.howTitle}</h2>
        <ol className="method-how">
          {entry.how.map((step) => <li key={step.slice(0, 20)}>{plainMathText(step)}</li>)}
        </ol>
      </section>

      <section className="card">
        <h2>{text.boundaryTitle}</h2>
        <p className="intro-lead">
          {text.boundaryLead}
        </p>
        <ul className="intro-bullets">
          {entry.boundary.map((item) => <li key={item.slice(0, 20)}>{plainMathText(item)}</li>)}
        </ul>
      </section>

      {(entry.example || entry.links) && (
        <section className="card">
          <h2>{text.exampleTitle}</h2>
          {entry.example && <p>{plainMathText(entry.example)}</p>}
          {entry.links && entry.links.length > 0 && (
            <div className="intro-hero-actions">
              {entry.links.map((link) => (
                <Link className="button" key={link.to} to={link.to}>{link.label}</Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h2>{text.sourceTitle}</h2>
        <p className="intro-evidence">{entry.source}</p>
        <p className="muted">
          {text.discipline}
        </p>
      </section>

      <nav className="method-neighbors" aria-label={text.neighborsAria}>
        {previous
          ? <Link className="button ghost" to={`/method/${previous.id}`}>{text.previous(plainMathText(previous.title))}</Link>
          : <span />}
        {next && <Link className="button ghost" to={`/method/${next.id}`}>{text.next(plainMathText(next.title))}</Link>}
      </nav>
    </div>
  );
}
