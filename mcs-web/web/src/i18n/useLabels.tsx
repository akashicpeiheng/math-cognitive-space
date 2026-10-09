/**
 * 标签工具集的 React 入口。
 *
 * ## 为什么这个钩子要跟 `labels.ts` 分开
 *
 * `labels.ts` 被**纯 Node 测试**直接 import（`tests/relation-visual.test.mjs`、
 * `tests/thread-layer.test.mjs`、`tests/a11y-contrast.test.mjs`、`tests/design-values.test.mjs`）。
 * 一旦它 import 任何 React 相关的东西（哪怕只是 `import { useI18n } from './i18n'`），
 * Node 的 ESM 加载器就会走进那条依赖链：`./i18n` 是**目录导入**，
 * Node 不像打包器那样自动找 `index`，于是这些测试整体报
 * `ERR_UNSUPPORTED_DIR_IMPORT` —— 而且是「一 import 就炸」，与被测内容无关。
 *
 * 实测就是这么发生的：把 `useLabels()` 写进 `labels.ts` 之后，四套纯 Node 测试全红。
 * 现在分工是硬的：
 *
 * - `labels.ts` = 纯数据表 + 纯函数（**不准 import React**，也不准 import 组件目录）；
 * - 本文件 = 钩子（可以 import React 与 `./i18n`）。
 *
 * 组件请从这里取：`import { useLabels } from '../i18n/useLabels';`
 */

import { useI18n } from './index';
import { makeLabels, type Labels } from '../labels';

/** 组件里取标签工具集；随语种变化自动重渲染。 */
export function useLabels(): Labels {
  const { locale } = useI18n();
  return makeLabels(locale);
}

export type { Labels };
