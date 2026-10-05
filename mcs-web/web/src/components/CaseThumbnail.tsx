import { useId } from 'react';

const LABELS: Record<string, string> = {
  limit: '极限：函数图像从两侧趋向被挖去的点',
  manifold: '流形：弯曲曲面由多个局部坐标片拼接',
  tensor: '张量：同一对象在两组基之间协同变换',
  group: '群：不同对称操作组成同一个封闭结构',
  dg: '微分几何：曲面、切向量与边界积分相互连接',
};

interface CaseThumbnailProps {
  caseId: string;
}

/**
 * 原型问题的概念缩略图。
 *
 * 这些图不是装饰照片，而是每条思路的「视觉胚子」：先让人看见趋近、
 * 坐标片、换基、对称与切空间，再进入卡片里的形式化说明。图形全部是
 * 内联 SVG，随主题与屏幕缩放保持清晰，也不引入外部资源或未经验证的内容。
 */
export function CaseThumbnail({ caseId }: CaseThumbnailProps) {
  const uid = useId().replace(/:/g, '');
  const gradientId = `case-gradient-${uid}`;
  const glowId = `case-glow-${uid}`;
  const arrowId = `case-arrow-${uid}`;
  const clipId = `case-clip-${uid}`;
  const label = LABELS[caseId] ?? '数学对象之间的结构关系图';

  return (
    <figure className="case-thumbnail" data-case={caseId}>
      <svg className="case-thumbnail-svg" viewBox="0 0 640 240" role="img" aria-label={label} preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop className="thumb-gradient-start" offset="0%" />
            <stop className="thumb-gradient-mid" offset="52%" />
            <stop className="thumb-gradient-end" offset="100%" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="48%" r="62%">
            <stop className="thumb-glow-start" offset="0%" />
            <stop className="thumb-glow-end" offset="100%" />
          </radialGradient>
          <marker id={arrowId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
            <path className="thumb-arrow-head" d="M0 0 8 4 0 8Z" />
          </marker>
          <clipPath id={clipId}>
            <path d="M136 158C152 79 225 39 326 48c106 9 169 64 180 131-77 24-149 31-229 18-60-10-105-23-141-39Z" />
          </clipPath>
        </defs>

        <rect className="thumb-base" width="640" height="240" rx="18" fill={`url(#${gradientId})`} />
        <ellipse className="thumb-glow" cx="324" cy="118" rx="260" ry="132" fill={`url(#${glowId})`} />
        <path className="thumb-horizon" d="M24 199C167 164 253 226 388 188c88-25 145-14 228 9" />

        {caseId === 'limit' && (
          <g className="thumb-scene thumb-limit">
            <rect className="thumb-zone-secondary" x="77" y="72" width="486" height="61" rx="8" />
            <rect className="thumb-zone-primary" x="287" y="31" width="66" height="169" rx="8" />
            <path className="thumb-axis" d="M68 184H574M96 207V35" />
            <path className="thumb-guide" d="M320 31V204M76 102H565M76 132H565" />
            <path className="thumb-primary-stroke" d="M84 181C144 177 187 158 231 133c32-18 58-28 86-30" />
            <path className="thumb-primary-stroke" d="M323 103c43 1 73 13 102 34 39 29 76 42 137 44" />
            <circle className="thumb-open-point" cx="320" cy="103" r="10" />
            <circle className="thumb-solid-point" cx="320" cy="54" r="5" />
            <path className="thumb-secondary-stroke" d="M320 54v28" markerEnd={`url(#${arrowId})`} />
            <text className="thumb-math-label thumb-label-primary" x="336" y="94">L</text>
            <text className="thumb-math-label" x="331" y="221">x → a</text>
            <text className="thumb-math-label" x="507" y="91">ε</text>
            <text className="thumb-math-label" x="296" y="47">δ</text>
          </g>
        )}

        {caseId === 'manifold' && (
          <g className="thumb-scene thumb-manifold">
            <path className="thumb-surface" d="M136 158C152 79 225 39 326 48c106 9 169 64 180 131-77 24-149 31-229 18-60-10-105-23-141-39Z" />
            <g className="thumb-mesh" clipPath={`url(#${clipId})`}>
              <path d="M155 72C215 106 227 160 212 209M224 45c46 47 53 111 32 174M302 37c25 55 26 118 3 180M381 43c1 58-12 116-42 171M455 68c-17 52-42 98-79 137" />
              <path d="M117 91c104 32 273 31 413 5M111 126c120 37 302 38 429 8M113 163c126 36 284 43 415 18" />
            </g>
            <rect className="thumb-chart thumb-chart-a" x="63" y="42" width="126" height="78" rx="12" transform="rotate(-5 126 81)" />
            <path className="thumb-chart-grid" d="M84 55v50m29-53v51m29-54v51m29-53v50M71 70l111-9M70 91l111-9" />
            <rect className="thumb-chart thumb-chart-b" x="455" y="119" width="127" height="77" rx="12" transform="rotate(5 519 158)" />
            <path className="thumb-chart-grid" d="M477 128v53m30-51v53m29-50v52m30-49v51M464 146l111 10M462 168l111 10" />
            <path className="thumb-secondary-stroke" d="M180 117c25 16 39 25 60 35M447 161c-27-1-44-1-71 4" markerEnd={`url(#${arrowId})`} />
            <circle className="thumb-solid-point" cx="306" cy="145" r="6" />
            <text className="thumb-math-label thumb-label-primary" x="270" y="110">φ</text>
            <text className="thumb-math-label" x="386" y="137">ψ</text>
          </g>
        )}

        {caseId === 'tensor' && (
          <g className="thumb-scene thumb-tensor">
            <path className="thumb-orbit" d="M177 119c0-65 57-93 124-93 81 0 144 30 164 88" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-orbit thumb-orbit-reverse" d="M465 132c-4 61-64 87-140 87-73 0-132-27-148-78" markerEnd={`url(#${arrowId})`} />
            <g className="thumb-tensor-grid">
              <rect className="thumb-grid-panel" x="224" y="54" width="192" height="132" rx="18" />
              <path className="thumb-grid-line" d="M272 55v131m48-131v131m48-131v131M224 87h192M224 120h192M224 153h192" />
              <circle cx="248" cy="71" r="6" />
              <circle cx="296" cy="104" r="6" />
              <circle cx="344" cy="137" r="6" />
              <circle cx="392" cy="170" r="6" />
              <path className="thumb-primary-stroke" d="M248 71l48 33 48 33 48 33" />
              <path className="thumb-secondary-stroke" d="M248 170l48-33 48-33 48-33" />
            </g>
            <path className="thumb-vector thumb-vector-a" d="M86 177l83-68" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-vector thumb-vector-b" d="M554 179l-82-70" markerEnd={`url(#${arrowId})`} />
            <text className="thumb-math-label" x="74" y="198">basis A</text>
            <text className="thumb-math-label" x="491" y="198">basis B</text>
            <text className="thumb-math-label thumb-tensor-symbol" x="305" y="126">T</text>
            <text className="thumb-index thumb-label-primary" x="336" y="101">i</text>
            <text className="thumb-index" x="339" y="142">j</text>
          </g>
        )}

        {caseId === 'group' && (
          <g className="thumb-scene thumb-group">
            <circle className="thumb-orbit-ring" cx="320" cy="120" r="89" />
            <path className="thumb-orbit" d="M247 69a89 89 0 0 1 139-8" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-orbit thumb-orbit-reverse" d="M395 168a89 89 0 0 1-139 11" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-group-polygon" d="M320 31 397 75 397 164 320 209 243 164 243 75Z" />
            <path className="thumb-secondary-stroke" d="M243 75l154 89M397 75l-154 89M320 31v178" />
            {[[320, 31], [397, 75], [397, 164], [320, 209], [243, 164], [243, 75]].map(([cx, cy], index) => (
              <g key={`${cx}-${cy}`}>
                <circle className="thumb-group-node" cx={cx} cy={cy} r="15" />
                <text className="thumb-group-label" x={cx} y={cy + 5}>{index === 0 ? 'e' : `g${index}`}</text>
              </g>
            ))}
            <rect className="thumb-group-object" x="78" y="77" width="82" height="82" rx="12" transform="rotate(-12 119 118)" />
            <path className="thumb-primary-stroke" d="M81 105l75 29M106 80l28 75" />
            <path className="thumb-guide" d="M162 118h58M420 118h58" />
            <path className="thumb-group-object" d="M505 72 554 115 526 174 469 160 464 100Z" />
          </g>
        )}

        {caseId === 'dg' && (
          <g className="thumb-scene thumb-dg">
            <path className="thumb-surface" d="M89 167c65-83 137-102 226-51 81 47 150 32 238-29-31 96-102 139-208 111-104-28-163-19-256-31Z" />
            <path className="thumb-mesh" d="M116 153c86-47 154-51 222-16 67 35 125 32 186-3M148 181c79-34 142-31 204-3 55 25 102 20 139 4M181 117c23 19 30 46 22 78M260 103c18 27 22 61 9 99M352 115c9 28 7 58-5 85M438 103c2 26-2 49-15 73" />
            <path className="thumb-boundary" d="M89 167c65-83 137-102 226-51 81 47 150 32 238-29" />
            <circle className="thumb-solid-point" cx="315" cy="132" r="6" />
            <path className="thumb-tangent-plane" d="M233 88 389 63 434 128 273 153Z" />
            <path className="thumb-vector thumb-vector-a" d="M315 132l91-70" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-vector thumb-vector-b" d="M315 132l69 27" markerEnd={`url(#${arrowId})`} />
            <path className="thumb-secondary-stroke" d="M118 69c33-31 72-41 115-32" markerEnd={`url(#${arrowId})`} />
            <text className="thumb-math-label thumb-label-primary" x="74" y="65">∂M</text>
            <text className="thumb-math-label" x="409" y="54">TₚM</text>
            <text className="thumb-math-label thumb-dg-integral" x="494" y="196">∫</text>
          </g>
        )}
      </svg>
      <figcaption>{label}</figcaption>
    </figure>
  );
}
