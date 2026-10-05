import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { StatusBadge } from '../components/StatusBadge';
import type { CoverageEntry, EvidenceRecord, LocalizationDefinition, LocalizationResultView } from '../types';

const TABS = [
  ['sources', '专稿与 arXiv'],
  ['coverage', '专稿覆盖'],
  ['localizations', '局部化 LC01–36'],
  ['claims', '断言与证据'],
  ['obligations', '证明义务'],
  ['notation', '记号与类型'],
  ['legality', '合法本体条件'],
  ['relations', '关系运算'],
  ['authoring', '自动关联'],
] as const;

export function MaintenancePage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('sources');
  return (
    <div className="page">
      <div className="section-heading">
        <h1>网站维护</h1>
        <p>
          这一页放的是<strong>这个网站自身的维护材料</strong>：专稿分章与 arXiv 投稿包的只读清单、
          专稿定义与实现入口的逐条对照、36 个局部化算子、证据义务、基本类型与合法本体条件、关系运算，
          以及把对象写成形式表达并自动找关系的<strong>自动关联</strong>入口。
          （它原来叫「研究台」；研究台现在改成放前沿研究的公开问题与可借用的工具。）
        </p>
        <p className="muted">定义存在不等于可判；接口名称不签发结论。清单按仓库当前状态实时读取，改动文件后刷新即可。</p>
      </div>
      <nav className="tabs">
        {TABS.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>
      {tab === 'sources' && <SourcesTab />}
      {tab === 'coverage' && <CoverageTab />}
      {tab === 'localizations' && <LocalizationTab />}
      {tab === 'claims' && <ClaimsTab />}
      {tab === 'obligations' && <ObligationsTab />}
      {tab === 'notation' && <NotationTab />}
      {tab === 'legality' && <LegalityTab />}
      {tab === 'relations' && <RelationsTab />}
      {tab === 'authoring' && <AuthoringEntryTab />}
    </div>
  );
}

/**
 * 「自动关联」入口。
 *
 * 为什么放在网站维护里而不是主学习导航：它**写的是站点内容**（`data/extensions/` 下的内容包），
 * 不是学习动作；学习者的档案 E 完全不参与这件事。这里只给入口与边界，流程本身在 `/authoring`。
 */
function AuthoringEntryTab() {
  const catalog = useApi<{
    languageVersion: string | null;
    languageReady?: boolean;
    backgrounds: Array<{ id: string; title: string }>;
    templates: unknown[];
    coverageNote?: string;
    coverage?: Array<{ case: string; nodes: number; specs: number; missing: string[] }>;
    extension?: { activeRevision: string | null; revisions: number; nodes: number };
  }>('/formal/catalog');

  if (catalog.loading) return <p>读取形式目录…</p>;

  return (
    <div className="card">
      <h2>自动关联（把对象写成形式表达，再自动找关系）</h2>
      <p>
        流程六步：填写节点 → 检查表达 → 自动发现 → 审阅结果 → 入库预览 → 确认入库（含回滚）。
        它复用受限形式语言 `mcs-formal/1`、四个预置背景理论，以及 kernel 支持的那一部分证明能力。
      </p>
      <div className="card-actions">
        <Link className="button primary" to="/authoring">打开自动关联</Link>
        <Link className="button ghost" to="/nodes">先挑一个数学对象</Link>
      </div>

      <dl className="facts compact">
        <div>
          <dt>解析器</dt>
          <dd>
            {catalog.data?.languageReady
              ? <>已就绪（语言版本 <code>{catalog.data.languageVersion}</code>）</>
              : <>未就绪：目录返回的语言版本为 {catalog.data?.languageVersion ? <code>{catalog.data.languageVersion}</code> : '（未返回）'}，`languageReady` 不是 true。</>}
          </dd>
        </div>
        <div><dt>背景理论</dt><dd>{catalog.data?.backgrounds.length ? catalog.data.backgrounds.map((item) => <code key={item.id}>{item.id} </code>) : '（目录里没有背景：登记表未装配时不给假候选）'}</dd></div>
        <div><dt>四案例模板</dt><dd>{catalog.data?.templates.length ? `${catalog.data.templates.length} 套` : '（服务端未给模板；页面内置四案例骨架模板可用）'}</dd></div>
        <div><dt>扩展包</dt><dd>{catalog.data?.extension ? <>当前生效版本 <code>{catalog.data.extension.activeRevision ?? '（无）'}</code> · 共 {catalog.data.extension.revisions} 条版本记录 · 扩展节点 {catalog.data.extension.nodes} 个</> : '（未返回）'}</dd></div>
      </dl>

      {catalog.error && <p className="error">{formatError(catalog.error)}</p>}

      {catalog.data?.coverage && catalog.data.coverage.length > 0 && (
        <>
          <h3>四案例形式化覆盖</h3>
          <p className="muted">{catalog.data.coverageNote}</p>
          <table className="data-table">
            <thead><tr><th>案例</th><th>节点</th><th>已登记表达</th><th>仍缺</th></tr></thead>
            <tbody>
              {catalog.data.coverage.map((entry) => (
                <tr key={entry.case}>
                  <td>{entry.case}</td>
                  <td className="muted">{entry.nodes}</td>
                  <td className="muted">{entry.specs}</td>
                  <td className="muted">{entry.missing.length ? entry.missing.slice(0, 6).join('、') + (entry.missing.length > 6 ? ` …（共 ${entry.missing.length} 条）` : '') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>三条写死的边界</h3>
      <ul>
        <li>网络预览只叠加当前草稿与结果，<strong>不立即改公共图</strong>；已反驳与未决项只出现在审阅视图。</li>
        <li>联合推导必须显示共同输入：`conditions` 逐条列出，连线标成「联合 N 项」，不当成独立蕴含。</li>
        <li>入库走六步事务并写不可变内容包；回滚另建一条版本记录，不删除历史包、证据或学习者记录。</li>
      </ul>
    </div>
  );
}

interface SourceEntry { name: string; path: string; dir: boolean; bytes: number }
/** 论文锚点条目（TODO A4-31）：注册表里的对照 + 在论文里是否真的存在。 */
interface PaperAnchorView {
  anchor: string;
  nodeId: string | null;
  relation: 'defines' | 'states' | 'instance' | 'none';
  kind?: string;
  note: string;
  inPaper: boolean;
}
interface ReleaseRecordView {
  group: string;
  name: string;
  path: string;
  date: string | null;
  label: string | null;
  version: string | null;
  modifiedAt: string | null;
  fileCount: number;
}
interface SourcesView {
  generatedAt: string;
  note: string;
  /** 这次是实时读盘还是命中缓存，以及读盘耗时（TODO A4-33）。 */
  cached: boolean;
  readMs: number;
  thesis: {
    path: string;
    available: boolean;
    chapters: Array<SourceEntry & { number: string; title: string }>;
    docs: Array<{ name: string; path: string; entries: SourceEntry[] }>;
  };
  arxiv: {
    available: boolean;
    path: string;
    files: SourceEntry[];
    dirs: string[];
    metadata: string[];
    bibEntries: number;
    bibKeys: string[];
    title: string | null;
    abstractHead: string | null;
    anchors: {
      source: string;
      available: boolean;
      labelCount: number;
      stats: { total: number; mapped: number; unmapped: number; anchors: number };
      entries: PaperAnchorView[];
      missingInPaper: string[];
      linkedCount: number;
      unregistered: string[];
    };
  };
  releases: {
    path: string;
    available: boolean;
    groups: string[];
    records: ReleaseRecordView[];
    parsedCount: number;
    latest: ReleaseRecordView | null;
  };
  references: { path: string; available: boolean; files: SourceEntry[] };
}

/**
 * 专稿与 arXiv：把仓库里的**权威材料**梳理成一份可核对的清单。
 *
 * 为什么放在「网站维护」而不是「研究台」：这些是站点的**来源与交付**材料
 * （分章 Markdown、投稿包、发布与验证文档、本机参考文献），用来回答
 * 「页面上写的东西从哪来、覆盖到哪、还没做到哪」；研究台讲的是数学本身。
 *
 * 清单由服务端只读读盘给出（`/api/v2/maintenance/sources`），因此永远等于仓库现状，
 * 不会因为写死一份列表而在改动之后开始说谎。绝对路径不下发，这里显示的都是仓库相对路径。
 */
function SourcesTab() {
  const sources = useApi<SourcesView>('/maintenance/sources');
  if (sources.loading) return <p>读取仓库清单…</p>;
  if (sources.error) return <p className="error">{formatError(sources.error)}</p>;
  const data = sources.data;
  if (!data) return null;
  const totalBytes = (entries: SourceEntry[]) => entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const size = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
  return (
    <>
      <div className="card">
        <h2>口径</h2>
        <p className="muted">{data.note}</p>
        <p className="muted">
          读取时间：{new Date(data.generatedAt).toLocaleString('zh-CN')}
          {' · '}
          {/* 缓存之后更要写清「这份数据是什么时候的」（TODO A4-33）。 */}
          这次{data.cached ? '命中缓存（未重新读盘）' : '实时读盘'}，耗时 {data.readMs} ms。
        </p>
      </div>

      <div className="card">
        <h2>专稿分章<span className="family-count">{data.thesis.chapters.length} 章</span></h2>
        <p className="muted">
          目录 <code>{data.thesis.path}</code>；标题取自分章文件名，与本体内登记的章节引用是两套口径
          （覆盖对照见「专稿覆盖」标签）。
        </p>
        <table className="data-table">
          <thead><tr><th>章</th><th>标题</th><th>文件</th><th>大小</th></tr></thead>
          <tbody>
            {data.thesis.chapters.map((chapter) => (
              <tr key={chapter.path}>
                <td>{chapter.number}</td>
                <td>{chapter.title}</td>
                <td><code>{chapter.name}</code></td>
                <td className="muted">{size(chapter.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>arXiv 投稿包<span className="family-count">{data.arxiv.files.length} 个文件</span></h2>
        {!data.arxiv.available && <p className="muted">仓库里没有这个目录（<code>{data.arxiv.path}</code>），如实说明，不编条目。</p>}
        {data.arxiv.available && (
          <>
            <p className="muted">
              目录 <code>{data.arxiv.path}</code>
              {data.arxiv.dirs.length > 0 && <> · 子目录：{data.arxiv.dirs.join('、')}</>}
              {' · '}参考文献 {data.arxiv.bibEntries} 条
            </p>
            {data.arxiv.title && <p><strong>标题</strong>：{data.arxiv.title}</p>}
            {data.arxiv.abstractHead && <p className="muted">摘要开头：{data.arxiv.abstractHead}…</p>}
            {data.arxiv.metadata.length > 0 && (
              <details className="case-details">
                <summary>投稿元数据（submission-metadata.txt，{data.arxiv.metadata.length} 行）</summary>
                <ul>{data.arxiv.metadata.map((line) => <li key={line}><code>{line}</code></li>)}</ul>
              </details>
            )}
            {data.arxiv.bibKeys.length > 0 && (
              <details className="case-details">
                <summary>参考文献条目（{data.arxiv.bibKeys.length} 条，来自 references.bib）</summary>
                <ul>{data.arxiv.bibKeys.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
              </details>
            )}
            <table className="data-table">
              <thead><tr><th>文件</th><th>相对路径</th><th>大小</th></tr></thead>
              <tbody>
                {data.arxiv.files.map((file) => (
                  <tr key={file.path}>
                    <td><code>{file.name}</code></td>
                    <td className="muted">{file.path}</td>
                    <td className="muted">{size(file.bytes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/*
              正文锚点 ↔ 本体节点（TODO A4-31）。
              第四十七轮的边界是「只梳理了包内材料，没解析正文，也没和本体节点挂上」。
              现在解析 `\label{...}` 并与登记表对照：打通了几条、论文里找不到的有哪几条、
              还有多少 label 没梳理，都写出来——包括**没挂上节点的**那些（它们讲的是接口与规划器，
              不是数学对象）。这样读者能看出「锚点约定」到底覆盖到哪里。
            */}
            <h3>正文锚点 ↔ 本体节点<span className="family-count">
              {data.arxiv.anchors.linkedCount} 条已打通 / 论文 {data.arxiv.anchors.labelCount} 个 label
            </span></h3>
            <p className="muted">
              来源 <code>{data.arxiv.anchors.source}</code>：解析正文里的 <code>\label</code>，
              与 <code>data/paper-anchors.mjs</code> 的登记表逐条对照。约定是
              「定理 / 定义编号 ↔ 本体节点 id」，对不上节点的条目如实写明它讲的是什么（接口、规划器、理论结论）。
            </p>
            <table className="data-table">
              <thead><tr><th>论文锚点</th><th>本体节点</th><th>关系</th><th>依据</th></tr></thead>
              <tbody>
                {data.arxiv.anchors.entries.map((entry) => (
                  <tr key={`${entry.anchor}-${entry.nodeId ?? entry.kind ?? 'none'}`}>
                    <td>
                      <code>{entry.anchor}</code>
                      {!entry.inPaper && <span className="muted">（论文里找不到这个 label）</span>}
                    </td>
                    <td>
                      {entry.nodeId
                        ? <Link to={`/nodes/${encodeURIComponent(entry.nodeId)}`}><code>{entry.nodeId}</code></Link>
                        : <span className="muted">无对应节点 · {entry.kind}</span>}
                    </td>
                    <td className="muted">
                      {{ defines: '定义', states: '陈述', instance: '用例', none: '—' }[entry.relation]}
                    </td>
                    <td className="muted">{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.arxiv.anchors.missingInPaper.length > 0 && (
              <p className="muted">
                登记了但论文里没有：{data.arxiv.anchors.missingInPaper.map((anchor) => <code key={anchor}>{anchor} </code>)}
                ——对照过期了，应当更新登记表（不是论文的问题）。
              </p>
            )}
            {data.arxiv.anchors.unregistered.length > 0 && (
              <p className="muted">
                还有 {data.arxiv.anchors.unregistered.length} 个 label 没进登记表（
                {data.arxiv.anchors.unregistered.slice(0, 8).map((label) => <code key={label}>{label} </code>)}
                {data.arxiv.anchors.unregistered.length > 8 ? '…' : ''}）：
                它们多数是章节、图表与接口定义，不指向某个数学对象。
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>发布与历史快照<span className="family-count">
          {data.releases.records.length} 条 · 解析出版本/日期 {data.releases.parsedCount} 条
        </span></h2>
        {/*
          版本与日期从**目录名**解析（TODO A4-32）：第四十七轮的边界是「只列文件名」。
          名字里日期后面那一段不都是版本号——`20261002-before` 的 `before` 是阶段标签，
          因此版本号只在长得像版本时才填（见 server/maintenance.mjs 的 versionLike）。
          解析不出来的条目也列出来，并写明「未解析」，不猜。
        */}
        <p className="muted">
          目录 <code>{data.releases.path}</code>；按日期倒序（同一天正式发布排在历史快照之前）。
          日期取自目录名，<code>modifiedAt</code> 是目录的修改时间——两者都给出来，可互相参看。
        </p>
        {data.releases.records.length === 0 && <p className="muted">没有找到发布或历史目录，如实说明，不编条目。</p>}
        {data.releases.records.length > 0 && (
          <table className="data-table">
            <thead><tr><th>日期</th><th>版本 / 标签</th><th>目录</th><th>文件数</th><th>目录修改时间</th></tr></thead>
            <tbody>
              {data.releases.records.map((record) => (
                <tr key={record.path}>
                  <td>{record.date ?? <span className="muted">未解析</span>}</td>
                  <td>
                    {record.version ? <code>{record.version}</code> : <span className="muted">{record.label ?? '—'}</span>}
                  </td>
                  <td>
                    <code>{record.name}</code>
                    <span className="muted"> · {record.group === 'releases' ? '正式发布' : '历史快照'}</span>
                  </td>
                  <td className="muted">{record.fileCount}</td>
                  <td className="muted">{record.modifiedAt ? new Date(record.modifiedAt).toLocaleString('zh-CN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>发布、验证与交付文档</h2>
        <div className="source-groups">
          {data.thesis.docs.map((group) => (
            <div key={group.name}>
              <strong>{group.name}</strong>
              <span className="muted">{group.entries.length} 个文件 · {size(totalBytes(group.entries))}</span>
              <ul>
                {group.entries.slice(0, 12).map((entry) => (
                  <li key={entry.path}><code>{entry.name}</code></li>
                ))}
                {group.entries.length > 12 && <li className="muted">…另有 {group.entries.length - 12} 个文件</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>本机参考文献<span className="family-count">{data.references.files.length} 份</span></h2>
        <p className="muted">
          目录 <code>{data.references.path}</code>。这里只列清单，用来核对「引用是否可核验」；
          正文里的引用写的是章节位置，不是这些文件名。
        </p>
        <ul className="source-list">
          {data.references.files.map((file) => <li key={file.path}>{file.name}<span className="muted"> · {size(file.bytes)}</span></li>)}
        </ul>
      </div>
    </>
  );
}

function CoverageTab() {
  const coverage = useApi<{ coverage: CoverageEntry[] }>('/ontology/coverage');
  if (coverage.loading) return <p>加载中…</p>;
  if (coverage.error) return <p className="error">{formatError(coverage.error)}</p>;
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>模块</th><th>章节</th><th>状态</th><th>实现入口</th><th>测试</th><th>当前边界</th></tr></thead>
        <tbody>
          {coverage.data?.coverage.map((entry) => (
            <tr key={entry.module}>
              <td><strong>{entry.module}</strong><p className="muted">{entry.definitions.join('、')}</p></td>
              <td>{entry.chapter}</td>
              <td><StatusBadge status={entry.status} /></td>
              <td><ul>{entry.implementation.map((item) => <li key={item}><code>{item}</code></li>)}</ul></td>
              <td><ul>{entry.tests.map((item) => <li key={item}>{item}</li>)}</ul></td>
              <td>{entry.boundary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LocalizationTab() {
  const localizations = useApi<{ localizations: LocalizationDefinition[]; families: Record<string, string> }>('/localizations');
  const [paramsText, setParamsText] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, LocalizationResultView>>({});
  const [error, setError] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, LocalizationDefinition[]>();
    for (const item of localizations.data?.localizations ?? []) {
      if (!map.has(item.family)) map.set(item.family, []);
      map.get(item.family)!.push(item);
    }
    return map;
  }, [localizations.data]);

  async function run(item: LocalizationDefinition) {
    setError(null);
    try {
      const params = JSON.parse(paramsText[item.id] ?? JSON.stringify(defaultParams(item)));
      const result = await api<LocalizationResultView>(`/localizations/${item.id}/compute`, { method: 'POST', body: { params } });
      setResults((current) => ({ ...current, [item.id]: result }));
    } catch (reason) { setError(formatError(reason)); }
  }

  if (localizations.loading) return <p>加载中…</p>;
  if (localizations.error) return <p className="error">{formatError(localizations.error)}</p>;
  return (
    <div className="localization-tab">
      {error && <p className="error">{error}</p>}
      {[...grouped.entries()].map(([family, items]) => (
        <section key={family}>
          <h2>{family}<span className="family-count">{items.length} 项</span></h2>
          <p className="muted">{localizations.data?.families[family]}</p>
          <div className="lc-grid">
            {items.map((item) => (
              <article className="card lc-card" key={item.id}>
                <header><span className="construct">{item.id}</span><strong>{item.name}</strong><StatusBadge status={item.computable === 'yes' ? 'implemented' : item.computable === 'if-data' ? 'partial' : 'interface-only'} label={item.computable === 'yes' ? '可计算' : item.computable === 'if-data' ? '条件可算' : item.computable} /></header>
                <p>{item.definition}</p>
                <dl className="facts compact">
                  <div><dt>参数</dt><dd>{item.inputs.length ? item.inputs.join('、') : '无显式参数'}</dd></div>
                  <div><dt>保持</dt><dd>{item.preserves}</dd></div>
                  <div><dt>边界</dt><dd>{item.boundary}</dd></div>
                </dl>
                <label className="params">参数 JSON<textarea rows={2} value={paramsText[item.id] ?? JSON.stringify(defaultParams(item), null, 0)} onChange={(event) => setParamsText((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                <button className="button small" onClick={() => run(item)}>运行该算子</button>
                {results[item.id] && (
                  <div className="lc-result">
                    <StatusBadge status={results[item.id].status} />
                    <span>{results[item.id].V.length} 个可见项 · {results[item.id].boundary.length} 条边界</span>
                    {results[item.id].reason && <p>{results[item.id].reason}</p>}
                    {results[item.id].pres.map((pres) => <p key={pres.claim}><StatusBadge status={pres.status} /> {pres.claim}</p>)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function defaultParams(item: LocalizationDefinition): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const input of item.inputs) {
    if (input === 'seedNodes' || input === 'nodes') params[input] = ['limit:bridge'];
    else if (input === 'nodeId' || input === 'goalId') params[input] = 'limit:bridge';
    else if (input === 'left') params[input] = 'limit:limit-ed';
    else if (input === 'right') params[input] = 'limit:limit-seq';
    else if (input === 'use') params[input] = 'expression';
    else if (input === 'radius') params[input] = 2;
    else if (input === 'kind') params[input] = 'topic';
    else if (input === 'mode') params[input] = 'level';
    else if (input === 'categories') params[input] = ['prose-proof'];
    else if (input === 'axioms') params[input] = ['ax-eq-refl'];
    else if (input === 'budget') params[input] = 3;
    else if (input === 'symbols') params[input] = ['d', 'LimitED'];
    else if (input === 'evidenceId') params[input] = 'ev-limit-bridge-proof';
    else if (input === 'claimNode') params[input] = 'limit:bridge';
    else if (input === 'background') params[input] = [];
  }
  return params;
}

function ClaimsTab() {
  const claims = useApi<{ claims: Array<{ id: string; node: string; title: string; statement: string; status: string; evidence: EvidenceRecord[]; boundary: string[] }> }>('/research/claims');
  const [replay, setReplay] = useState<Record<string, string>>({});
  if (claims.loading) return <p>加载中…</p>;
  if (claims.error) return <p className="error">{formatError(claims.error)}</p>;
  async function run(record: EvidenceRecord) {
    try {
      const result = await api<{ status: string }>('/evidence/replay', { method: 'POST', body: { evidenceId: record.id } });
      setReplay((current) => ({ ...current, [record.id]: result.status }));
    } catch (reason) { setReplay((current) => ({ ...current, [record.id]: formatError(reason) })); }
  }
  return (
    <div className="card">
      {claims.data?.claims.map((claim) => (
        <article className="claim-card" key={claim.id}>
          <header><StatusBadge status={claim.status} /><strong>{claim.statement}</strong></header>
          <p><code>{claim.node}</code> · {claim.title}</p>
          {claim.evidence.map((record) => (
            <div className="evidence-row" key={record.id}>
              <StatusBadge status={record.status} /><StatusBadge status={record.checkStatus} />
              <span>{record.title}</span>
              <span className="muted">{record.scope}</span>
              {record.obligations.length > 0 && <span className="obligations">仍缺：{record.obligations.join('；')}</span>}
              {record.certificate && <button className="button small" onClick={() => run(record)}>重放</button>}
              {replay[record.id] && <span className="replay-result">{replay[record.id]}</span>}
            </div>
          ))}
        </article>
      ))}
    </div>
  );
}

function ObligationsTab() {
  const obligations = useApi<{ obligations: Array<{ evidenceId: string | null; node: string | null; obligation: string; status: string; scope: string }> }>('/research/obligations');
  if (obligations.loading) return <p>加载中…</p>;
  if (obligations.error) return <p className="error">{formatError(obligations.error)}</p>;
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>来源</th><th>义务</th><th>状态</th><th>范围</th></tr></thead>
        <tbody>
          {obligations.data?.obligations.map((item, index) => (
            <tr key={`${item.evidenceId ?? 'coverage'}-${index}`}>
              <td>{item.evidenceId ? <code>{item.evidenceId}</code> : item.node ?? '覆盖清单'}</td>
              <td>{item.obligation}</td>
              <td><StatusBadge status={item.status} /></td>
              <td>{item.scope}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotationTab() {
  const notation = useApi<{ notation: { baseTypes: Array<{ name: string; note: string }>; constants: Array<{ name: string; type: string; note: string }>; note: string } }>('/research/notation');
  const ontology = useApi<{ planner: { steps: string[]; states: Record<string, string>; limits: string[] } }>('/ontology');
  if (notation.loading) return <p>加载中…</p>;
  if (notation.error) return <p className="error">{formatError(notation.error)}</p>;
  return (
    <div className="two-column">
      <div className="card">
        <h2>基本类型与常元</h2>
        <p className="muted">{notation.data?.notation.note}</p>
        <table className="data-table"><thead><tr><th>类型</th><th>说明</th></tr></thead><tbody>
          {notation.data?.notation.baseTypes.map((item) => <tr key={item.name}><td><code>{item.name}</code></td><td>{item.note}</td></tr>)}
        </tbody></table>
        <table className="data-table"><thead><tr><th>常元</th><th>类型</th><th>说明</th></tr></thead><tbody>
          {notation.data?.notation.constants.map((item) => <tr key={item.name}><td><code>{item.name}</code></td><td><code>{item.type}</code></td><td>{item.note}</td></tr>)}
        </tbody></table>
      </div>
      <div className="card">
        <h2>规划器语义</h2>
        <ol>{ontology.data?.planner.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <h3>四种状态</h3>
        <dl className="facts">{Object.entries(ontology.data?.planner.states ?? {}).map(([key, value]) => <div key={key}><dt><StatusBadge status={key} /></dt><dd>{value}</dd></div>)}</dl>
        <h3>边界</h3>
        <ul>{ontology.data?.planner.limits.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

function LegalityTab() {
  const ontology = useApi<{ legality: { status: string; conditions: Array<{ name: string; status: string; detail: string }> }; coordinates: Array<{ name: string; label: string; size: number }>; theory: { axioms: Array<{ id: string; statement: string }> }; environmentBoundary: { refs: string[]; note: string } }>('/ontology');
  if (ontology.loading) return <p>加载中…</p>;
  if (ontology.error) return <p className="error">{formatError(ontology.error)}</p>;
  return (
    <div className="two-column">
      <div className="card">
        <h2>合法本体条件（定义 4.2）</h2>
        <StatusBadge status={ontology.data?.legality.status ?? 'unknown'} />
        <ul className="condition-list">
          {ontology.data?.legality.conditions.map((condition) => (
            <li key={condition.name}><StatusBadge status={condition.status} /><strong>{condition.name}</strong><p>{condition.detail}</p></li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>十二坐标与环境边界</h2>
        <table className="data-table"><thead><tr><th>坐标</th><th>登记量</th></tr></thead><tbody>
          {ontology.data?.coordinates.map((item) => <tr key={item.name}><td>{item.label}</td><td>{item.size}</td></tr>)}
        </tbody></table>
        <h3>∂M 引用</h3>
        <ul>{ontology.data?.environmentBoundary.refs.map((ref) => <li key={ref}><code>{ref}</code></li>)}</ul>
        <p className="muted">{ontology.data?.environmentBoundary.note}</p>
      </div>
    </div>
  );
}

function RelationsTab() {
  const relations = useApi<{ relations: Array<{ id: string; kind: string; from: string; to: string; witness: { status: string }; scope?: string }>; summary: { total: number; byKind: Record<string, number> } }>('/ontology/relations');
  const [left, setLeft] = useState<string[]>([]);
  const [right, setRight] = useState<string[]>([]);
  const [composed, setComposed] = useState<Array<{ id: string; from: string; to: string }>>([]);
  const [error, setError] = useState('');
  if (relations.loading) return <p>加载中…</p>;
  if (relations.error) return <p className="error">{formatError(relations.error)}</p>;

  async function compose() {
    setError('');
    try {
      const result = await api<{ composed: Array<{ id: string; from: string; to: string }> }>('/relations/compose', { method: 'POST', body: { left, right } });
      setComposed(result.composed);
    } catch (reason) { setError(formatError(reason)); }
  }

  return (
    <div className="two-column">
      <div className="card">
        <h2>登记关系</h2>
        <p className="muted">共 {relations.data?.summary.total} 条：{Object.entries(relations.data?.summary.byKind ?? {}).map(([kind, count]) => `${kind} ${count}`).join('，')}</p>
        <table className="data-table"><thead><tr><th>关系</th><th>种类</th><th>端点</th><th>见证</th></tr></thead><tbody>
          {relations.data?.relations.map((relation) => (
            <tr key={relation.id}><td><code>{relation.id}</code></td><td>{relation.kind}</td><td><code>{relation.from} → {relation.to}</code></td><td><StatusBadge status={relation.witness.status} /></td></tr>
          ))}
        </tbody></table>
      </div>
      <div className="card">
        <h2>有限复合 R∘S</h2>
        <p className="muted">只对显式选中的有限记录计算；复合结果保留因子引用，不自动升级为直接关系。</p>
        <label>左侧关系<select multiple value={left} onChange={(event) => setLeft(Array.from(event.target.selectedOptions, (option) => option.value))}>
          {relations.data?.relations.map((relation) => <option key={relation.id} value={relation.id}>{relation.id}（{relation.from} → {relation.to}）</option>)}
        </select></label>
        <label>右侧关系<select multiple value={right} onChange={(event) => setRight(Array.from(event.target.selectedOptions, (option) => option.value))}>
          {relations.data?.relations.map((relation) => <option key={relation.id} value={relation.id}>{relation.id}（{relation.from} → {relation.to}）</option>)}
        </select></label>
        <div className="card-actions"><button className="button primary" onClick={compose}>计算复合</button></div>
        {error && <p className="error">{error}</p>}
        {composed.length > 0 && <ul>{composed.map((item) => <li key={item.id}><code>{item.from} → {item.to}</code>（{item.id}）</li>)}</ul>}
        {composed.length === 0 && !error && <p className="muted">尚未产生复合结果。</p>}
      </div>
    </div>
  );
}
