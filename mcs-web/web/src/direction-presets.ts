/**
 * 学习方向的选择预设（2026-10 加）。
 *
 * 「方向」在学习者这里是一条条**现成的入口**：每条贯通案例的终点就是一个可以直接声明的目标。
 * 这份清单只做一件事——把「案例的终点」抽出来，供「开始学习」页与「我的学习」页共用。
 *
 * 三条纪律：
 * 1. **不新造清单**：这些 id 与 `web/src/start-page` 里案例卡片的 `goal` 是同一批，
 *    一处改了另一处要跟着改。因此这份表与 `pages/StartPage.tsx` 的 `CASES` 保持同源关系，
 *    改的时候两边一起看（`tests/browser.mjs` 的案例卡片断言会先红）。
 * 2. **只是预设，不是方向本身**：方向必须由学习者点一下才写进 E（`useDirection().declare`）。
 *    预设只减少「先得知道有什么可挑」这一步的成本。
 * 3. **中文标题是站内文案**，与案例卡片同源；英文站上由调用方按语种取案例自己的标题
 *    （`TEXT` 成对表），这里只放中文兜底。
 */

export interface DirectionPreset {
  /** 目标节点 id。 */
  id: string;
  /** 中文标题（案例名），仅作兜底显示。 */
  title: string;
  /** 英文标题（案例名）。与中文成对：界面按语种取，不回落中文。 */
  titleEn: string;
}

/**
 * 每条案例的终点（与 `pages/StartPage.tsx` 的 `CASES[].goal` 一一对应）。
 *
 * 顺序与「开始学习」页的案例卡片一致：极限、流形、张量、群、微分几何、点集拓扑。
 *
 * **标题里不许出现 `C^` 这类 LaTeX 记号**：这里的标题是**纯文本**（按钮文案），
 * 过了 Markdown 才是公式。实测 `tests/browser.mjs` 有一条「页面上没有字面 C^」的断言
 * 就是这样抓到这个位置的——要写数学记号就用 `plainMathText()` 换成 Unicode 上标，
 * 或者像这一条一样改成不带记号的案例名（本流形案例的规范标题是「C^k 与光滑流形」，
 * 在卡片上由 Markdown 排版，不在这里重复）。
 *
 * 中英**成对**写在数据里：英文站上这些按钮不回落中文（`scripts/i18n-ui-scan.mjs`
 * 会把未标注的中文报成失败——实测就是这样抓到第一版的）。
 */
export const DIRECTION_PRESETS: DirectionPreset[] = [
  { id: 'limit:bridge', title: '极限与连续', titleEn: 'Limits and continuity' },
  { id: 'manifold:claim-max', title: '光滑流形', titleEn: 'Smooth manifolds' },
  { id: 'tensor:end-iso', title: '张量与张量场', titleEn: 'Tensors and tensor fields' },
  { id: 'group:cayley', title: '群的多来源', titleEn: 'Many sources for a group' },
  { id: 'dg:generalized-stokes-theorem', title: '微分几何', titleEn: 'Differential geometry' },
  { id: 'top:atlas', title: '点集拓扑', titleEn: 'Point-set topology' },
];

/** 按语种取预设清单（界面只用这一个入口，免得每个调用点自己拼）。 */
export function directionPresets(locale: 'zh' | 'en'): Array<{ id: string; title: string }> {
  return DIRECTION_PRESETS.map((preset) => ({ id: preset.id, title: locale === 'en' ? preset.titleEn : preset.title }));
}
