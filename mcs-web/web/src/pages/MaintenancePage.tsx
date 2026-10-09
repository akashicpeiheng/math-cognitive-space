import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatError, useApi } from '../api';
import { useI18n } from '../i18n';
import { StatusBadge } from '../components/StatusBadge';
import type { CoverageEntry, EvidenceRecord, LocalizationDefinition, LocalizationResultView } from '../types';

/**
 * 网站维护：站点自身的维护材料。
 *
 * 中英双语（2026-10）：界面文案走 `MAINT_TEXT` 成对表。
 * **服务端读盘与本体下发的文字仍是中文**（口径说明、覆盖边界、证据标题、局部化定义、
 * 规划器步骤…）：英文语境用 `isPending()` 标注「尚未翻译」，不自己编英文假装已翻译。
 */
interface MaintText {
  tabs: Record<'sources' | 'coverage' | 'localizations' | 'claims' | 'obligations' | 'notation' | 'legality' | 'relations' | 'authoring', string>;
  heading: string;
  leadPrefix: string;
  leadStrongA: string;
  leadMid: string;
  leadStrongB: string;
  leadSuffix: string;
  boundary: string;
  loading: string;
  sep: string;
  listSep: string;

  authoring: {
    catalogLoading: string;
    title: string;
    body: string;
    open: string;
    pickObject: string;
    parser: string;
    ready: (version: string) => string;
    notReadyPrefix: string;
    notReadySuffix: string;
    backgrounds: string;
    noBackgrounds: string;
    templates: string;
    templateCount: (count: number) => string;
    noTemplates: string;
    extension: string;
    extensionInfo: (revision: string, revisions: number, nodes: number) => string;
    none: string;
    notReturned: string;
    coverageTitle: string;
    headers: { caseName: string; nodes: string; specs: string; missing: string };
    missingMore: (count: number) => string;
    boundariesTitle: string;
    /** 第一条边界含一个加粗短语，拆成三段（中英词序不同）。 */
    boundary1Prefix: string;
    boundary1Strong: string;
    boundary1Suffix: string;
    boundaries: string[];
  };

  sources: {
    loading: string;
    groundRules: string;
    readAt: (time: string) => string;
    cached: string;
    live: string;
    readLine: (mode: string, ms: number) => string;
    thesisTitle: string;
    chapters: (count: number) => string;
    thesisNote: (path: string) => string;
    headers: { chapter: string; title: string; file: string; size: string };
    arxivTitle: string;
    files: (count: number) => string;
    arxivMissing: (path: string) => string;
    arxivNote: (path: string, dirs: string[], bib: number) => string;
    subdirs: (dirs: string) => string;
    bibCount: (count: number) => string;
    titleLabel: string;
    abstractHead: string;
    metadataSummary: (count: number) => string;
    bibSummary: (count: number) => string;
    fileHeaders: { file: string; path: string; size: string };
    anchorsTitle: string;
    anchorsCount: (linked: number, labels: number) => string;
    anchorsNote: (source: string) => string;
    anchorHeaders: { anchor: string; node: string; relation: string; basis: string };
    notInPaper: string;
    noNode: (kind: string) => string;
    relations: Record<'defines' | 'states' | 'instance' | 'none', string>;
    missingInPaper: string;
    missingSuffix: string;
    unregisteredPrefix: (count: number) => string;
    unregisteredSuffix: string;
    releasesTitle: string;
    releasesCount: (count: number, parsed: number) => string;
    releasesNote: (path: string) => string;
    noReleases: string;
    releaseHeaders: { date: string; version: string; dir: string; files: string; modified: string };
    unparsed: string;
    groupReleases: string;
    groupSnapshots: string;
    docsTitle: string;
    docsGroup: (files: number, size: string) => string;
    moreFiles: (count: number) => string;
    referencesTitle: string;
    referencesCount: (count: number) => string;
    referencesNote: (path: string) => string;
  };

  coverage: {
    headers: { module: string; chapter: string; status: string; implementation: string; tests: string; boundary: string };
  };

  localization: {
    params: string;
    noParams: string;
    preserves: string;
    boundary: string;
    paramsLabel: string;
    run: string;
    summary: (visible: number, bounds: number) => string;
    /** 局部化家族里的条数后缀（中文「项」，英文 `items`）。 */
    itemCount: (count: number) => string;
    computableYes: string;
    computableIfData: string;
  };

  claims: {
    obligations: string;
    /** 义务之间的分隔符：中文分号，英文分号加空格。 */
    obligationSep: string;
    replay: string;
  };

  obligations: {
    headers: { source: string; obligation: string; status: string; scope: string };
    coverageFallback: string;
  };

  notation: {
    baseTypesTitle: string;
    headers: { type: string; note: string };
    constantsTitle: string;
    constantHeaders: { constant: string; type: string; note: string };
    plannerTitle: string;
    statesTitle: string;
    limitsTitle: string;
  };

  legality: {
    title: string;
    coordinatesTitle: string;
    coordinateHeaders: { coordinate: string; size: string };
    refs: string;
  };

  relations: {
    registeredTitle: string;
    summary: (total: number, kinds: string) => string;
    headers: { relation: string; kind: string; ends: string; witness: string };
    composeTitle: string;
    composeNote: string;
    left: string;
    right: string;
    compose: string;
    none: string;
  };
}

const MAINT_TEXT: { zh: MaintText; en: MaintText } = {
  zh: {
    tabs: {
      sources: '专稿与 arXiv',
      coverage: '专稿覆盖',
      localizations: '局部化 LC01–36',
      claims: '断言与证据',
      obligations: '证明义务',
      notation: '记号与类型',
      legality: '合法本体条件',
      relations: '关系运算',
      authoring: '自动关联',
    },
    heading: '网站维护',
    leadPrefix: '这一页放的是',
    leadStrongA: '这个网站自身的维护材料',
    leadMid: '：专稿分章与 arXiv 投稿包的只读清单、专稿定义与实现入口的逐条对照、36 个局部化算子、证据义务、基本类型与合法本体条件、关系运算，以及把对象写成形式表达并自动找关系的',
    leadStrongB: '自动关联',
    leadSuffix: '入口。（它原来叫「研究台」；研究台现在改成放前沿研究的公开问题与可借用的工具。）',
    boundary: '定义存在不等于可判；接口名称不签发结论。清单按仓库当前状态实时读取，改动文件后刷新即可。',
    loading: '加载中…',
    sep: '，',
    listSep: '、',
    authoring: {
      catalogLoading: '读取形式目录…',
      title: '自动关联（把对象写成形式表达，再自动找关系）',
      body: '流程六步：填写节点 → 检查表达 → 自动发现 → 审阅结果 → 入库预览 → 确认入库（含回滚）。它复用受限形式语言 `mcs-formal/1`、四个预置背景理论，以及 kernel 支持的那一部分证明能力。',
      open: '打开自动关联',
      pickObject: '先挑一个数学对象',
      parser: '解析器',
      ready: (version) => `已就绪（语言版本 ${version}）`,
      notReadyPrefix: '未就绪：目录返回的语言版本为 ',
      notReadySuffix: '，`languageReady` 不是 true。',
      backgrounds: '背景理论',
      noBackgrounds: '（目录里没有背景：登记表未装配时不给假候选）',
      templates: '四案例模板',
      templateCount: (count) => `${count} 套`,
      noTemplates: '（服务端未给模板；页面内置四案例骨架模板可用）',
      extension: '扩展包',
      extensionInfo: (revision, revisions, nodes) => `当前生效版本 ${revision} · 共 ${revisions} 条版本记录 · 扩展节点 ${nodes} 个`,
      none: '（无）',
      notReturned: '（未返回）',
      coverageTitle: '四案例形式化覆盖',
      headers: { caseName: '案例', nodes: '节点', specs: '已登记表达', missing: '仍缺' },
      missingMore: (count) => ` …（共 ${count} 条）`,
      boundariesTitle: '三条写死的边界',
      boundary1Prefix: '网络预览只叠加当前草稿与结果，',
      boundary1Strong: '不立即改公共图',
      boundary1Suffix: '；已反驳与未决项只出现在审阅视图。',
      boundaries: [
        '',
        '联合推导必须显示共同输入：`conditions` 逐条列出，连线标成「联合 N 项」，不当成独立蕴含。',
        '入库走六步事务并写不可变内容包；回滚另建一条版本记录，不删除历史包、证据或学习者记录。',
      ],
    },
    sources: {
      loading: '读取仓库清单…',
      groundRules: '口径',
      readAt: (time) => `读取时间：${time}`,
      cached: '命中缓存（未重新读盘）',
      live: '实时读盘',
      readLine: (mode, ms) => `这次${mode}，耗时 ${ms} ms。`,
      thesisTitle: '专稿分章',
      chapters: (count) => `${count} 章`,
      thesisNote: (path) => `目录 ${path}；标题取自分章文件名，与本体内登记的章节引用是两套口径（覆盖对照见「专稿覆盖」标签）。`,
      headers: { chapter: '章', title: '标题', file: '文件', size: '大小' },
      arxivTitle: 'arXiv 投稿包',
      files: (count) => `${count} 个文件`,
      arxivMissing: (path) => `仓库里没有这个目录（${path}），如实说明，不编条目。`,
      arxivNote: (path, dirs, bib) => `目录 ${path}${dirs.length > 0 ? ` · 子目录：${dirs.join('、')}` : ''} · 参考文献 ${bib} 条`,
      subdirs: (dirs) => ` · 子目录：${dirs}`,
      bibCount: (count) => ` · 参考文献 ${count} 条`,
      titleLabel: '标题',
      abstractHead: '摘要开头：',
      metadataSummary: (count) => `投稿元数据（submission-metadata.txt，${count} 行）`,
      bibSummary: (count) => `参考文献条目（${count} 条，来自 references.bib）`,
      fileHeaders: { file: '文件', path: '相对路径', size: '大小' },
      anchorsTitle: '正文锚点 ↔ 本体节点',
      anchorsCount: (linked, labels) => `${linked} 条已打通 / 论文 ${labels} 个 label`,
      anchorsNote: (source) => `来源 ${source}：解析正文里的 \\label，与 data/paper-anchors.mjs 的登记表逐条对照。约定是「定理 / 定义编号 ↔ 本体节点 id」，对不上节点的条目如实写明它讲的是什么（接口、规划器、理论结论）。`,
      anchorHeaders: { anchor: '论文锚点', node: '本体节点', relation: '关系', basis: '依据' },
      notInPaper: '（论文里找不到这个 label）',
      noNode: (kind) => `无对应节点 · ${kind}`,
      relations: { defines: '定义', states: '陈述', instance: '用例', none: '—' },
      missingInPaper: '登记了但论文里没有：',
      missingSuffix: '——对照过期了，应当更新登记表（不是论文的问题）。',
      unregisteredPrefix: (count) => `还有 ${count} 个 label 没进登记表（`,
      unregisteredSuffix: '）：它们多数是章节、图表与接口定义，不指向某个数学对象。',
      releasesTitle: '发布与历史快照',
      releasesCount: (count, parsed) => `${count} 条 · 解析出版本/日期 ${parsed} 条`,
      releasesNote: (path) => `目录 ${path}；按日期倒序（同一天正式发布排在历史快照之前）。日期取自目录名，modifiedAt 是目录的修改时间——两者都给出来，可互相参看。`,
      noReleases: '没有找到发布或历史目录，如实说明，不编条目。',
      releaseHeaders: { date: '日期', version: '版本 / 标签', dir: '目录', files: '文件数', modified: '目录修改时间' },
      unparsed: '未解析',
      groupReleases: '正式发布',
      groupSnapshots: '历史快照',
      docsTitle: '发布、验证与交付文档',
      docsGroup: (files, size) => `${files} 个文件 · ${size}`,
      moreFiles: (count) => `…另有 ${count} 个文件`,
      referencesTitle: '本机参考文献',
      referencesCount: (count) => `${count} 份`,
      referencesNote: (path) => `目录 ${path}。这里只列清单，用来核对「引用是否可核验」；正文里的引用写的是章节位置，不是这些文件名。`,
    },
    coverage: {
      headers: { module: '模块', chapter: '章节', status: '状态', implementation: '实现入口', tests: '测试', boundary: '当前边界' },
    },
    localization: {
      params: '参数',
      noParams: '无显式参数',
      preserves: '保持',
      boundary: '边界',
      paramsLabel: '参数 JSON',
      run: '运行该算子',
      summary: (visible, bounds) => `${visible} 个可见项 · ${bounds} 条边界`,
      itemCount: (count) => `${count} 项`,
      computableYes: '可计算',
      computableIfData: '条件可算',
    },
    claims: {
      obligations: '仍缺：',
      obligationSep: '；',
      replay: '重放',
    },
    obligations: {
      headers: { source: '来源', obligation: '义务', status: '状态', scope: '范围' },
      coverageFallback: '覆盖清单',
    },
    notation: {
      baseTypesTitle: '基本类型与常元',
      headers: { type: '类型', note: '说明' },
      constantsTitle: '常元',
      constantHeaders: { constant: '常元', type: '类型', note: '说明' },
      plannerTitle: '规划器语义',
      statesTitle: '四种状态',
      limitsTitle: '边界',
    },
    legality: {
      title: '合法本体条件（定义 4.2）',
      coordinatesTitle: '十二坐标与环境边界',
      coordinateHeaders: { coordinate: '坐标', size: '登记量' },
      refs: '∂M 引用',
    },
    relations: {
      registeredTitle: '登记关系',
      summary: (total, kinds) => `共 ${total} 条：${kinds}`,
      headers: { relation: '关系', kind: '种类', ends: '端点', witness: '见证' },
      composeTitle: '有限复合 R∘S',
      composeNote: '只对显式选中的有限记录计算；复合结果保留因子引用，不自动升级为直接关系。',
      left: '左侧关系',
      right: '右侧关系',
      compose: '计算复合',
      none: '尚未产生复合结果。',
    },
  },
  en: {
    tabs: {
      sources: 'Monograph and arXiv',
      coverage: 'Monograph coverage',
      localizations: 'Localizations LC01–36',
      claims: 'Claims and evidence',
      obligations: 'Proof obligations',
      notation: 'Notation and types',
      legality: 'Legal-ontology conditions',
      relations: 'Relation algebra',
      authoring: 'Relation discovery',
    },
    heading: 'Maintenance',
    leadPrefix: 'This page holds ',
    leadStrongA: 'the maintenance material of the site itself',
    leadMid: ': a read-only listing of the monograph chapters and the arXiv submission package, a clause-by-clause comparison of the monograph’s definitions with their implementation entries, the 36 localization operators, evidence obligations, base types and legal-ontology conditions, relation algebra, and the ',
    leadStrongB: 'relation discovery',
    leadSuffix: ' entry that writes objects as formal expressions and finds relations automatically. (It used to be called “research workbench”; the research workbench now holds open problems and reusable tools.)',
    boundary: 'A definition existing is not the same as it being decidable; an interface name issues no conclusion. The listings are read live from the repository, so refresh after changing files.',
    loading: 'Loading…',
    sep: ', ',
    listSep: ', ',
    authoring: {
      catalogLoading: 'Reading the formal catalog…',
      title: 'Relation discovery (write objects as formal expressions, then find relations automatically)',
      body: 'Six steps: fill in the node → check the expression → discover automatically → review the results → preview the commit → confirm the commit (with rollback). It reuses the restricted formal language `mcs-formal/1`, four preset background theories, and the part of the proof capability the kernel supports.',
      open: 'Open relation discovery',
      pickObject: 'Pick a mathematical object first',
      parser: 'Parser',
      ready: (version) => `Ready (language version ${version})`,
      notReadyPrefix: 'Not ready: the catalog returned language version ',
      notReadySuffix: ', and `languageReady` is not true.',
      backgrounds: 'Background theories',
      noBackgrounds: '(No backgrounds in the catalog: when the registry is not assembled, no fake candidates are offered)',
      templates: 'Four-case templates',
      templateCount: (count) => `${count} sets`,
      noTemplates: '(The server returned no templates; the four-case skeleton templates built into the page are available)',
      extension: 'Extension package',
      extensionInfo: (revision, revisions, nodes) => `active revision ${revision} · ${revisions} revision records · ${nodes} extension nodes`,
      none: '(none)',
      notReturned: '(not returned)',
      coverageTitle: 'Formal coverage of the four cases',
      headers: { caseName: 'Case', nodes: 'Nodes', specs: 'Registered expressions', missing: 'Still missing' },
      missingMore: (count) => ` … (${count} in all)`,
      boundariesTitle: 'Three hard-coded boundaries',
      boundary1Prefix: 'The network preview overlays only the current draft and the results and does ',
      boundary1Strong: 'not change the public graph immediately',
      boundary1Suffix: '; refuted and undecided items appear only in the review view.',
      boundaries: [
        '',
        'A joint derivation must show its shared inputs: the `conditions` are listed one by one and the link is labelled “N joint items”, not treated as an independent implication.',
        'Committing runs a six-step transaction and writes an immutable content package; rollback creates another revision record and deletes no historical package, evidence or learner record.',
      ],
    },
    sources: {
      loading: 'Reading the repository listing…',
      groundRules: 'Ground rules',
      readAt: (time) => `Read at: ${time}`,
      cached: 'a cache hit (the disk was not re-read)',
      live: 'read live from disk',
      readLine: (mode, ms) => `This time it was ${mode}, taking ${ms} ms.`,
      thesisTitle: 'Monograph chapters',
      chapters: (count) => `${count} chapters`,
      thesisNote: (path) => `Directory ${path}; the titles come from the chapter file names, which is a different convention from the chapter references registered in the ontology (see the “monograph coverage” tab for the comparison).`,
      headers: { chapter: 'Ch.', title: 'Title', file: 'File', size: 'Size' },
      arxivTitle: 'arXiv submission package',
      files: (count) => `${count} files`,
      arxivMissing: (path) => `This directory does not exist in the repository (${path}); that is stated honestly rather than filled with invented entries.`,
      arxivNote: (path, dirs, bib) => `Directory ${path}${dirs.length > 0 ? ` · subdirectories: ${dirs.join(', ')}` : ''} · ${bib} bibliography entries`,
      subdirs: (dirs) => ` · subdirectories: ${dirs}`,
      bibCount: (count) => ` · ${count} bibliography entries`,
      titleLabel: 'Title',
      abstractHead: 'Abstract begins: ',
      metadataSummary: (count) => `Submission metadata (submission-metadata.txt, ${count} lines)`,
      bibSummary: (count) => `Bibliography entries (${count}, from references.bib)`,
      fileHeaders: { file: 'File', path: 'Relative path', size: 'Size' },
      anchorsTitle: 'Paper anchors ↔ ontology nodes',
      anchorsCount: (linked, labels) => `${linked} linked / ${labels} labels in the paper`,
      anchorsNote: (source) => `Source ${source}: the \\label commands in the text are parsed and compared one by one with the registry in data/paper-anchors.mjs. The convention is “theorem / definition number ↔ ontology node id”; entries that do not match a node state honestly what they are about (interfaces, the planner, theoretical conclusions).`,
      anchorHeaders: { anchor: 'Paper anchor', node: 'Ontology node', relation: 'Relation', basis: 'Basis' },
      notInPaper: '(this label is not found in the paper)',
      noNode: (kind) => `No matching node · ${kind}`,
      relations: { defines: 'defines', states: 'states', instance: 'instance', none: '—' },
      missingInPaper: 'Registered but absent from the paper: ',
      missingSuffix: ' — the comparison is out of date and the registry should be updated (this is not a problem with the paper).',
      unregisteredPrefix: (count) => `${count} more labels are not in the registry (`,
      unregisteredSuffix: '): most of them are sections, figures and interface definitions, and point at no mathematical object.',
      releasesTitle: 'Releases and historical snapshots',
      releasesCount: (count, parsed) => `${count} entries · version/date parsed for ${parsed}`,
      releasesNote: (path) => `Directory ${path}; sorted by date descending (on the same day a release comes before a historical snapshot). The date comes from the directory name and modifiedAt is the directory’s own modification time — both are given so they can be read against each other.`,
      noReleases: 'No release or historical directories were found; that is stated honestly rather than filled with invented entries.',
      releaseHeaders: { date: 'Date', version: 'Version / tag', dir: 'Directory', files: 'Files', modified: 'Directory modified' },
      unparsed: 'not parsed',
      groupReleases: 'release',
      groupSnapshots: 'historical snapshot',
      docsTitle: 'Release, validation and delivery documents',
      docsGroup: (files, size) => `${files} files · ${size}`,
      moreFiles: (count) => `… and ${count} more files`,
      referencesTitle: 'Local references',
      referencesCount: (count) => `${count} files`,
      referencesNote: (path) => `Directory ${path}. This is only a listing, used to check whether citations can be verified; the citations in the text give chapter locations, not these file names.`,
    },
    coverage: {
      headers: { module: 'Module', chapter: 'Chapter', status: 'Status', implementation: 'Implementation entry', tests: 'Tests', boundary: 'Current boundary' },
    },
    localization: {
      params: 'Inputs',
      noParams: 'no explicit inputs',
      preserves: 'Preserves',
      boundary: 'Boundary',
      paramsLabel: 'Input JSON',
      run: 'Run this operator',
      summary: (visible, bounds) => `${visible} visible items · ${bounds} boundary notes`,
      itemCount: (count) => `${count} items`,
      computableYes: 'computable',
      computableIfData: 'computable given data',
    },
    claims: {
      obligations: 'Still missing: ',
      obligationSep: '; ',
      replay: 'Replay',
    },
    obligations: {
      headers: { source: 'Source', obligation: 'Obligation', status: 'Status', scope: 'Scope' },
      coverageFallback: 'coverage list',
    },
    notation: {
      baseTypesTitle: 'Base types and constants',
      headers: { type: 'Type', note: 'Note' },
      constantsTitle: 'Constants',
      constantHeaders: { constant: 'Constant', type: 'Type', note: 'Note' },
      plannerTitle: 'Planner semantics',
      statesTitle: 'The four states',
      limitsTitle: 'Boundaries',
    },
    legality: {
      title: 'Legal-ontology conditions (definition 4.2)',
      coordinatesTitle: 'Twelve coordinates and the environment boundary',
      coordinateHeaders: { coordinate: 'Coordinate', size: 'Registered' },
      refs: '∂M references',
    },
    relations: {
      registeredTitle: 'Registered relations',
      summary: (total, kinds) => `${total} in all: ${kinds}`,
      headers: { relation: 'Relation', kind: 'Kind', ends: 'Endpoints', witness: 'Witness' },
      composeTitle: 'Finite composition R∘S',
      composeNote: 'Computed only for the finitely many records selected explicitly; the composition keeps the factor references and is not automatically promoted to a direct relation.',
      left: 'Left relation',
      right: 'Right relation',
      compose: 'Compute composition',
      none: 'No composition has been produced yet.',
    },
  },
};

const TAB_IDS = ['sources', 'coverage', 'localizations', 'claims', 'obligations', 'notation', 'legality', 'relations', 'authoring'] as const;
type TabId = (typeof TAB_IDS)[number];

export function MaintenancePage() {
  const [tab, setTab] = useState<TabId>('sources');
  const { pick } = useI18n();
  const text = pick(MAINT_TEXT);
  return (
    <div className="page">
      <div className="section-heading">
        <h1>{text.heading}</h1>
        <p>
          {text.leadPrefix}<strong>{text.leadStrongA}</strong>{text.leadMid}<strong>{text.leadStrongB}</strong>{text.leadSuffix}
        </p>
        <p className="muted">{text.boundary}</p>
      </div>
      <nav className="tabs">
        {TAB_IDS.map((id) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{text.tabs[id]}</button>)}
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.authoring;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );

  if (catalog.loading) return <p>{tab.catalogLoading}</p>;

  return (
    <div className="card">
      <h2>{tab.title}</h2>
      <p>
        {tab.body}
      </p>
      <div className="card-actions">
        <Link className="button primary" to="/authoring">{tab.open}</Link>
        <Link className="button ghost" to="/nodes">{tab.pickObject}</Link>
      </div>

      <dl className="facts compact">
        <div>
          <dt>{tab.parser}</dt>
          <dd>
            {catalog.data?.languageReady
              ? <>{tab.ready(catalog.data.languageVersion ?? '')}</>
              : <>{tab.notReadyPrefix}{catalog.data?.languageVersion ? <code>{catalog.data.languageVersion}</code> : tab.notReturned}{tab.notReadySuffix}</>}
          </dd>
        </div>
        <div><dt>{tab.backgrounds}</dt><dd>{catalog.data?.backgrounds.length ? catalog.data.backgrounds.map((item) => <code key={item.id}>{item.id} </code>) : tab.noBackgrounds}</dd></div>
        <div><dt>{tab.templates}</dt><dd>{catalog.data?.templates.length ? tab.templateCount(catalog.data.templates.length) : tab.noTemplates}</dd></div>
        <div><dt>{tab.extension}</dt><dd>{catalog.data?.extension ? <>{tab.extensionInfo(catalog.data.extension.activeRevision ?? tab.none, catalog.data.extension.revisions, catalog.data.extension.nodes)}</> : tab.notReturned}</dd></div>
      </dl>

      {catalog.error && <p className="error">{formatError(catalog.error)}</p>}

      {catalog.data?.coverage && catalog.data.coverage.length > 0 && (
        <>
          <h3>{tab.coverageTitle}</h3>
          <p className="muted"><span {...pendingProps(catalog.data.coverageNote)}>{catalog.data.coverageNote}</span></p>
          <table className="data-table">
            <thead><tr><th>{tab.headers.caseName}</th><th>{tab.headers.nodes}</th><th>{tab.headers.specs}</th><th>{tab.headers.missing}</th></tr></thead>
            <tbody>
              {catalog.data.coverage.map((entry) => (
                <tr key={entry.case}>
                  <td>{entry.case}</td>
                  <td className="muted">{entry.nodes}</td>
                  <td className="muted">{entry.specs}</td>
                  <td className="muted">{entry.missing.length ? entry.missing.slice(0, 6).join(text.listSep) + (entry.missing.length > 6 ? tab.missingMore(entry.missing.length) : '') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3>{tab.boundariesTitle}</h3>
      <ul>
        <li>{tab.boundary1Prefix}<strong>{tab.boundary1Strong}</strong>{tab.boundary1Suffix}</li>
        <li>{tab.boundaries[1]}</li>
        <li>{tab.boundaries[2]}</li>
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
  const { pick, fmtDate, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.sources;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (sources.loading) return <p>{tab.loading}</p>;
  if (sources.error) return <p className="error">{formatError(sources.error)}</p>;
  const data = sources.data;
  if (!data) return null;
  const totalBytes = (entries: SourceEntry[]) => entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const size = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
  return (
    <>
      <div className="card">
        <h2>{tab.groundRules}</h2>
        <p className="muted"><span {...pendingProps(data.note)}>{data.note}</span></p>
        <p className="muted">
          {tab.readAt(fmtDate(data.generatedAt))}
          {' · '}
          {/* 缓存之后更要写清「这份数据是什么时候的」（TODO A4-33）。 */}
          {tab.readLine(data.cached ? tab.cached : tab.live, data.readMs)}
        </p>
      </div>

      <div className="card">
        <h2>{tab.thesisTitle}<span className="family-count">{tab.chapters(data.thesis.chapters.length)}</span></h2>
        <p className="muted">
          {tab.thesisNote(data.thesis.path)}
        </p>
        <table className="data-table">
          <thead><tr><th>{tab.headers.chapter}</th><th>{tab.headers.title}</th><th>{tab.headers.file}</th><th>{tab.headers.size}</th></tr></thead>
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
        <h2>{tab.arxivTitle}<span className="family-count">{tab.files(data.arxiv.files.length)}</span></h2>
        {!data.arxiv.available && <p className="muted">{tab.arxivMissing(data.arxiv.path)}</p>}
        {data.arxiv.available && (
          <>
            <p className="muted">
              {tab.arxivNote(data.arxiv.path, data.arxiv.dirs, data.arxiv.bibEntries)}
            </p>
            {data.arxiv.title && <p><strong>{tab.titleLabel}</strong>：{data.arxiv.title}</p>}
            {data.arxiv.abstractHead && <p className="muted">{tab.abstractHead}{data.arxiv.abstractHead}…</p>}
            {data.arxiv.metadata.length > 0 && (
              <details className="case-details">
                <summary>{tab.metadataSummary(data.arxiv.metadata.length)}</summary>
                <ul>{data.arxiv.metadata.map((line) => <li key={line}><code>{line}</code></li>)}</ul>
              </details>
            )}
            {data.arxiv.bibKeys.length > 0 && (
              <details className="case-details">
                <summary>{tab.bibSummary(data.arxiv.bibKeys.length)}</summary>
                <ul>{data.arxiv.bibKeys.map((key) => <li key={key}><code>{key}</code></li>)}</ul>
              </details>
            )}
            <table className="data-table">
              <thead><tr><th>{tab.fileHeaders.file}</th><th>{tab.fileHeaders.path}</th><th>{tab.fileHeaders.size}</th></tr></thead>
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
            <h3>{tab.anchorsTitle}<span className="family-count">
              {tab.anchorsCount(data.arxiv.anchors.linkedCount, data.arxiv.anchors.labelCount)}
            </span></h3>
            <p className="muted">
              {tab.anchorsNote(data.arxiv.anchors.source)}
            </p>
            <table className="data-table">
              <thead><tr><th>{tab.anchorHeaders.anchor}</th><th>{tab.anchorHeaders.node}</th><th>{tab.anchorHeaders.relation}</th><th>{tab.anchorHeaders.basis}</th></tr></thead>
              <tbody>
                {data.arxiv.anchors.entries.map((entry) => (
                  <tr key={`${entry.anchor}-${entry.nodeId ?? entry.kind ?? 'none'}`}>
                    <td>
                      <code>{entry.anchor}</code>
                      {!entry.inPaper && <span className="muted">{tab.notInPaper}</span>}
                    </td>
                    <td>
                      {entry.nodeId
                        ? <Link to={`/nodes/${encodeURIComponent(entry.nodeId)}`}><code>{entry.nodeId}</code></Link>
                        : <span className="muted">{tab.noNode(entry.kind ?? '')}</span>}
                    </td>
                    <td className="muted">
                      {tab.relations[entry.relation]}
                    </td>
                    <td className="muted"><span {...pendingProps(entry.note)}>{entry.note}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.arxiv.anchors.missingInPaper.length > 0 && (
              <p className="muted">
                {tab.missingInPaper}{data.arxiv.anchors.missingInPaper.map((anchor) => <code key={anchor}>{anchor} </code>)}
                {tab.missingSuffix}
              </p>
            )}
            {data.arxiv.anchors.unregistered.length > 0 && (
              <p className="muted">
                {tab.unregisteredPrefix(data.arxiv.anchors.unregistered.length)}
                {data.arxiv.anchors.unregistered.slice(0, 8).map((label) => <code key={label}>{label} </code>)}
                {data.arxiv.anchors.unregistered.length > 8 ? '…' : ''}
                {tab.unregisteredSuffix}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>{tab.releasesTitle}<span className="family-count">
          {tab.releasesCount(data.releases.records.length, data.releases.parsedCount)}
        </span></h2>
        {/*
          版本与日期从**目录名**解析（TODO A4-32）：第四十七轮的边界是「只列文件名」。
          名字里日期后面那一段不都是版本号——`20261002-before` 的 `before` 是阶段标签，
          因此版本号只在长得像版本时才填（见 server/maintenance.mjs 的 versionLike）。
          解析不出来的条目也列出来，并写明「未解析」，不猜。
        */}
        <p className="muted">
          {tab.releasesNote(data.releases.path)}
        </p>
        {data.releases.records.length === 0 && <p className="muted">{tab.noReleases}</p>}
        {data.releases.records.length > 0 && (
          <table className="data-table">
            <thead><tr><th>{tab.releaseHeaders.date}</th><th>{tab.releaseHeaders.version}</th><th>{tab.releaseHeaders.dir}</th><th>{tab.releaseHeaders.files}</th><th>{tab.releaseHeaders.modified}</th></tr></thead>
            <tbody>
              {data.releases.records.map((record) => (
                <tr key={record.path}>
                  <td>{record.date ?? <span className="muted">{tab.unparsed}</span>}</td>
                  <td>
                    {record.version ? <code>{record.version}</code> : <span className="muted">{record.label ?? '—'}</span>}
                  </td>
                  <td>
                    <code>{record.name}</code>
                    <span className="muted"> · {record.group === 'releases' ? tab.groupReleases : tab.groupSnapshots}</span>
                  </td>
                  <td className="muted">{record.fileCount}</td>
                  <td className="muted">{record.modifiedAt ? fmtDate(record.modifiedAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>{tab.docsTitle}</h2>
        <div className="source-groups">
          {data.thesis.docs.map((group) => (
            <div key={group.name}>
              <strong>{group.name}</strong>
              <span className="muted">{tab.docsGroup(group.entries.length, size(totalBytes(group.entries)))}</span>
              <ul>
                {group.entries.slice(0, 12).map((entry) => (
                  <li key={entry.path}><code>{entry.name}</code></li>
                ))}
                {group.entries.length > 12 && <li className="muted">{tab.moreFiles(group.entries.length - 12)}</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>{tab.referencesTitle}<span className="family-count">{tab.referencesCount(data.references.files.length)}</span></h2>
        <p className="muted">
          {tab.referencesNote(data.references.path)}
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.coverage;
  /** 覆盖清单来自本体，仍是中文：英文语境下标注「尚未翻译」。 */
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (coverage.loading) return <p>{text.loading}</p>;
  if (coverage.error) return <p className="error">{formatError(coverage.error)}</p>;
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>{tab.headers.module}</th><th>{tab.headers.chapter}</th><th>{tab.headers.status}</th><th>{tab.headers.implementation}</th><th>{tab.headers.tests}</th><th>{tab.headers.boundary}</th></tr></thead>
        <tbody>
          {coverage.data?.coverage.map((entry) => (
            <tr key={entry.module}>
              <td><strong>{entry.module}</strong><p className="muted"><span {...pendingProps(entry.definitions.join(text.listSep))}>{entry.definitions.join(text.listSep)}</span></p></td>
              <td><span {...pendingProps(entry.chapter)}>{entry.chapter}</span></td>
              <td><StatusBadge status={entry.status} /></td>
              <td><ul>{entry.implementation.map((item) => <li key={item}><code>{item}</code></li>)}</ul></td>
              <td><ul>{entry.tests.map((item) => <li key={item}><span {...pendingProps(item)}>{item}</span></li>)}</ul></td>
              <td><span {...pendingProps(entry.boundary)}>{entry.boundary}</span></td>
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.localization;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
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

  if (localizations.loading) return <p>{text.loading}</p>;
  if (localizations.error) return <p className="error">{formatError(localizations.error)}</p>;
  return (
    <div className="localization-tab">
      {error && <p className="error">{error}</p>}
      {[...grouped.entries()].map(([family, items]) => (
        <section key={family}>
          <h2>{family}<span className="family-count">{tab.itemCount(items.length)}</span></h2>
          <p className="muted"><span {...pendingProps(localizations.data?.families[family])}>{localizations.data?.families[family]}</span></p>
          <div className="lc-grid">
            {items.map((item) => (
              <article className="card lc-card" key={item.id}>
                <header>
                  <span className="construct">{item.id}</span>
                  <strong><span {...pendingProps(item.name)}>{item.name}</span></strong>
                  <StatusBadge
                    status={item.computable === 'yes' ? 'implemented' : item.computable === 'if-data' ? 'partial' : 'interface-only'}
                    label={item.computable === 'yes' ? tab.computableYes : item.computable === 'if-data' ? tab.computableIfData : item.computable}
                  />
                </header>
                <p><span {...pendingProps(item.definition)}>{item.definition}</span></p>
                <dl className="facts compact">
                  <div><dt>{tab.params}</dt><dd>{item.inputs.length ? item.inputs.join(text.listSep) : tab.noParams}</dd></div>
                  <div><dt>{tab.preserves}</dt><dd><span {...pendingProps(item.preserves)}>{item.preserves}</span></dd></div>
                  <div><dt>{tab.boundary}</dt><dd><span {...pendingProps(item.boundary)}>{item.boundary}</span></dd></div>
                </dl>
                <label className="params">{tab.paramsLabel}<textarea rows={2} value={paramsText[item.id] ?? JSON.stringify(defaultParams(item), null, 0)} onChange={(event) => setParamsText((current) => ({ ...current, [item.id]: event.target.value }))} /></label>
                <button className="button small" onClick={() => run(item)}>{tab.run}</button>
                {results[item.id] && (
                  <div className="lc-result">
                    <StatusBadge status={results[item.id].status} />
                    <span>{tab.summary(results[item.id].V.length, results[item.id].boundary.length)}</span>
                    {results[item.id].reason && <p><span {...pendingProps(results[item.id].reason)}>{results[item.id].reason}</span></p>}
                    {results[item.id].pres.map((pres) => <p key={pres.claim}><StatusBadge status={pres.status} /> <span {...pendingProps(pres.claim)}>{pres.claim}</span></p>)}
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.claims;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (claims.loading) return <p>{text.loading}</p>;
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
          <header><StatusBadge status={claim.status} /><strong><span {...pendingProps(claim.statement)}>{claim.statement}</span></strong></header>
          <p><code>{claim.node}</code> · <span {...pendingProps(claim.title)}>{claim.title}</span></p>
          {claim.evidence.map((record) => (
            <div className="evidence-row" key={record.id}>
              <StatusBadge status={record.status} /><StatusBadge status={record.checkStatus} />
              <span {...pendingProps(record.title)}>{record.title}</span>
              <span className="muted"><span {...pendingProps(record.scope)}>{record.scope}</span></span>
              {record.obligations.length > 0 && <span className="obligations">{tab.obligations}{record.obligations.join(tab.obligationSep)}</span>}
              {record.certificate && <button className="button small" onClick={() => run(record)}>{tab.replay}</button>}
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.obligations;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (obligations.loading) return <p>{text.loading}</p>;
  if (obligations.error) return <p className="error">{formatError(obligations.error)}</p>;
  return (
    <div className="card">
      <table className="data-table">
        <thead><tr><th>{tab.headers.source}</th><th>{tab.headers.obligation}</th><th>{tab.headers.status}</th><th>{tab.headers.scope}</th></tr></thead>
        <tbody>
          {obligations.data?.obligations.map((item, index) => (
            <tr key={`${item.evidenceId ?? 'coverage'}-${index}`}>
              <td>{item.evidenceId ? <code>{item.evidenceId}</code> : <span {...pendingProps(item.node ?? tab.coverageFallback)}>{item.node ?? tab.coverageFallback}</span>}</td>
              <td><span {...pendingProps(item.obligation)}>{item.obligation}</span></td>
              <td><StatusBadge status={item.status} /></td>
              <td><span {...pendingProps(item.scope)}>{item.scope}</span></td>
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
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.notation;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (notation.loading) return <p>{text.loading}</p>;
  if (notation.error) return <p className="error">{formatError(notation.error)}</p>;
  return (
    <div className="two-column">
      <div className="card">
        <h2>{tab.baseTypesTitle}</h2>
        <p className="muted"><span {...pendingProps(notation.data?.notation.note)}>{notation.data?.notation.note}</span></p>
        <table className="data-table"><thead><tr><th>{tab.headers.type}</th><th>{tab.headers.note}</th></tr></thead><tbody>
          {notation.data?.notation.baseTypes.map((item) => <tr key={item.name}><td><code>{item.name}</code></td><td><span {...pendingProps(item.note)}>{item.note}</span></td></tr>)}
        </tbody></table>
        <table className="data-table"><thead><tr><th>{tab.constantHeaders.constant}</th><th>{tab.constantHeaders.type}</th><th>{tab.constantHeaders.note}</th></tr></thead><tbody>
          {notation.data?.notation.constants.map((item) => <tr key={item.name}><td><code>{item.name}</code></td><td><code>{item.type}</code></td><td><span {...pendingProps(item.note)}>{item.note}</span></td></tr>)}
        </tbody></table>
      </div>
      <div className="card">
        <h2>{tab.plannerTitle}</h2>
        <ol>{ontology.data?.planner.steps.map((step) => <li key={step}><span {...pendingProps(step)}>{step}</span></li>)}</ol>
        <h3>{tab.statesTitle}</h3>
        <dl className="facts">{Object.entries(ontology.data?.planner.states ?? {}).map(([key, value]) => <div key={key}><dt><StatusBadge status={key} /></dt><dd><span {...pendingProps(value)}>{value}</span></dd></div>)}</dl>
        <h3>{tab.limitsTitle}</h3>
        <ul>{ontology.data?.planner.limits.map((item) => <li key={item}><span {...pendingProps(item)}>{item}</span></li>)}</ul>
      </div>
    </div>
  );
}

function LegalityTab() {
  const ontology = useApi<{ legality: { status: string; conditions: Array<{ name: string; status: string; detail: string }> }; coordinates: Array<{ name: string; label: string; size: number }>; theory: { axioms: Array<{ id: string; statement: string }> }; environmentBoundary: { refs: string[]; note: string } }>('/ontology');
  const { pick, isPending, t } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.legality;
  const pendingProps = (value: string | null | undefined) => (
    isPending(value) ? { className: 'i18n-pending', title: t('i18n.pendingTitle') } : {}
  );
  if (ontology.loading) return <p>{text.loading}</p>;
  if (ontology.error) return <p className="error">{formatError(ontology.error)}</p>;
  return (
    <div className="two-column">
      <div className="card">
        <h2>{tab.title}</h2>
        <StatusBadge status={ontology.data?.legality.status ?? 'unknown'} />
        <ul className="condition-list">
          {ontology.data?.legality.conditions.map((condition) => (
            <li key={condition.name}><StatusBadge status={condition.status} /><strong><span {...pendingProps(condition.name)}>{condition.name}</span></strong><p><span {...pendingProps(condition.detail)}>{condition.detail}</span></p></li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2>{tab.coordinatesTitle}</h2>
        <table className="data-table"><thead><tr><th>{tab.coordinateHeaders.coordinate}</th><th>{tab.coordinateHeaders.size}</th></tr></thead><tbody>
          {ontology.data?.coordinates.map((item) => <tr key={item.name}><td><span {...pendingProps(item.label)}>{item.label}</span></td><td>{item.size}</td></tr>)}
        </tbody></table>
        <h3>{tab.refs}</h3>
        <ul>{ontology.data?.environmentBoundary.refs.map((ref) => <li key={ref}><code>{ref}</code></li>)}</ul>
        <p className="muted"><span {...pendingProps(ontology.data?.environmentBoundary.note)}>{ontology.data?.environmentBoundary.note}</span></p>
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
  const { pick } = useI18n();
  const text = pick(MAINT_TEXT);
  const tab = text.relations;
  if (relations.loading) return <p>{text.loading}</p>;
  if (relations.error) return <p className="error">{formatError(relations.error)}</p>;

  async function compose() {
    setError('');
    try {
      const result = await api<{ composed: Array<{ id: string; from: string; to: string }> }>('/relations/compose', { method: 'POST', body: { left, right } });
      setComposed(result.composed);
    } catch (reason) { setError(formatError(reason)); }
  }

  const kindPairs = Object.entries(relations.data?.summary.byKind ?? {});
  const kindText = kindPairs.map(([kind, count]) => `${kind} ${count}`).join(text.sep);

  return (
    <div className="two-column">
      <div className="card">
        <h2>{tab.registeredTitle}</h2>
        <p className="muted">{tab.summary(relations.data?.summary.total ?? 0, kindText)}</p>
        <table className="data-table"><thead><tr><th>{tab.headers.relation}</th><th>{tab.headers.kind}</th><th>{tab.headers.ends}</th><th>{tab.headers.witness}</th></tr></thead><tbody>
          {relations.data?.relations.map((relation) => (
            <tr key={relation.id}><td><code>{relation.id}</code></td><td>{relation.kind}</td><td><code>{relation.from} → {relation.to}</code></td><td><StatusBadge status={relation.witness.status} /></td></tr>
          ))}
        </tbody></table>
      </div>
      <div className="card">
        <h2>{tab.composeTitle}</h2>
        <p className="muted">{tab.composeNote}</p>
        <label>{tab.left}<select multiple value={left} onChange={(event) => setLeft(Array.from(event.target.selectedOptions, (option) => option.value))}>
          {relations.data?.relations.map((relation) => <option key={relation.id} value={relation.id}>{relation.id}（{relation.from} → {relation.to}）</option>)}
        </select></label>
        <label>{tab.right}<select multiple value={right} onChange={(event) => setRight(Array.from(event.target.selectedOptions, (option) => option.value))}>
          {relations.data?.relations.map((relation) => <option key={relation.id} value={relation.id}>{relation.id}（{relation.from} → {relation.to}）</option>)}
        </select></label>
        <div className="card-actions"><button className="button primary" onClick={compose}>{tab.compose}</button></div>
        {error && <p className="error">{error}</p>}
        {composed.length > 0 && <ul>{composed.map((item) => <li key={item.id}><code>{item.from} → {item.to}</code>（{item.id}）</li>)}</ul>}
        {composed.length === 0 && !error && <p className="muted">{tab.none}</p>}
      </div>
    </div>
  );
}
