/**
 * 指针手势的阈值（2026-10 从 `NetworkPage.tsx` 提出来，TODO B 的登记表要用它核对）。
 *
 * 为什么单独成模块：这些数是**设计取值**（手感定的，不是实验结论），
 * 「设计取值」那一节要能核对到代码里的实际数字。留在 `.tsx` 组件里的话，
 * node 侧没法 import（JSX 跑不了），只能靠正则去猜——那正是漂移的来源。
 *
 * 第四十一轮的边界：阈值原先只有一档（250ms / 4px），是按鼠标定的；
 * 触屏沿用同一档的结果是**轻点被判成长按、长按又被判成拖动**，
 * 取关联节点这条主路径在触屏上基本不可用。A2-11 因此按指针类型分了两档：
 *
 * | 指针 | 长按阈值 | 位移容差 | 依据 |
 * |---|---|---|---|
 * | 鼠标 / 笔 | 250ms | 4px | 沿用旧手感 |
 * | 触摸 | **500ms** | **12px** | 对齐系统长按语义（Android/iOS 都在 ~500ms）；手指按压必然抖动 |
 */

/** 鼠标 / 笔的长按阈值：按住超过它才算「长按」，否则按轻点处理（轻点 = 打开详情）。 */
export const PICK_HOLD_MS = 250;
/** 触摸的长按阈值：与系统长按语义对齐，避免轻点被误判成长按。 */
export const PICK_HOLD_MS_TOUCH = 500;
/** 鼠标 / 笔的位移容差：超过它就不再是「按住」，而是拖动。 */
export const PICK_MOVE_TOLERANCE = 4;
/** 触摸的位移容差：手指按压的几像素抖动必须容忍，否则「按住不动」几乎不可能成立。 */
export const PICK_MOVE_TOLERANCE_TOUCH = 12;

/** 这一档阈值按指针类型取：`touch` 走触摸档，其余（鼠标 / 笔）走鼠标档。 */
export function holdThresholdFor(pointerType: string): number {
  return pointerType === 'touch' ? PICK_HOLD_MS_TOUCH : PICK_HOLD_MS;
}

export function moveToleranceFor(pointerType: string): number {
  return pointerType === 'touch' ? PICK_MOVE_TOLERANCE_TOUCH : PICK_MOVE_TOLERANCE;
}
