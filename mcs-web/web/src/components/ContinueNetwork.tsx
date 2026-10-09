import { Link } from 'react-router-dom';
import { useI18n, useLabels } from '../i18n';
import { THEME } from '../theme';
import { RELATION_COLOR, plainMathText } from '../labels';
import { edgeVisual } from '../relation-visual';
import { edgeFamilyLabel, type NetworkGraph } from '../network';
import {
  BASIS_RANK, CONTINUE_CENTER, CONTINUE_NODE_H, CONTINUE_NODE_W,
  basisLabel, buildContinueNetwork, directionLabel, type ContinueLink,
} from '../continue-network';

/**
 * 首页「继续学习」的局部网络视图。
 *
 * 以**上次学习的节点**为中心，按话题方向（上 / 右 / 下 / 左）铺开强关联节点；
 * 位置由 `buildContinueNetwork` 纯函数算出，本组件只负责画。
 *
 * 只画有已登记依据的关联，且如实标注「还有 N 个」——不把没画出来的节点说成不存在。
 *
 * 双语（2026-10）：
 * - 方位名与依据名走 `continue-network.ts` 的 `directionLabel()` / `basisLabel()`，
 *   族名走 `network.ts` 的 `edgeFamilyLabel()`（都由各自的属主提供英文，键与中文值不变）；
 * - 关系种类走 `useLabels().relationLabel()`；
 * - 本组件自己的说明文案成对写在下表。SVG 文本不能排版 KaTeX，一律走 `plainMathText`。
 */

const COPY = {
  zh: {
    empty: '这个节点在本体里还没有登记任何关联（关系、契约或同话题）。可以先打开它的节点页，看正文与证据；关联会在你加入更多节点后出现。',
    aria: (title: string, nodes: number, groups: number) => `以 ${title} 为中心的关联视图，共 ${nodes} 个强关联节点，分 ${groups} 个话题方向`,
    centerTitle: (title: string, node: string) => `上次学习：${title}（${node}）`,
    nodeTitle: (title: string, node: string, basis: string, kind: string) => `${title}（${node}）· ${basis}${kind ? `：${kind}` : ''}`,
    relation: (kind: string, witness: string) => `关系：${kind}（见证 ${witness}）`,
    family: (prefix: string, label: string) => `${prefix}：${label}`,
    familyPrefix: { contract: '契约', sharedInput: '共用前提', topic: '同一话题' },
    omittedLead: '为了让方位读得清楚，每个方向最多画 3 个节点。',
    omittedItem: (topic: string, count: number) => `${topic} 还有 ${count} 个`,
    omittedJoin: '；',
    omittedTail: '——完整邻域见组建网络页。',
  },
  en: {
    empty: 'This node has no registered associations yet (relations, contracts or shared topics). Open its node page to read the text and the evidence; associations appear as you add more nodes.',
    aria: (title: string, nodes: number, groups: number) => `Association view centred on ${title}: ${nodes} strongly related nodes across ${groups} topic directions`,
    centerTitle: (title: string, node: string) => `Last studied: ${title} (${node})`,
    nodeTitle: (title: string, node: string, basis: string, kind: string) => `${title} (${node}) · ${basis}${kind ? `: ${kind}` : ''}`,
    relation: (kind: string, witness: string) => `Relation: ${kind} (witness ${witness})`,
    family: (prefix: string, label: string) => `${prefix}: ${label}`,
    familyPrefix: { contract: 'Contract', sharedInput: 'Shared prerequisite', topic: 'Same topic' },
    omittedLead: 'To keep the directions readable, at most three nodes are drawn per direction. ',
    omittedItem: (topic: string, count: number) => `${topic} has ${count} more`,
    omittedJoin: '; ',
    omittedTail: ' — see the network page for the full neighbourhood.',
  },
} as const;

export function ContinueNetwork({
  centerId,
  graph,
  confirmed,
  onPick,
}: {
  centerId: string;
  graph: NetworkGraph;
  confirmed: Set<string>;
  /** 点击邻居时的回调（用于把「继续学习」的目标切过去）。 */
  onPick?: (nodeId: string) => void;
}) {
  const { locale, hrefFor } = useI18n();
  const labels = useLabels();
  const text = COPY[locale];
  const network = buildContinueNetwork(centerId, graph, { confirmed, locale });
  if (!network) return null;
  if (network.nodes.length === 0) {
    return (
      <p className="muted">{text.empty}</p>
    );
  }

  const { width, height, cx, cy } = network;

  return (
    <div className="continue-network">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={text.aria(plainMathText(network.center.title), network.nodes.length, network.groups.length)}
        style={{ display: 'block', maxHeight: 460 }}
      >
        <defs>
          <marker id="cn-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={THEME.neutral} />
          </marker>
        </defs>

        {/* 四个方向的话题标签：位置本身就说明「哪个方向是哪个话题」。
            贴在实际节点的外侧（按该方向节点的包围盒推），而不是按画布边缘固定偏移——
            否则右侧的标签会被卡片压住。 */}
        {network.groups.map((group) => {
          const members = network.nodes.filter((item) => item.direction === group.direction);
          const midX = members.length
            ? members.reduce((sum, item) => sum + item.x + CONTINUE_NODE_W / 2, 0) / members.length
            : cx + (group.direction === 'left' ? -120 : group.direction === 'right' ? 120 : 0);
          const midY = members.length
            ? members.reduce((sum, item) => sum + item.y + CONTINUE_NODE_H / 2, 0) / members.length
            : cy + (group.direction === 'up' ? -90 : group.direction === 'down' ? 90 : 0);
          // SVG 文本不能排版 KaTeX，用 Unicode 上标代替「C^k」这类记号。
          const label = plainMathText(`${directionLabel(group.direction, locale)} · ${group.topicTitle}`);
          if (group.direction === 'up') {
            const top = members.length ? Math.min(...members.map((item) => item.y)) : midY;
            return <text key={`label-${group.direction}-${group.topicId}`} className="continue-direction-label" x={midX} y={Math.max(12, top - 8)} textAnchor="middle">{label}</text>;
          }
          if (group.direction === 'down') {
            const bottom = members.length ? Math.max(...members.map((item) => item.y + CONTINUE_NODE_H)) : midY;
            return <text key={`label-${group.direction}-${group.topicId}`} className="continue-direction-label" x={midX} y={Math.min(height - 6, bottom + 16)} textAnchor="middle">{label}</text>;
          }
          const attach = group.direction === 'right'
            ? (members.length ? Math.max(...members.map((item) => item.x + CONTINUE_NODE_W)) : midX) + 10
            : (members.length ? Math.min(...members.map((item) => item.x)) : midX) - 10;
          return (
            <text
              key={`label-${group.direction}-${group.topicId}`}
              className="continue-direction-label"
              x={attach}
              y={midY}
              textAnchor={group.direction === 'right' ? 'start' : 'end'}
              dominantBaseline="middle"
            >
              {label}
            </text>
          );
        })}

        {/* 关联线：先画线，节点压在上面。 */}
        {network.nodes.map((item) => {
          const visual = item.family === 'relation'
            ? edgeVisual('relation', item.kind, item.witnessStatus, RELATION_COLOR[item.kind ?? ''] ?? THEME.neutral)
            : edgeVisual(item.family, null, null, item.family === 'contract' ? THEME.contractEdge : THEME.line);
          const nx = item.x + CONTINUE_NODE_W / 2;
          const ny = item.y + CONTINUE_NODE_H / 2;
          return (
            <line
              key={`edge-${item.node}`}
              x1={cx}
              y1={cy}
              x2={nx}
              y2={ny}
              stroke={visual.color}
              strokeWidth={visual.width}
              strokeDasharray={visual.dash}
              strokeLinecap="round"
              opacity={visual.opacity}
              markerEnd={item.family === 'topic' ? undefined : 'url(#cn-arrow)'}
            />
          );
        })}

        {/* 中心节点 */}
        <g className="continue-center-node">
          <rect
            x={cx - CONTINUE_CENTER.w / 2}
            y={cy - CONTINUE_CENTER.h / 2}
            width={CONTINUE_CENTER.w}
            height={CONTINUE_CENTER.h}
            rx="12"
            fill={THEME.nodeFill}
            stroke={THEME.inkSoft}
            strokeWidth="1.6"
          />
          <text className="continue-node-label" x={cx} y={cy - 2} textAnchor="middle" fontSize="13.5">
            {plainMathText(network.center.title.length > 14 ? `${network.center.title.slice(0, 14)}…` : network.center.title)}
          </text>
          <text className="continue-node-id" x={cx} y={cy + 14} textAnchor="middle" fontSize="10">{network.center.node}</text>
          <title>{text.centerTitle(network.center.title, network.center.node)}</title>
        </g>

        {/* 邻居节点 */}
        {network.nodes.map((item) => (
          <g key={item.node} className="continue-neighbor" data-basis={item.basis} data-direction={item.direction}>
            <rect
              x={item.x}
              y={item.y}
              width={CONTINUE_NODE_W}
              height={CONTINUE_NODE_H}
              rx="10"
              fill={THEME.nodeFill}
              stroke={THEME.line}
            />
            <text className="continue-node-label" x={item.x + 10} y={item.y + 19} fontSize="12">
              {plainMathText(item.title.length > 13 ? `${item.title.slice(0, 13)}…` : item.title)}
            </text>
            <text className="continue-node-id" x={item.x + 10} y={item.y + 34} fontSize="9.5">
              {item.node}
            </text>
            <title>{text.nodeTitle(item.title, item.node, basisLabel(item.basis, locale), item.kind ? labels.relationLabel(item.kind) : '')}</title>
          </g>
        ))}
      </svg>

      {/* 可点击的跳转列表：SVG 里的点击不如文字链可靠，且需要给键盘用户可达的入口。 */}
      <ul className="continue-network-list">
        {network.nodes.map((item) => (
          <li key={item.node} data-basis={item.basis}>
            <span
              className="continue-basis-dot"
              style={{
                background: item.family === 'relation'
                  ? RELATION_COLOR[item.kind ?? ''] ?? THEME.neutral
                  : item.family === 'contract' ? THEME.contractEdge : THEME.line,
              }}
              title={basisLabel(item.basis, locale)}
            />
            <Link to={hrefFor(`/nodes/${encodeURIComponent(item.node)}`)} onClick={() => onPick?.(item.node)}>{plainMathText(item.title)}</Link>
            <span className="muted">
              {plainMathText(`${directionLabel(item.direction, locale)} · ${item.topicTitle}`)}
              {' · '}
              {item.basis === 'relation'
                ? text.relation(labels.relationLabel(item.kind ?? ''), item.witnessStatus ?? '')
                : item.basis === 'contract' ? text.family(text.familyPrefix.contract, edgeFamilyLabel('contract', locale))
                  : item.basis === 'sharedInput' ? text.family(text.familyPrefix.sharedInput, edgeFamilyLabel('sharedInput', locale))
                    : text.family(text.familyPrefix.topic, edgeFamilyLabel('topic', locale))}
            </span>
          </li>
        ))}
      </ul>
      {network.groups.some((group) => group.omitted > 0) && (
        <p className="muted continue-omitted">
          {text.omittedLead}
          {network.groups.filter((group) => group.omitted > 0)
            .map((group) => text.omittedItem(group.topicTitle, group.omitted))
            .join(text.omittedJoin)}{text.omittedTail}
        </p>
      )}
    </div>
  );
}

/** 依据类型在图例里的出现顺序，供外部（如首页说明）复用。 */
export const CONTINUE_BASIS_ORDER: ContinueLink['basis'][] = (Object.keys(BASIS_RANK) as ContinueLink['basis'][])
  .sort((a, b) => BASIS_RANK[a] - BASIS_RANK[b]);
