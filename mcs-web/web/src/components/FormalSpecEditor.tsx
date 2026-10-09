import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Markdown } from './Markdown';
import { useI18n } from '../i18n';
import type { UnavailableInfo } from '../api';
import {
  EMPTY_DECLARATION, PENDING_TEXT, declarationRoleLabel, locateProblem, pending, problemLocationText, specFieldLabel as specFieldText,
  type CatalogBackground, type DeclarationRole, type DeclarationRow, type DraftFields,
  type FormalCatalogView, type SpecSourceKey, type ValidateProblem, type ValidateResult,
} from '../authoring';

/**
 * 形式表达编辑区：背景 + 参数类型表 + 符号选择器 + 公式编辑区 + 实时预览 + 错误位置。
 *
 * 三条设计纪律：
 *
 * 1. **符号选择器只提供「已经登记过的名字」**：背景里有的常量/符号直接点，避免手打错名；
 *    背景登记表没装配时不给假的候选，改为如实说明并允许手工填写背景标识。
 * 2. **本地预览只做排版**：它把源码交给 KaTeX 排出来，明确标注「不代表解析通过」；
 *    解析与类型检查一律以 `POST /formal/validate` 的结果为准。两者分开显示，不混为一谈。
 * 3. **错误位置要能落到具体输入框**：服务端给 `line`/`column`/`token`，界面把它映射到
 *    对应的源码块并选中那一行；映射不上时不猜——保留行号并写明未能定位。
 *
 * 键盘可操作：所有操作都是原生按钮/输入/`<details>`，没有只靠鼠标的交互。
 *
 * 双语（2026-10）：面板自己的文案成对写在下面；来自 `authoring.ts` 的显示词表
 * （字段名、角色名、行/列定位文本）走**临时适配层**（见 `RelationReviewPanel.tsx` 顶部说明），
 * ui-core 交付英文词表后改成直接 import。中文逐字保留：`tests/authoring-page.mjs`
 * 断言页面上出现「解析与类型检查通过」。
 */

/** 焦点位置：参数类型表的一格，或某个源码块。符号就插到这里。 */
type FocusTarget =
  | { kind: 'cell'; index: number; field: 'name' | 'type' | 'label' }
  | { kind: 'text'; key: Exclude<SpecSourceKey, 'declarations'> };

type TextKey = Exclude<SpecSourceKey, 'declarations'>;

const TEXT_KEYS: TextKey[] = ['definitions', 'assumptions', 'statement', 'claims'];

const ROLE_OPTIONS: DeclarationRole[] = ['object', 'element', 'function', 'predicate', 'proposition'];


const COPY = {
  zh: {
    placeholders: {
      definitions: 'def Name : 类型 = 项\n（也接受登记表的写法：Name : 类型 = 项）\n透明缩写：只能引用已有定义/符号，不能当公理用。',
      assumptions: '局部假设，每行一条，例如 groupConcept(mul)(e)(inv)\n它们进证书的 hypotheses，不会被写进理论公理。',
      statement: '陈述必须解析为认证公式（类型 o），例如 ∀a b. mul a b = mul b a',
      claims: '派生断言，每行一条；role 由服务端按协议补齐。',
    } as Record<TextKey, string>,
    lines: (count: number) => ` · ${count} 行`,
    problems: (count: number) => `${count} 处问题`,
    locate: '定位',
    previewTitle: { statement: '陈述', assumptions: '局部假设', claims: '派生断言' } as Record<TextKey, string>,
    background: '背景理论',
    notChosen: '（尚未选择）',
    backgroundOption: (title: string, id: string, version: string) => `${title}（${id} v${version}）`,
    notInCatalog: (id: string) => `${id}（不在目录里）`,
    backgroundId: '背景标识（可直接填写）',
    catalogLoading: '正在读取形式目录（背景、符号、模板、预算）…',
    moduleNotReady: '功能尚未就绪',
    catalogFailed: '形式目录读取失败：',
    moduleSpecifier: (specifier: string) => ` · 模块 ${specifier}`,
    reasonSuffix: (reason: string) => ` · 原因：${reason}`,
    languageNotReady: (
      <>
        解析器尚未就绪：目录返回的 <code>languageReady</code> 为 false，语言版本为
      </>
    ),
    languageNotReadyTail: '。因此「检查表达」这一步暂时无法给出解析结果；背景与符号清单也可能为空，这不是「没有背景」。',
    versionNotReturned: '（未返回）',
    backgroundConstants: '背景常量',
    typeTable: '参数类型表',
    typeTableHint: '每行一个名字与类型。名字在本表达内必须唯一；与背景常量重名会被拒绝（避免同名不同物）。点上面的符号会插到最近聚焦的那一格。',
    columns: { name: '名字', type: '类型', role: '角色', label: '中文说明', action: '操作' },
    rowName: (index: number) => `第 ${index} 行名字`,
    rowType: (index: number) => `第 ${index} 行类型`,
    rowRole: (index: number) => `第 ${index} 行角色`,
    rowLabel: (index: number) => `第 ${index} 行说明`,
    rowUp: (index: number) => `第 ${index} 行上移`,
    rowDown: (index: number) => `第 ${index} 行下移`,
    rowRemove: (index: number) => `删除第 ${index} 行`,
    remove: '删除',
    addRow: '添加一行',
    formulaSection: '公式编辑区',
    formulaHint: (
      <>
        不接受析取 <code>∨/or</code>、经典反证与集合论符号；遇到就报 <code>unsupported</code> 并指出是哪一条（内核无对应规则）。
      </>
    ),
    notationSummary: '记法与别名（解析器认这些写法）',
    alias: (list: string) => `别名 ${list}`,
    rejectedLead: '语言不接受的写法',
    boundedLead: '受限写法：',
    livePreview: '实时公式预览',
    livePreviewHint: (
      <>
        本地排版预览：只把源码交给排版引擎，<strong>不代表解析通过</strong>，也不做类型检查。
        规范读法与规范形式以「检查表达」（<code>POST /formal/validate</code>）的返回为准。
      </>
    ),
    pendingBadge: PENDING_TEXT,
    pendingNote: '这一项还没有内容：显示「待补充」，站点不替你生成。',
    containsDollar: <>源码里含 <code>$$</code>，本地排版预览按原文显示，不做包裹（避免分隔符被吃掉）。</>,
    canonicalReading: '解析器返回的规范读法',
    noResult: '本次没有解析结果：',
    noResultModule: (specifier: string) => `（模块 ${specifier}）`,
    noResultTail: '。',
    notCheckedYet: '还没有跑过检查。',
    noCanonical: '服务端未返回陈述的规范读法。',
    canonicalHash: '规范化表达树哈希：',
    checkResult: '解析与类型检查结果',
    checkNotRun: '，这次检查没有执行：',
    kind: '种类：',
    kindModule: '服务端可选模块未装载',
    kindRoute: '服务端还没有这个接口',
    kindOffline: '请求没有到达服务端',
    errorCode: '错误码：',
    module: '模块：',
    reason: '原因：',
    notAnError: '这不是「表达没错」，也不是「检查没通过」——是检查这件事本身还没法做。',
    neverChecked: '还没有检查过。点「检查表达」把草稿交给解析器。',
    passed: '解析与类型检查通过。注意：这只说明表达是可读、良类型的认证公式，不表示命题成立。',
    failed: (count: number) => `发现 ${count} 处问题；解析没有通过。`,
    stale: (
      <>
        这份结果对应的是<strong>检查那一刻</strong>的源码；之后你又改动了表达，所以它已经不对应当前草稿。
        重新检查一次再往下走（入库用的必须是当前这份表达的检查结果）。
      </>
    ),
    warnings: (count: number) => `需要注意但不拦路的项（${count}）`,
    jumpTo: (field: string) => `跳到「${field}」`,
    noLocation: '服务端没有给出可定位的源码块',
    locateTo: (field: string) => `定位到${field}`,
    cannotLocate: '无法定位',
    token: '相关记号：',
    imprecise: '未能定位到具体输入框：服务端只给了行号，界面不猜是哪一块源码——请对照上面的行号自行核对。',
  },
  en: {
    placeholders: {
      definitions: 'def Name : Type = term\n(the registry form is accepted too: Name : Type = term)\nTransparent abbreviation: it may only refer to existing definitions/symbols, never act as an axiom.',
      assumptions: 'Local assumptions, one per line, e.g. groupConcept(mul)(e)(inv)\nThey become the certificate’s hypotheses and are never written into the theory’s axioms.',
      statement: 'The statement must parse as a certified formula (type o), e.g. ∀a b. mul a b = mul b a',
      claims: 'Derived claims, one per line; the role is filled in by the server according to the protocol.',
    } as Record<TextKey, string>,
    lines: (count: number) => ` · ${count} line${count === 1 ? '' : 's'}`,
    problems: (count: number) => `${count} problem${count === 1 ? '' : 's'}`,
    locate: 'Locate',
    previewTitle: { statement: 'Statement', assumptions: 'Local assumptions', claims: 'Derived claims' } as Record<TextKey, string>,
    background: 'Background theory',
    notChosen: '(not chosen yet)',
    backgroundOption: (title: string, id: string, version: string) => `${title} (${id} v${version})`,
    notInCatalog: (id: string) => `${id} (not in the catalog)`,
    backgroundId: 'Background identifier (you may type it directly)',
    catalogLoading: 'Reading the formal catalog (backgrounds, symbols, templates, budget)…',
    moduleNotReady: 'feature not available yet',
    catalogFailed: 'Could not read the formal catalog: ',
    moduleSpecifier: (specifier: string) => ` · module ${specifier}`,
    reasonSuffix: (reason: string) => ` · reason: ${reason}`,
    languageNotReady: (
      <>
        The parser is not ready yet: the catalog returned <code>languageReady</code> as false, and the language version is
      </>
    ),
    languageNotReadyTail: '. So the “check the expression” step cannot give a parse result for now, and the background and symbol lists may be empty — this is not “there is no background”.',
    versionNotReturned: '(not returned)',
    backgroundConstants: 'Background constants',
    typeTable: 'Parameter type table',
    typeTableHint: 'One name and type per row. The name must be unique inside this expression; a clash with a background constant is rejected (no two different things under one name). Clicking a symbol above inserts it at the most recently focused cell.',
    columns: { name: 'Name', type: 'Type', role: 'Role', label: 'Explanation', action: 'Actions' },
    rowName: (index: number) => `name of row ${index}`,
    rowType: (index: number) => `type of row ${index}`,
    rowRole: (index: number) => `role of row ${index}`,
    rowLabel: (index: number) => `explanation of row ${index}`,
    rowUp: (index: number) => `move row ${index} up`,
    rowDown: (index: number) => `move row ${index} down`,
    rowRemove: (index: number) => `delete row ${index}`,
    remove: 'Delete',
    addRow: 'Add a row',
    formulaSection: 'Formula source blocks',
    formulaHint: (
      <>
        Disjunction <code>∨/or</code>, classical reductio and set-theoretic symbols are not accepted; they are reported as <code>unsupported</code> with the offending item named (the kernel has no rule for them).
      </>
    ),
    notationSummary: 'Notation and aliases (the parser accepts these spellings)',
    alias: (list: string) => `aliases ${list}`,
    rejectedLead: 'Spellings the language does not accept',
    boundedLead: 'Bounded spellings: ',
    livePreview: 'Live formula preview',
    livePreviewHint: (
      <>
        Local typesetting preview: the source is handed to the typesetting engine only; it <strong>does not mean the parse succeeded</strong> and no type checking happens here.
        The canonical reading and canonical form are whatever “check the expression” (<code>POST /formal/validate</code>) returns.
      </>
    ),
    pendingBadge: 'To be supplied',
    pendingNote: 'This item has no content yet: it shows “to be supplied”, the site does not generate it for you.',
    containsDollar: <>The source contains <code>$$</code>, so the local preview shows it verbatim without wrapping (which would swallow the delimiters).</>,
    canonicalReading: 'Canonical reading returned by the parser',
    noResult: 'No parse result this time: ',
    noResultModule: (specifier: string) => ` (module ${specifier})`,
    noResultTail: '.',
    notCheckedYet: 'No check has been run yet.',
    noCanonical: 'The server returned no canonical reading of the statement.',
    canonicalHash: 'Canonical expression-tree hash: ',
    checkResult: 'Parse and type-check result',
    checkNotRun: ', so this check did not run:',
    kind: 'Kind: ',
    kindModule: 'an optional server module is not loaded',
    kindRoute: 'the server does not have this endpoint yet',
    kindOffline: 'the request did not reach the server',
    errorCode: 'Error code: ',
    module: 'Module: ',
    reason: 'Reason: ',
    notAnError: 'This is not “the expression is fine” and not “the check failed” — it is that the check itself cannot be done yet.',
    neverChecked: 'Nothing has been checked yet. Press “check the expression” to hand the draft to the parser.',
    passed: 'The parse and type check passed. Note: this only says the expression is a readable, well-typed certified formula; it does not say the claim holds.',
    failed: (count: number) => `Found ${count} problem${count === 1 ? '' : 's'}; the parse did not pass.`,
    stale: (
      <>
        This result corresponds to the source <strong>at the moment of checking</strong>; you changed the expression afterwards, so it no longer matches the current draft.
        Check again before going on (what gets published must be the check result of the current expression).
      </>
    ),
    warnings: (count: number) => `Worth noting but not blocking (${count})`,
    jumpTo: (field: string) => `Jump to “${field}”`,
    noLocation: 'the server gave no locatable source block',
    locateTo: (field: string) => `Go to ${field}`,
    cannotLocate: 'Cannot locate',
    token: 'Token involved: ',
    imprecise: 'Could not locate the exact input box: the server only gave a line number, and the interface does not guess which source block it is — please check it yourself against the line numbers above.',
  },
} as const;

export interface FormalSpecEditorProps {
  fields: DraftFields;
  onChange: (patch: Partial<DraftFields>) => void;
  catalog: FormalCatalogView | null;
  catalogProblems: string[];
  catalogUnavailable: UnavailableInfo | null;
  catalogLoading: boolean;
  problems: ValidateProblem[];
  validation: ValidateResult | null;
  /** 检查之后又改过源码：结果仍显示，但必须写明它对应的是上一次的内容。 */
  validationStale: boolean;
  validateUnavailable: UnavailableInfo | null;
  /** 是否显示错误清单（「检查表达」这一步显示；填写步骤只显示计数）。 */
  showProblems: boolean;
  disabled?: boolean;
}

export function FormalSpecEditor(props: FormalSpecEditorProps) {
  const {
    fields, onChange, catalog, catalogProblems, catalogUnavailable, catalogLoading,
    problems, validation, validationStale, validateUnavailable, showProblems, disabled,
  } = props;
  const { locale } = useI18n();
  const text = COPY[locale];

  /** 参数类型表的字段名与角色名：词表只有一份，在 `authoring.ts` 里按语种取。 */
  const specFieldLabel = (key: string) => specFieldText(key, locale);
  const roleLabel = (role: string) => declarationRoleLabel(role, locale);

  const [focusTarget, setFocusTarget] = useState<FocusTarget>({ kind: 'text', key: 'statement' });
  const [caret, setCaret] = useState<{ target: FocusTarget; position: number } | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const textRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const gutterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const background: CatalogBackground | null = useMemo(
    () => catalog?.backgrounds.find((item) => item.id === fields.background) ?? null,
    [catalog, fields.background],
  );

  /* ---------- 光标插入：纯文本操作，不做任何数学猜测 ---------- */

  const spliceAtCaret = useCallback((el: HTMLInputElement | HTMLTextAreaElement | null, current: string, insert: string): { next: string; position: number } => {
    // 没有聚焦在目标输入框时**追加到末尾**，而不是插到第 0 位：后者会让"点一下符号"
    // 看起来像把公式打乱了。
    const focused = el !== null && typeof document !== 'undefined' && document.activeElement === el;
    const start = focused && typeof el.selectionStart === 'number' ? el.selectionStart : current.length;
    const end = focused && typeof el.selectionEnd === 'number' ? el.selectionEnd : current.length;
    const needsSpace = start > 0 && !/\s$/.test(current.slice(0, start)) && !/^[\s)\]]/.test(insert);
    const inserted = `${needsSpace ? ' ' : ''}${insert}`;
    return { next: `${current.slice(0, start)}${inserted}${current.slice(end)}`, position: start + inserted.length };
  }, []);

  const insertSymbol = useCallback((symbol: string) => {
    if (disabled) return;
    if (focusTarget.kind === 'cell') {
      const row = fields.declarations[focusTarget.index];
      if (!row) return;
      const el = cellRefs.current[`${focusTarget.index}:${focusTarget.field}`] ?? null;
      const current = row[focusTarget.field] ?? '';
      const { next, position } = spliceAtCaret(el, current, symbol);
      const rows = fields.declarations.map((item, index) => (index === focusTarget.index ? { ...item, [focusTarget.field]: next } : item));
      onChange({ declarations: rows });
      setCaret({ target: focusTarget, position });
      return;
    }
    const key = focusTarget.key;
    const el = textRefs.current[key] ?? null;
    const current = fields[key] ?? '';
    const { next, position } = spliceAtCaret(el, current, symbol);
    onChange({ [key]: next } as Partial<DraftFields>);
    setCaret({ target: focusTarget, position });
  }, [disabled, fields, focusTarget, onChange, spliceAtCaret]);

  // 插入之后再设光标：受控组件要等这一轮渲染完才有新的 selection 可言。
  useEffect(() => {
    if (!caret) return;
    if (caret.target.kind === 'cell') {
      const el = cellRefs.current[`${caret.target.index}:${caret.target.field}`];
      if (el) { el.focus(); el.setSelectionRange(caret.position, caret.position); }
    } else {
      const el = textRefs.current[caret.target.key];
      if (el) { el.focus(); el.setSelectionRange(caret.position, caret.position); }
    }
    setCaret(null);
  }, [caret]);

  /* ---------- 参数类型表 ---------- */

  function updateRow(index: number, patch: Partial<DeclarationRow>) {
    onChange({ declarations: fields.declarations.map((row, position) => (position === index ? { ...row, ...patch } : row)) });
  }

  function addRow() {
    onChange({ declarations: [...fields.declarations, { ...EMPTY_DECLARATION }] });
  }

  function removeRow(index: number) {
    const rows = fields.declarations.filter((_, position) => position !== index);
    onChange({ declarations: rows.length ? rows : [{ ...EMPTY_DECLARATION }] });
  }

  function moveRow(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= fields.declarations.length) return;
    const rows = [...fields.declarations];
    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved);
    onChange({ declarations: rows });
  }

  /* ---------- 错误定位 ---------- */

  const located = useMemo(
    () => problems.map((problem) => ({ problem, location: locateProblem(problem, fields) })),
    [problems, fields],
  );

  function focusLocation(field: SpecSourceKey | null, line: number | null) {
    if (!field) return;
    if (field === 'declarations') {
      const el = cellRefs.current['0:name'];
      el?.focus();
      return;
    }
    const el = textRefs.current[field];
    if (!el) return;
    el.focus();
    if (line && line >= 1) {
      const lines = el.value.split('\n');
      const offset = lines.slice(0, Math.min(line - 1, lines.length)).reduce((sum, item) => sum + item.length + 1, 0);
      const length = lines[Math.min(line - 1, lines.length - 1)]?.length ?? 0;
      el.setSelectionRange(offset, offset + length);
    }
  }

  /* ---------- 源码块的渲染（含行号与滚动同步） ---------- */

  function sourceBlock(key: TextKey) {
    const value = fields[key];
    const lineCount = Math.max(1, value.split('\n').length);
    const blockProblems = located.filter((item) => item.location.field === key);
    return (
      <div className="spec-source" key={key}>
        <label className="spec-source-label" htmlFor={`spec-${key}`}>
          {specFieldLabel(key)}
          <span className="muted">{text.lines(lineCount)}</span>
          {blockProblems.length > 0 && <span className="spec-problem-count">{text.problems(blockProblems.length)}</span>}
        </label>
        <div className="spec-source-body">
          <div
            className="spec-lines"
            aria-hidden="true"
            ref={(element) => { gutterRefs.current[key] = element; }}
          >
            {Array.from({ length: lineCount }, (_, index) => <span key={index}>{index + 1}</span>)}
          </div>
          <textarea
            id={`spec-${key}`}
            rows={key === 'statement' ? 4 : 3}
            value={value}
            disabled={disabled}
            spellCheck={false}
            placeholder={text.placeholders[key]}
            ref={(element) => { textRefs.current[key] = element; }}
            onFocus={() => setFocusTarget({ kind: 'text', key })}
            onChange={(event) => onChange({ [key]: event.target.value } as Partial<DraftFields>)}
            onScroll={(event) => {
              const gutter = gutterRefs.current[key];
              if (gutter) gutter.scrollTop = event.currentTarget.scrollTop;
            }}
          />
        </div>
        {blockProblems.length > 0 && (
          <ul className="spec-inline-problems">
            {blockProblems.map(({ problem }) => (
              <li key={`${problem.code}-${problem.line}-${problem.column}-${problem.message}`}>
                <code>{problem.code}</code>
                <span className="spec-loc">{problemLocationText(problem, locale)}</span>
                {problem.message}
                <button type="button" className="link-button" onClick={() => focusLocation(key, problem.line)}>{text.locate}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  /* ---------- 实时排版预览 ---------- */

  const previewBlocks: Array<{ key: TextKey; title: string }> = [
    { key: 'statement', title: text.previewTitle.statement },
    { key: 'assumptions', title: text.previewTitle.assumptions },
    { key: 'claims', title: text.previewTitle.claims },
  ];

  return (
    <div className="spec-editor">
      <div className="spec-grid">
        <label>
          {text.background}
          <select
            value={fields.background}
            disabled={disabled}
            onChange={(event) => onChange({ background: event.target.value })}
          >
            <option value="">{text.notChosen}</option>
            {(catalog?.backgrounds ?? []).map((item) => (
              <option key={item.id} value={item.id}>{text.backgroundOption(item.title, item.id, item.version)}</option>
            ))}
            {/* 目录里没有、但草稿里已经写着某个背景标识时，保留它，不静默改写成空。 */}
            {fields.background && !(catalog?.backgrounds ?? []).some((item) => item.id === fields.background) && (
              <option value={fields.background}>{text.notInCatalog(fields.background)}</option>
            )}
          </select>
        </label>
        <label>
          {text.backgroundId}
          <input
            value={fields.background}
            disabled={disabled}
            spellCheck={false}
            placeholder="bg:group/1"
            onChange={(event) => onChange({ background: event.target.value })}
          />
        </label>
      </div>

      {catalogLoading && <p className="muted">{text.catalogLoading}</p>}
      {catalogUnavailable && (
        <p className="error">
          {text.catalogFailed}{catalogUnavailable.kind === 'module' ? text.moduleNotReady : catalogUnavailable.message}
          {catalogUnavailable.specifier ? text.moduleSpecifier(catalogUnavailable.specifier) : ''}
          {catalogUnavailable.reason ? text.reasonSuffix(catalogUnavailable.reason) : ''}
        </p>
      )}
      {catalogProblems.map((problem) => <p className="muted" key={problem}>{problem}</p>)}
      {catalog && !catalog.languageReady && (
        <p className="error">
          {text.languageNotReady}
          {catalog.languageVersion ? ` ${catalog.languageVersion}` : ` ${text.versionNotReturned}`}
          {text.languageNotReadyTail}
        </p>
      )}

      {background && (
        <div className="spec-background">
          <p className="muted">{background.note}</p>
          {background.constants.length > 0 && (
            <>
              <h3>{text.backgroundConstants}</h3>
              <ul className="symbol-list">
                {background.constants.map((symbol) => (
                  <li key={symbol.name}>
                    <button type="button" className="symbol-chip" disabled={disabled} title={`${symbol.type}${symbol.note ? ` · ${symbol.note}` : ''}`} onClick={() => insertSymbol(symbol.name)}>
                      <code>{symbol.name}</code>
                      <span className="muted">{symbol.type}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <section className="spec-section">
        <h3>{text.typeTable}</h3>
        <p className="hint">{text.typeTableHint}</p>
        <div className="spec-table-wrap">
          <table className="data-table spec-table">
            <thead>
              <tr>
                <th scope="col">{text.columns.name}</th>
                <th scope="col">{text.columns.type}</th>
                <th scope="col">{text.columns.role}</th>
                <th scope="col">{text.columns.label}</th>
                <th scope="col">{text.columns.action}</th>
              </tr>
            </thead>
            <tbody>
              {fields.declarations.map((row, index) => (
                <tr key={index}>
                  <td>
                    <input
                      aria-label={text.rowName(index + 1)}
                      value={row.name}
                      disabled={disabled}
                      spellCheck={false}
                      ref={(element) => { cellRefs.current[`${index}:name`] = element; }}
                      onFocus={() => setFocusTarget({ kind: 'cell', index, field: 'name' })}
                      onChange={(event) => updateRow(index, { name: event.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={text.rowType(index + 1)}
                      value={row.type}
                      disabled={disabled}
                      spellCheck={false}
                      placeholder="G -> G -> o"
                      ref={(element) => { cellRefs.current[`${index}:type`] = element; }}
                      onFocus={() => setFocusTarget({ kind: 'cell', index, field: 'type' })}
                      onChange={(event) => updateRow(index, { type: event.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={text.rowRole(index + 1)}
                      value={row.role}
                      disabled={disabled}
                      onChange={(event) => updateRow(index, { role: event.target.value as DeclarationRole })}
                    >
                      {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={text.rowLabel(index + 1)}
                      value={row.label}
                      disabled={disabled}
                      ref={(element) => { cellRefs.current[`${index}:label`] = element; }}
                      onFocus={() => setFocusTarget({ kind: 'cell', index, field: 'label' })}
                      onChange={(event) => updateRow(index, { label: event.target.value })}
                    />
                  </td>
                  <td className="spec-row-actions">
                    <button type="button" className="link-button" disabled={disabled} onClick={() => moveRow(index, -1)} aria-label={text.rowUp(index + 1)}>↑</button>
                    <button type="button" className="link-button" disabled={disabled} onClick={() => moveRow(index, 1)} aria-label={text.rowDown(index + 1)}>↓</button>
                    <button type="button" className="link-button" disabled={disabled} onClick={() => removeRow(index)} aria-label={text.rowRemove(index + 1)}>{text.remove}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-actions">
          <button type="button" className="button small" disabled={disabled} onClick={addRow}>{text.addRow}</button>
        </div>
      </section>

      <section className="spec-section">
        <h3>{text.formulaSection}</h3>
        <div className="spec-sources">
          {TEXT_KEYS.map((key) => sourceBlock(key))}
        </div>
        <p className="hint">{text.formulaHint}</p>
      </section>

      {catalog && (catalog.operators.length > 0 || catalog.boundedTypes.length > 0) && (
        <details className="case-details spec-operators">
          <summary>{text.notationSummary}</summary>
          {/*
            语言明确不接受的记号（例如析取 `∨`）**不给插入按钮**：能点就等于在暗示「可以这么写」。
            它只以说明的形式出现，并写明为什么不行（内核没有对应规则）。
          */}          {catalog.operators.filter((operator) => !operator.rejected).length > 0 && (
            <ul className="symbol-list">
              {catalog.operators.filter((operator) => !operator.rejected).map((operator) => (
                <li key={operator.token}>
                  <button type="button" className="symbol-chip" disabled={disabled} title={operator.note} onClick={() => insertSymbol(operator.token)}>
                    <code>{operator.token}</code>
                    {operator.alias.length > 0 && <span className="muted">{text.alias(operator.alias.join(' / '))}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {catalog.operators.filter((operator) => operator.rejected).length > 0 && (
            <div className="spec-rejected">
              <strong>{text.rejectedLead}</strong>
              <ul>
                {catalog.operators.filter((operator) => operator.rejected).map((operator) => (
                  <li key={operator.token}>
                    <code>{operator.token}</code>
                    {operator.alias.length > 0 && <span className="muted">（{operator.alias.join(' / ')}）</span>}
                    {operator.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {catalog.boundedTypes.length > 0 && (
            <p className="muted">
              {text.boundedLead}{catalog.boundedTypes.map((item) => <span key={item.name}><code>{item.name}</code>（{item.note}） </span>)}
            </p>
          )}
        </details>
      )}

      {/* ---------- 实时预览：本地排版 vs 解析器读法，两件事分开写 ---------- */}
      <section className="spec-section spec-preview">
        <h3>{text.livePreview}</h3>
        <p className="hint">{text.livePreviewHint}</p>
        {previewBlocks.map(({ key, title }) => {
          const value = pending(fields[key], locale);
          // 源码里自带 `$$` 时不做整体包裹：那会把分隔符吃掉，预览反而骗人。这种情况原样显示。
          const wrapSafe = !value.text.includes('$$');
          return (
            <div className="spec-preview-block" key={key}>
              <div className="spec-preview-head">
                <strong>{title}</strong>
                {value.pending && <span className="badge badge-neutral" data-status="pending">{text.pendingBadge}</span>}
              </div>
              {value.pending
                ? <p className="muted">{text.pendingNote}</p>
                : wrapSafe
                  ? <div className="spec-preview-math"><Markdown>{`\n$$\n${value.text}\n$$\n`}</Markdown></div>
                  : (
                    <>
                      <p className="muted">{text.containsDollar}</p>
                      <pre className="spec-canonical">{value.text}</pre>
                    </>
                  )}
            </div>
          );
        })}
        <div className="spec-preview-block">
          <div className="spec-preview-head"><strong>{text.canonicalReading}</strong></div>
          {validateUnavailable && (
            <p className="error">
              {text.noResult}{text.moduleNotReady}
              {validateUnavailable.specifier ? text.noResultModule(validateUnavailable.specifier) : ''}
              {validateUnavailable.reason ? text.reasonSuffix(validateUnavailable.reason) : ''}{text.noResultTail}
            </p>
          )}
          {!validateUnavailable && !validation && <p className="muted">{text.notCheckedYet}</p>}
          {validation && (
            <>
              {validation.statementReadable
                ? <p className="spec-canonical">{validation.statementReadable}</p>
                : <p className="muted">{text.noCanonical}</p>}
              {validation.assumptionsReadable.length > 0 && (
                <ul className="spec-canonical-list">
                  {validation.assumptionsReadable.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              )}
              {/* 服务端给的 TeX 比本地包裹更可信：它是解析器从规范形式导出的排版。 */}
              {validation.statementTex && (
                <div className="spec-preview-math">
                  <Markdown>{`\n$$\n${validation.statementTex}\n$$\n`}</Markdown>
                </div>
              )}
              {validation.hash && <p className="muted">{text.canonicalHash}<code>{validation.hash}</code></p>}
              {validation.notes.map((note) => <p className="muted" key={note}>{note}</p>)}
            </>
          )}
        </div>
      </section>

      {showProblems && (
        <section className="spec-section spec-problems">
          <h3>{text.checkResult}</h3>
          {validateUnavailable ? (
            <div className="error">
              <p><strong>{text.moduleNotReady}</strong>{text.checkNotRun}</p>
              <ul>
                <li>{text.kind}{validateUnavailable.kind === 'module' ? text.kindModule : validateUnavailable.kind === 'route' ? text.kindRoute : text.kindOffline}</li>
                {validateUnavailable.code && <li>{text.errorCode}<code>{validateUnavailable.code}</code></li>}
                {validateUnavailable.specifier && <li>{text.module}<code>{validateUnavailable.specifier}</code></li>}
                {validateUnavailable.reason && <li>{text.reason}{validateUnavailable.reason}</li>}
              </ul>
              <p className="muted">{text.notAnError}</p>
            </div>
          ) : !validation ? (
            <p className="muted">{text.neverChecked}</p>
          ) : (
            <>
              <p className={validation.ok ? 'notice' : 'error'}>
                {validation.ok
                  ? text.passed
                  : text.failed(problems.length)}
              </p>
              {validationStale && (
                <p className="error">{text.stale}</p>
              )}
              {validation.warnings.length > 0 && (
                <div className="spec-warnings">
                  <strong>{text.warnings(validation.warnings.length)}</strong>
                  <ul>
                    {validation.warnings.map((warning) => (
                      <li key={`${warning.code}-${warning.message}`}><code>{warning.code}</code> {warning.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {problems.length > 0 && (
                <ol className="spec-problem-list">
                  {located.map(({ problem, location }) => (
                    <li key={`${problem.code}-${problem.line}-${problem.column}-${problem.message}`}>
                      <div className="spec-problem-head">
                        <code>{problem.code}</code>
                        <span className="spec-loc">{problemLocationText(problem, locale)}</span>
                        <button
                          type="button"
                          className="button small"
                          onClick={() => focusLocation(location.field, problem.line)}
                          disabled={!location.field}
                          title={location.field ? text.jumpTo(specFieldLabel(location.field)) : text.noLocation}
                        >
                          {location.field ? text.locateTo(specFieldLabel(location.field)) : text.cannotLocate}
                        </button>
                      </div>
                      <p>{problem.message}</p>
                      {problem.token && <p className="muted">{text.token}<code>{problem.token}</code></p>}
                      {!location.precise && (
                        <p className="muted">{text.imprecise}</p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
