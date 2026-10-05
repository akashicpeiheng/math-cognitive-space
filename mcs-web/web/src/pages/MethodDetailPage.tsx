import { Link, useParams } from 'react-router-dom';
import { METHOD_LIBRARY, methodEntry } from '../method-library';
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
 */
export function MethodDetailPage() {
  const { methodId } = useParams();
  const entry = methodEntry(methodId);
  const index = entry ? METHOD_LIBRARY.findIndex((item) => item.id === entry.id) : -1;

  if (!entry) {
    return (
      <div className="page method-page">
        <header className="intro-hero">
          <p className="eyebrow">方法库</p>
          <h1>没有这一条方法</h1>
          <p className="lede">
            「{methodId}」不在方法库里。方法库目前有 {METHOD_LIBRARY.length} 条，
            链接可能拼错了。
          </p>
          <div className="intro-hero-actions">
            <Link className="button primary" to="/method">回到学习方法论</Link>
          </div>
        </header>
      </div>
    );
  }

  const previous = index > 0 ? METHOD_LIBRARY[index - 1] : null;
  const next = index < METHOD_LIBRARY.length - 1 ? METHOD_LIBRARY[index + 1] : null;

  return (
    <div className="page method-page">
      <header className="intro-hero">
        <p className="eyebrow">
          方法库 · 第 {index + 1} / {METHOD_LIBRARY.length} 条 · {entry.tag}
        </p>
        <h1>{plainMathText(entry.title)}</h1>
        <p className="lede intro-summary">{plainMathText(entry.gist)}</p>
        <p className="muted">
          <Link to="/method">← 回到方法库</Link>
        </p>
      </header>

      <section className="card">
        <h2>它解决什么问题</h2>
        <p>{plainMathText(entry.problem)}</p>
      </section>

      <section className="card">
        <h2>怎么做</h2>
        <ol className="method-how">
          {entry.how.map((step) => <li key={step.slice(0, 20)}>{plainMathText(step)}</li>)}
        </ol>
      </section>

      <section className="card">
        <h2>什么时候会失效</h2>
        <p className="intro-lead">
          只讲好处的写法会把方法变成信仰。这一节写的是它的边界与常见误用。
        </p>
        <ul className="intro-bullets">
          {entry.boundary.map((item) => <li key={item.slice(0, 20)}>{plainMathText(item)}</li>)}
        </ul>
      </section>

      {(entry.example || entry.links) && (
        <section className="card">
          <h2>本站哪里能看到它</h2>
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
        <h2>出处</h2>
        <p className="intro-evidence">{entry.source}</p>
        <p className="muted">
          本站的取材纪律：有文档依据的写「整理自某文件」，没有依据的写「站点自己的整理」，
          不把站点写的东西伪装成既有文献的转述。
        </p>
      </section>

      <nav className="method-neighbors" aria-label="相邻方法">
        {previous
          ? <Link className="button ghost" to={`/method/${previous.id}`}>← 上一条：{previous.title}</Link>
          : <span />}
        {next && <Link className="button ghost" to={`/method/${next.id}`}>下一条：{next.title} →</Link>}
      </nav>
    </div>
  );
}
