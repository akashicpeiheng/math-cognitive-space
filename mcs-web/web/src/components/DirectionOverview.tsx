import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import {
  buildGoalCards,
  disciplineTotals,
  previewOf,
  summarizeDirection,
  type DirectionGraph,
  type GoalCardView,
} from '../start-direction';
import type { ProfileTheta } from '../types';

/** 成对文案：中文是源语言（**逐字是权威**），英文是译文。取用走 `locale`。 */
interface Pair<T = string> { zh: T; en: T }

/**
 * 方向对比（2026-10-11 加）。
 *
 * ## 它补的是哪一层
 *
 * 用户的要求：「主要从**次级学科**、**已有的目标**入手，结合学习者的兴趣
 * 引导式地为学习者**清晰展示学习方向**」。
 *
 * 这一页原本已经有两块东西：「六条已有方向」的入口按钮
 * （`direction-presets.ts` + `DirectionPanel.tsx`）与「你已声明的方向」
 * （`useDirection().declare` 写 E）。它们回答「选哪条、下一步点哪个」。
 * 本组件回答的是**选之前看不到的那一层**：
 *
 * > 这条方向涉及哪些次级学科、每支要学几个节点、现在从哪个节点进、为什么是它。
 *
 * 因此它的位置在引导卡与「接着上次」之间：**在声明方向之前**就能比较。
 *
 * ## 三条纪律
 *
 * 1. **每个数字都由本体现场派生**（`start-direction.ts` → `direction.ts`），
 *    这里一个计数都不写死。拿不到图或一条方向都算不出时**整块不渲染**，不留空壳。
 * 2. **背景接口与内容分开**：背景节点（没有任何行动能产出、只能由学习者自己声明）
 *    不混进次级学科分布，单独一行列出——每一条方向的待学核心都含 `bg:set:function`
 *    （它的 `discipline` 恰好登记为「集合论」），混进去会让每张卡都写着「集合论」。
 * 3. **兴趣只排序**：选中的次级学科改变卡片顺序与「重合」标注，**不隐藏任何一条方向**。
 *
 * ## 与「声明方向」的分工
 *
 * 本组件**不声明**任何方向（那是 `useDirection().declare` 的事，写学习者档案 E）。
 * 它只把六条方向的代价摊开，并给出两条去向：节点页（先读）与「接着上次」里的方向块
 * （那里是声明与选项表）。没有档案时后者不存在，因此首访者也能看到这一块。
 */
export interface DirectionOverviewProps {
  graph: DirectionGraph | null | undefined;
  /**
   * θ（学习者档案的派生，只读）。
   *
   * 传进来只为一件事：把「已确认的核心节点」从待学里扣掉，
   * 因此「要学 k 个」对换过档案的人也是他自己的数，不是空档案的数。
   * 没有档案时传 `null`，一切按「从未指定」算——这正是首访者的处境。
   */
  theta?: ProfileTheta | null;
  /** 选中的次级学科（本机偏好，只影响排序与标注）。 */
  interests: readonly string[];
  /** 次级学科的显示名：由调用方给（`labels.ts` / `case-catalog.ts` 的成对表）。 */
  disciplineName: (discipline: string) => string;
  /** 方向入口的显示名：由调用方按语种取（`direction-presets.ts` 的成对文案）。 */
  presets: ReadonlyArray<{ id: string; title: string }>;
  /** 每张卡上预览几步「按推荐走下去」的样子。 */
  steps?: number;
}

const TEXT = {
  title: { zh: '六条已有方向：各自要哪些次级学科', en: 'The six registered directions: which secondary fields each one needs' },
  lead: {
    zh: '每一条都已经写成本体里的目标节点，所以代价算得出来：要学几个节点、落在哪几支次级学科、现在从哪个节点进。数字全部由本体现场派生。',
    en: 'Each of these is already a goal node in the ontology, so its cost is computable: how many nodes are still to learn, which secondary fields they fall in, and which node you would enter from right now. Every number is derived from the ontology on the spot.',
  },
  interestNote: {
    zh: (count: number) => `顺序按你选过的 ${count} 支次级学科排（与每条方向待学节点的重合度）——它只改顺序，六条一条都没少。`,
    en: (count: number) => `Ordered by the ${count} secondary field(s) you picked (how much each direction’s remaining nodes overlap with them) — this only changes the order; none of the six is missing.`,
  },
  noInterestNote: {
    zh: '你还没选次级学科：下面按「还有多少节点要学」从多到少排。上面的第 5 问可以按兴趣重排。',
    en: 'You have not picked any secondary field: these are ordered by how much each one still needs, most first. Question 5 above re-orders them by interest.',
  },
  pendingLabel: { zh: '还要学', en: 'still to learn' },
  nowLabel: { zh: '现在就能开始', en: 'can start now' },
  fieldLabel: { zh: '次级学科', en: 'secondary fields' },
  interfaceLabel: { zh: '只能由你声明的背景', en: 'background only you can declare' },
  entryLabel: { zh: '当前入口', en: 'Entry point right now' },
  noEntry: { zh: '现在没有可开始的下一步（核心的前置都还差着）。', en: 'There is no step to start right now (the core’s prerequisites are all still missing).' },
  nextSteps: { zh: '按推荐走下去的几步', en: 'The next few steps if you follow the recommendation' },
  previewMore: { zh: (count: number) => `还有更多（预览只给前 ${count} 步，不是路线的全长）。`, en: (count: number) => `More beyond this (the preview shows only the first ${count} steps, not the length of the route).` },
  unresolvedNote: {
    zh: (count: number) => `另有 ${count} 个核心节点在当前登记下互相要求、拆不开，因此分不出先后——不伪造一个次序。`,
    en: (count: number) => `${count} more core node(s) require each other under the current registration and cannot be separated, so no order is claimed for them.`,
  },
  truncatedNote: { zh: '这条方向的核心太大，没有全算（只算了登记上限内的那一部分）。', en: 'This direction’s core is too large to compute in full (only the part within the registered cap was computed).' },
  openNode: { zh: '读这个节点', en: 'Read this node' },
  plan: { zh: '看完整路线', en: 'Open the full route' },
  declareHint: { zh: '要把它变成你的方向（写进学习者档案，可在方向块里撤回），在下面的「学习方向」里声明。', en: 'To make one of these your direction (written to the learner profile and withdrawable in the direction block), declare it in “Learning direction” below.' },
  noProfileHint: { zh: '没有档案也能看这些数字；要声明方向需要一个档案。', en: 'These numbers need no profile; declaring a direction does.' },
  nowShort: { zh: '现在能开始', en: 'now' },
  matchLabel: { zh: '与你的兴趣重合', en: 'overlaps your interest' },
  allConfirmed: {
    zh: '这条方向的核心节点都已在你的档案里确认过，没有要学的内容节点。',
    en: 'Every core node of this direction is already confirmed in your profile; there is no content node left to learn.',
  },
  /** 这一支在全库里的单元数（与第 5 问 chip 上的数字同源，可互相对照）。 */
  unitsInOntology: { zh: (label: string, count: number) => `${label} ${count}`, en: (label: string, count: number) => `${label} ${count}` },
} satisfies Record<string, Pair<string | ((...args: never[]) => string)>>;

export function DirectionOverview({
  graph, theta = null, interests, disciplineName, presets, steps,
}: DirectionOverviewProps) {
  const { locale, hrefFor } = useI18n();
  const pick = <T,>(pair: Pair<T>): T => pair[locale];

  /*
   * θ 的最小形状：`deriveDirection` 只认 `known[].node`。
   * 这里显式转一次，而不是把整个 θ 塞进去——「方向派生只用到已确认名单」这件事
   * 要能从调用点读出来（`theta` 里还有 unknown / viewed / coverage，那些不参与）。
   */
  const known = useMemo(
    () => (theta ? { known: theta.known.map((entry) => ({ node: entry.node })) } : null),
    [theta],
  );

  /** 六条方向的卡片（已按兴趣排好），列表用 `steps: 0`：预览是唯一昂贵的部分。 */
  const cards = useMemo(
    () => buildGoalCards(graph, presets, { theta: known, interests, locale }),
    [graph, presets, known, interests, locale],
  );

  /** 只为排第一的那条方向补一次预览（逐步重算，实测约 4 ms）。 */
  const headPreview = useMemo(
    () => (cards.length > 0 ? previewOf(cards[0].node, graph, { theta: known, interests, locale, title: cards[0].title, steps }) : null),
    [cards, graph, known, interests, locale, steps],
  );

  /** 次级学科在全库里的单元数：由调用方给显示名，计数在这里现场算。 */
  const totals = useMemo(() => new Map(disciplineTotals(graph, 'unit').map((item) => [item.id, item.count])), [graph]);

  if (cards.length === 0) return null;

  const renderSlices = (card: GoalCardView) => (
    <ul className="direction-overview-slices">
      {card.skeleton.disciplines.map((slice) => (
        <li key={slice.id} data-field={slice.id}>
          {/*
            选过的次级学科标出来：这是「兴趣确实参与了排序」在界面上的落点，
            与 `data-match` 一起让「只改顺序」这句话可核对。
          */}
          <span className={`direction-overview-field${interests.includes(slice.id) ? ' is-interest' : ''}`}>
            {disciplineName(slice.id)}
          </span>
          {/*
            横条按「这一支里现在就能开始的占比」画：整条是待学数，实心段是现在能开始的。
            这样一眼能看出「这支现在有多少动得了」，而不是只给一个总数。
          */}
          <span className="direction-overview-bar" aria-hidden="true">
            <i style={{ width: `${Math.round((slice.reached / Math.max(slice.count, 1)) * 100)}%` }} />
          </span>
          <span className="direction-overview-count">{slice.count}</span>
          {slice.reached > 0 && (
            <span className="direction-overview-reached">{pick(TEXT.nowShort)} {slice.reached}</span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <section className="card direction-overview" id="directions" aria-labelledby="direction-overview-title">
      <div className="direction-overview-head">
        <div>
          <h2 id="direction-overview-title">{pick(TEXT.title)}</h2>
          <p className="muted">{pick(TEXT.lead)}</p>
        </div>
      </div>

      {/*
        兴趣那一问的后果写在这里：**选了几支就说几支**，没选就说按什么排。
        不写这句，「引导式地展示方向」就变成「悄悄换了个顺序」。
      */}
      <p className="direction-overview-order">
        {interests.length > 0 ? pick(TEXT.interestNote)(interests.length) : pick(TEXT.noInterestNote)}
      </p>

      <ul className="direction-overview-cards">
        {cards.map((card, index) => {
          const summary = summarizeDirection(card);
          /* 预览只给排第一那条：其余各条要 5 步逐步重算，列表里不值这个代价。 */
          const preview = index === 0 && headPreview ? headPreview.preview : card.preview;
          const previewTruncated = index === 0 && headPreview ? headPreview.previewTruncated : card.previewTruncated;
          return (
            <li className="direction-overview-card" key={card.node} data-goal={card.node} data-match={card.match}>
              <div className="direction-overview-card-head">
                <h3>
                  <Link className="direction-overview-title" to={hrefFor(`/nodes/${encodeURIComponent(card.node)}`)}>{card.title}</Link>
                </h3>
                {/* 目标自身的次级学科：它是「你要抵达的地方」属于哪一支。 */}
                <span className="direction-overview-own">{disciplineName(card.discipline)}</span>
                {card.match > 0 && <span className="direction-overview-match">{pick(TEXT.matchLabel)}</span>}
              </div>

              <p className="direction-overview-facts">
                <span className="direction-overview-fact">
                  {pick(TEXT.pendingLabel)}
                  <strong>{summary.pending}</strong>
                </span>
                <span className="direction-overview-fact" data-fact="now">
                  {pick(TEXT.nowLabel)}
                  <strong>{summary.nowStartable}</strong>
                </span>
                <span className="direction-overview-fact">
                  {pick(TEXT.fieldLabel)}
                  <strong>{summary.disciplines}</strong>
                </span>
              </p>

              {card.skeleton.disciplines.length > 0 ? renderSlices(card) : (
                <p className="muted">{pick(TEXT.allConfirmed)}</p>
              )}

              {/*
                背景接口单列一行（见文件头的纪律 2）：它们的次级学科登记是「集合论」，
                混进上面的分布会让每张卡都写着「集合论」，读起来像结论而其实是背景接口。
              */}
              {card.skeleton.interfaces.length > 0 && (
                <p className="direction-overview-interfaces">
                  <span className="direction-overview-interface-tag">{pick(TEXT.interfaceLabel)}</span>
                  {card.skeleton.interfaces.map((id) => (
                    <Link key={id} to={hrefFor(`/nodes/${encodeURIComponent(id)}`)}>{id}</Link>
                  ))}
                </p>
              )}

              {/* 当前入口：这是「现在从哪儿进」的直接回答。 */}
              {card.next ? (
                <p className="direction-overview-entry">
                  <span className="direction-overview-entry-tag">{pick(TEXT.entryLabel)}</span>
                  <Link to={hrefFor(`/nodes/${encodeURIComponent(card.next.node)}`)}>{card.next.title}</Link>
                  <span className="muted">{card.next.basis}</span>
                </p>
              ) : (
                <p className="muted">{pick(TEXT.noEntry)}</p>
              )}

              {preview.length > 0 && (
                <details className="direction-overview-steps">
                  <summary>{pick(TEXT.nextSteps)}</summary>
                  <ol>
                    {preview.map((step) => (
                      <li key={step.node}>
                        <Link to={hrefFor(`/nodes/${encodeURIComponent(step.node)}`)}>{step.title}</Link>
                      </li>
                    ))}
                  </ol>
                  {previewTruncated && <p className="muted">{pick(TEXT.previewMore)(preview.length)}</p>}
                </details>
              )}

              {/* 成环与截断：如实写出来，不伪造一条通顺的次序。 */}
              {summary.unresolved > 0 && <p className="muted">{pick(TEXT.unresolvedNote)(summary.unresolved)}</p>}
              {card.skeleton.limited && <p className="muted">{pick(TEXT.truncatedNote)}</p>}

              <div className="card-actions">
                <Link className="button small primary" to={hrefFor(`/nodes/${encodeURIComponent(card.next?.node ?? card.node)}`)}>
                  {pick(TEXT.openNode)}
                </Link>
                <Link className="button small" to={hrefFor(`/plan?goal=${encodeURIComponent(card.node)}`)}>{pick(TEXT.plan)}</Link>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="direction-overview-declare muted">{pick(TEXT.declareHint)}</p>
      {/* 计数按学科给：与第 5 问 chip 上的数字同源，可对照。 */}
      <p className="direction-overview-totals muted">
        {pick(TEXT.fieldLabel)}：
        {[...totals.entries()].map(([id, count]) => pick(TEXT.unitsInOntology)(disciplineName(id), count)).join(locale === 'en' ? ', ' : '、')}
      </p>
    </section>
  );
}
