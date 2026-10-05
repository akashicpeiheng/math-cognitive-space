import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { StartEntry, StartGoal, StartPace, StartPreferences } from '../start-preferences';

/**
 * 「开始学习」页开头的**偏好引导**：三问，然后给出一份属于你的起点。
 *
 * 用户的要求是「不要让用户一开始就学，让用户先去从大的视角选择学习的偏好，
 * 设置几个引导性的问题，优化交互逻辑，让用户真实地感到自己在主导自己的学习」。
 *
 * 这里的设计取舍：
 *
 * 1. **问题在前，内容在后**。进入页面先看到三问，而不是一屏案例与入口——先定方向，再看材料。
 * 2. **一次只问一个**（渐进披露）。答完第 1 问才出现第 2 问，答完第 2 问才出现第 3 问；
 *    每一问下方写明「为什么问这个」，让选择有依据，而不是被问卷牵着走。
 * 3. **答案立刻变成可点的入口**。每一问都能看到自己选了什么，最后收成一张「你的起点」卡：
 *    2–3 个真实链接 + 依据说明。选了就有后果，这才叫主导。
 * 4. **随时能退**。每一问都能改、能跳；「全部用默认」一键给出一份保守起点；
 *    页面下方原有的按角度入口**一条都没有删**——引导是排序，不是门禁。
 * 5. **只写本机**。偏好存在 `localStorage`，只影响这一页给你排的顺序；
 *    **不写学习者档案 E**，也不改变本体 M。这一点在界面上写明。
 */

/*
 * 偏好类型与常量**只有一处定义**（`web/src/start-preferences.ts`）：`/plan` 也读同一份偏好
 * （TODO A4-23），定义留在组件里会让规划页反向依赖一个组件模块。这里重新导出，
 * 既有的 `from '../components/StartChooser'` 引用不必改。
 */
export type { StartEntry, StartGoal, StartPace, StartPreferences } from '../start-preferences';
export { EMPTY_PREFERENCES, PREF_KEY } from '../start-preferences';

/** 三问的定义：选项、以及「为什么问这个」。 */
export const GOAL_OPTIONS: Array<{ id: StartGoal; label: string; hint: string }> = [
  { id: 'gap', label: '我知道自己卡在哪', hint: '先补那个具体缺口' },
  { id: 'route', label: '我想按顺序推进', hint: '给我一条路线' },
  { id: 'overview', label: '我先想看全局', hint: '让我自己挑' },
  { id: 'concept', label: '我只想弄懂一个概念', hint: '直奔对象页' },
];

export const ENTRY_OPTIONS: Array<{ id: StartEntry; label: string; hint: string }> = [
  { id: 'case', label: '按案例', hint: '从一个原型问题进' },
  { id: 'discipline', label: '按学科', hint: '按领域筛对象' },
  { id: 'construct', label: '按对象类型', hint: '定义 / 定理 / 反例…' },
  { id: 'method', label: '按方法', hint: '先要讲法' },
  { id: 'practice', label: '按练习', hint: '先做题' },
];

export const PACE_OPTIONS: Array<{ id: StartPace; label: string; hint: string }> = [
  { id: 'small', label: '一次一小步', hint: '给 15 分钟能走完的入口' },
  { id: 'block', label: '一次走一段', hint: '给完整的一条路线' },
  { id: 'checkpoint', label: '先做检查点', hint: '先看我会不会' },
  { id: 'free', label: '先不设节奏', hint: '我自己看着办' },
];

export interface StartPlanItem {
  label: string;
  to: string;
  why: string;
  primary?: boolean;
}

/**
 * 把三问的答案翻译成具体入口。
 *
 * 只做「排序与取舍」，不做内容推荐：每一项都是站内已有的页面或入口，
 * 依据写得出来才列；答案不全时给保守的默认（看全局 + 按案例）。
 *
 * 2026-10（TODO A4-25）：**默认起点分首访与回访**。三问一个都没答时，
 * 首访者看到的是「先看全局」（他不知道这里有什么，先给结构），
 * 回访者看到的是「接着上次」（他已经有进度，先给继续与复习的入口）。
 * 判据由调用方给（`returning`），因为这个区别与有没有学习记录无关——
 * 只与「这个人以前打开过这一页吗」有关。
 */
export function buildStartPlan(preferences: StartPreferences, { returning = false }: { returning?: boolean } = {}): { items: StartPlanItem[]; basis: string[]; isDefault: boolean } {
  const goal = preferences.goal ?? 'overview';
  const entry = preferences.entry ?? 'case';
  const pace = preferences.pace ?? 'free';
  const isDefault = preferences.goal === null && preferences.entry === null && preferences.pace === null;
  const basis: string[] = [];
  const items: StartPlanItem[] = [];

  if (isDefault) {
    /*
     * 一个都没答：这是「默认起点」，不是「你选了看全局」。
     * 因此依据里要写清这是默认，并说明首访与回访拿到的东西不一样。
     */
    if (returning) {
      basis.push('你是回访者：没有偏好时默认起点先接上次的进度（首访者的默认是先看全局）。');
      items.push({ label: '接着上次：看学习记录与复习队列', to: '/profile', why: '回访者最常用的是继续与复习；这一页把两者放在最上面。', primary: true });
      items.push({ label: '回到案例', to: '/start#cases', why: '换一条线索重新进，不会改动已有记录。' });
      items.push({ label: '先随便逛逛（不改任何记录）', to: '/nodes', why: '浏览不会把节点标记为已掌握。' });
      return { items, basis, isDefault };
    }
    basis.push('第一次来：没有偏好时默认起点先看全局，再决定从哪里下钻。');
    items.push({ label: '打开知识网络', to: '/network', why: '按关系强弱上色，硬前置与登记关联分开显示。', primary: true });
    items.push({ label: '看看有哪些案例', to: '/start#cases', why: '每个案例都对应一类困惑，选最像你的那条。' });
    items.push({ label: '先定方向（回答上面三个问题）', to: '/start#prefs', why: '答完这三问，这一页会按你的答案重排入口。' });
    return { items, basis, isDefault };
  }

  if (goal === 'gap') {
    basis.push('你说自己卡在某个具体缺口上：先补前置，再回到原来的地方。');
    items.push({ label: '看这个对象缺哪些前置', to: '/network', why: '知识网络里右键按住一个节点，能取出它的强关联前置。', primary: true });
    items.push({ label: '按学科找到那个对象', to: '/nodes', why: '按领域与对象类型筛到它，节点页写明条件与反例。' });
  } else if (goal === 'route') {
    basis.push('你要顺序：这一页给你路线，而不是一堆散入口。');
    items.push({ label: '规划一条学习路线', to: '/plan', why: '选目标节点，规划器按本体里的关系算顺序。', primary: true });
    items.push({ label: '先看一条范例路径', to: '/plan', why: '范例路径带里程碑与实测事件界，先看看节奏。' });
  } else if (goal === 'concept') {
    basis.push('你只想弄懂一个概念：直接进对象页，节点页把动机、条件与反例放在一起。');
    items.push({ label: '找一个数学对象', to: '/nodes', why: '按标题、ID 或摘要搜索，或按领域筛。', primary: true });
    items.push({ label: '看看它有哪些关系', to: '/network', why: '在网络视图里看它连着谁、哪条更硬。' });
  } else {
    basis.push('你先想看全局：先看结构，再决定从哪里下钻。');
    items.push({ label: '打开知识网络', to: '/network', why: '按关系强弱上色，硬前置与登记关联分开显示。', primary: true });
    items.push({ label: '看看有哪些案例', to: '/start#cases', why: '每个案例都从一个具体的困惑长到规范形式。' });
  }

  if (entry === 'method') {
    items.push({ label: '先去方法库', to: '/method', why: '你选了按方法进入：那里按重要性排了十条方法论。' });
  } else if (entry === 'practice') {
    items.push({ label: '去自检与练习', to: '/profile', why: '你选了按练习进入：自检任务与复习队列都在「我的学习」。' });
  } else if (entry === 'discipline' || entry === 'construct') {
    items.push({ label: entry === 'discipline' ? '按学科筛对象' : '按对象类型筛对象', to: '/nodes', why: '筛选条件会写在列表页顶部，随时能改。' });
  } else {
    items.push({ label: '从原型问题进入', to: '/start#cases', why: '五个案例各自对应一类困惑，选最像你的那条。' });
  }

  if (pace === 'small') {
    items.push({ label: '冷启动：从必须自己确认的背景开始', to: '/start#angles', why: '你选了一小步：最底层那几个背景节点没有任何前置，是真正的最小起点。' });
  } else if (pace === 'block') {
    items.push({ label: '完整路线（含里程碑）', to: '/plan', why: '你选了一段一走走：路线页把里程碑与事件界一起给出。' });
  } else if (pace === 'checkpoint') {
    items.push({ label: '先做一次自检', to: '/profile', why: '你选了先看会不会：自检任务按能力维度登记，不自动判定掌握。' });
  } else {
    items.push({ label: '先随便逛逛（不改任何记录）', to: '/nodes', why: '你选了不设节奏：浏览不会把节点标记为已掌握。' });
  }

  return { items, basis, isDefault };
}

interface StartChooserProps {
  preferences: StartPreferences;
  onChange: (next: StartPreferences) => void;
  onReset: () => void;
  /** 已经决定过偏好（用于回访者：直接展示结论，仍可改）。 */
  decided: boolean;
  /** 回访者（本机「来过」标记）：默认起点因此不同（TODO A4-25）。 */
  returning?: boolean;
  /** 引导是否已收起（TODO A4-24）：收起只收起，**不动偏好**。 */
  collapsed?: boolean;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export function StartChooser({
  preferences, onChange, onReset, decided, returning = false, collapsed = false, onCollapse, onExpand,
}: StartChooserProps) {
  /**
   * 展开状态三处共同决定：
   * - 本机记着「已收起」→ 收起；
   * - 三问都答完了 → 直接看结论（回访者不必重答）；
   * - **回访者**（本机来过标记）→ 也直接看结论，起点卡里写着默认起点，想答再点「改一改」（TODO A4-25）；
   * - 其余（首访）→ 展开三问。
   * 「改一改」与「重新显示引导」都只是展开，不会清掉任何答案。
   */
  const [editing, setEditing] = useState(!decided && !collapsed && !returning);
  const goal = preferences.goal;
  const entry = preferences.entry;
  const pace = preferences.pace;
  // 渐进披露：答完前一问才出现下一问；「改一改」时全部展开。
  const showEntry = editing && goal !== null;
  const showPace = showEntry && entry !== null;
  const complete = goal !== null && entry !== null && pace !== null;
  const { items, basis, isDefault } = buildStartPlan(preferences, { returning });

  const answer = (patch: Partial<StartPreferences>) => onChange({ ...preferences, ...patch });

  /** 收起：只是收起（外层记下本机标记），偏好一个都不动。 */
  const collapse = () => { setEditing(false); onCollapse?.(); };

  return (
    <section
      className={`card start-chooser${editing ? '' : ' is-settled'}`}
      id="prefs"
      aria-labelledby="start-chooser-title"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-default-plan={isDefault ? (returning ? 'returning' : 'first-visit') : 'answered'}
    >
      <div className="start-chooser-head">
        <div>
          <h2 id="start-chooser-title">先定方向，再看材料</h2>
          <p className="muted">
            三个问题，决定这一页按什么顺序把入口排给你。答完就能看到属于你的起点；
            随时能改，也随时能跳过——下面所有入口一直都在。
          </p>
        </div>
        <div className="start-chooser-actions">
          {editing ? (
            <>
              {/*
                「先收起引导」（TODO A4-24）：只收起，**不重置偏好**。
                第四十五、四十六轮的边界是：跳过之后只能靠「全部用默认」回来，而那个动作会清掉答案。
                现在两者分开：收起 = 暂时不看；「重新显示引导」随时回来，答案原样还在。
              */}
              <button type="button" className="link-button" onClick={collapse} title="只收起这一块，不会清掉你已经选的答案">
                先收起引导
              </button>
              <button type="button" className="link-button" onClick={() => { onReset(); setEditing(false); }}>全部用默认</button>
            </>
          ) : (
            <>
              <button type="button" className="button" onClick={() => { setEditing(true); onExpand?.(); }}>改一改</button>
              {collapsed && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => { setEditing(true); onExpand?.(); }}
                  title="把三问重新摊开；你已经选过的答案还在"
                >
                  重新显示引导
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {editing && (
        <ol className="start-questions">
          {/* ① 目标 */}
          <li className="start-question" data-question="goal" data-answered={goal ? 'true' : 'false'} data-current={goal === null ? 'true' : undefined}>
            <div className="start-question-head">
              <span className="start-question-index">{goal ? '✓' : '1'}</span>
              <strong>你现在想解决什么？</strong>
              <small>为什么问这个：目标不同，入口的顺序就该不同——补缺口和看全局不该拿到同一张清单。</small>
            </div>
            <div className="start-options">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`start-option${goal === option.id ? ' is-chosen' : ''}`}
                  data-option={option.id}
                  aria-pressed={goal === option.id}
                  onClick={() => { answer({ goal: option.id }); setEditing(true); }}
                >
                  <span className="start-option-label">{option.label}</span>
                  <span className="start-option-hint">{option.hint}</span>
                </button>
              ))}
            </div>
          </li>

          {/* ② 入口（答完①才出现） */}
          {showEntry && (
            <li className="start-question" data-question="entry" data-answered={entry ? 'true' : 'false'} data-current={entry === null ? 'true' : undefined}>
              <div className="start-question-head">
                <span className="start-question-index">{entry ? '✓' : '2'}</span>
                <strong>你更想从哪儿进？</strong>
                <small>为什么问这个：同一个内容，从案例进、从方法进、从练习进，是三种不同的学法。</small>
              </div>
              <div className="start-options">
                {ENTRY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`start-option${entry === option.id ? ' is-chosen' : ''}`}
                    data-option={option.id}
                    aria-pressed={entry === option.id}
                    onClick={() => answer({ entry: option.id })}
                  >
                    <span className="start-option-label">{option.label}</span>
                    <span className="start-option-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
            </li>
          )}

          {/* ③ 节奏（答完②才出现） */}
          {showPace && (
            <li className="start-question" data-question="pace" data-answered={pace ? 'true' : 'false'} data-current={pace === null ? 'true' : undefined}>
              <div className="start-question-head">
                <span className="start-question-index">{pace ? '✓' : '3'}</span>
                <strong>你希望它怎么陪你？</strong>
                <small>为什么问这个：节奏决定给你的入口是「十五分钟能走完的一步」还是「一整段路线」。</small>
              </div>
              <div className="start-options">
                {PACE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`start-option${pace === option.id ? ' is-chosen' : ''}`}
                    data-option={option.id}
                    aria-pressed={pace === option.id}
                    onClick={() => { answer({ pace: option.id }); setEditing(false); }}
                  >
                    <span className="start-option-label">{option.label}</span>
                    <span className="start-option-hint">{option.hint}</span>
                  </button>
                ))}
              </div>
            </li>
          )}
        </ol>
      )}

      {/* 结论：选了就有后果，且写明依据与可撤销。 */}
      {(complete || !editing) && (
        <div className="start-plan" data-complete={complete ? 'true' : 'false'}>
          <h3>
            {complete ? '你的起点' : isDefault ? (returning ? '默认起点（回访）' : '默认起点（首访）') : '默认起点'}
          </h3>
          <ul className="start-plan-basis">
            {basis.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <div className="start-plan-actions">
            {items.map((item) => (
              <Link
                key={`${item.label}-${item.to}`}
                className={`button${item.primary ? ' primary' : ''}`}
                to={item.to}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <ul className="start-plan-why">
            {items.map((item) => (
              <li key={`why-${item.label}`}><strong>{item.label}</strong>：{item.why}</li>
            ))}
          </ul>
          <p className="start-plan-note">
            这些偏好只影响<strong>这一页给你排的顺序</strong>，存在这台设备的浏览器里：
            不写学习者档案（E），也不改本体（M）。想清空就点上面的「全部用默认」，或重新选一次。
            站内任何入口在任何时候都能直接进——引导只负责排序，不设门禁。
          </p>
        </div>
      )}

      {editing && !complete && (
        <p className="start-plan-skip">
          {/*
            「直接给我默认起点」= 收起 + 用默认（不动已有答案，因为本来就没答完）；
            想彻底清掉答案的是上面那个「全部用默认」。两个动作的区别写在按钮的 title 里，
            免得又回到「跳过就等于清空」那个老问题（TODO A4-24）。
          */}
          不想答也可以：
          <button
            type="button"
            className="link-button"
            onClick={collapse}
            title="收起引导、按默认起点走；不会清掉已经选过的答案（要清空请用「全部用默认」）"
          >
            直接给我默认起点
          </button>
        </p>
      )}
    </section>
  );
}
