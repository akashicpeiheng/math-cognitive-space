/**
 * `definitionReference`：某条陈述用到了**另一个节点引入的符号**。
 *
 * ## 这一类关系的可信性靠什么
 *
 * 它不出证书，判据是「版本 + 类型 + **符号确实由对端引入**」三样当场可核。
 * 因此这里的每一个判断都必须能指向**一份登记数据**，而不是文本里出现过的名字。
 *
 * ## 为什么不能用「名字在正文里出现过」
 *
 * 2026-10-04 验收抓到的缺陷：早先的实现把各 spec 的 `declarations` 也塞进一个全局符号表，
 * 然后拿正文里的标识符去比对名字。后果是两个方向的假引用：
 *
 * - 两个**互不相关**的节点各声明 `x : G` 与 `x : R`，会被判成其中一个引用了另一个（且 `proved`）；
 * - 本站数据里「群」与「阿贝尔群」共享参数名 `mul0`，于是「群的定义引用阿贝尔群」被认证——
 *   而 `mul0` 只是两条陈述**各自的局部参数**，不是任何一个节点引入的符号。
 *
 * **局部参数不是公共符号。** `declarations` 里的名字属于那条陈述自己的语境，
 * 换一个节点就可以被完全无关地复用，所以它**永远不能**生成跨节点依赖。
 * 现在本模块**完全不读 `declarations` 作为符号来源**——它只用来回答"这个名字是不是
 * 本条陈述自己的局部变量"（是的话就跳过，连提供方都不必查）。
 *
 * ## 符号来源（两个索引，都来自登记数据）
 *
 * 1. `BACKGROUND_REFERENCES`（`data/formal/registry.mjs`）：背景里那些**原子谓词/常元**
 *    由哪个节点引入，条目形如 `{ node, background, symbol, type }`。
 *    同一个符号可能被多个节点登记（例如 `const_seq` 被 `limit:constant-seq` 与
 *    `limit:bridge` 都用到）——那种情况下**不猜**，如实报 `ambiguous`。
 * 2. `spec.definitions`：节点自己引入的定义（例如 `tensor:rank1-additive` 的 `R1`）。
 *    这些是真正的"定义引用"。
 *
 * 名字在正文里出现只是**必要条件**；成立还要过确认段的四道核对（版本、类型、
 * 提供方确实引入过、且不是引用自己）。
 */

import {
  listSpecs, specSources, tokenize, undecided, proved, unsupported, conditionsOf, specForId,
} from './shared.mjs';

export const KIND = 'definitionReference';

/**
 * 符号 → **引入**它的节点。这是本模块唯一的符号来源。
 *
 * ## 为什么需要一个「引入登记」而不是复用 `BACKGROUND_REFERENCES`
 *
 * `BACKGROUND_REFERENCES` 记的是**谁用到了**某个背景符号（每个用到它的节点一条），
 * 所以 `left_mul` 在它那里有 4 个节点、`seq_conv` 有 3 个。用它当"引入方"，
 * 每个符号都会变成 ambiguous——**"用到"与"引入"是两件事，不能互相顶替**。
 *
 * 引入登记的形状（登记表导出 `PROVIDES`，或从 `backgrounds.mjs` 的
 * `introducedBy` 字段现建一份）：
 *
 * ```js
 * // 数组：一条 = 一个节点引入一个符号
 * [{ node: 'group:left-mul', symbol: 'left_mul', type: '(G->G->G)->G->G->G', version: '1' }]
 * // 或映射：{ left_mul: { node: 'group:left-mul', type: '…' } }
 * ```
 *
 * **没有这份登记就没有定义引用**——这是刻意的：只凭"名字在正文里出现过"就断言
 * 跨节点依赖，正是 2026-10-04 验收抓到的那类假引用。
 */
function providerIndex(ctx) {
  const registry = ctx.registry ?? null;
  const index = new Map();
  const add = (symbol, info) => {
    if (!symbol || !info?.node) return;
    const list = index.get(symbol) ?? [];
    if (!list.some((item) => item.node === info.node && item.kind === info.kind)) list.push(info);
    index.set(symbol, list);
  };

  const provides = ctx.provides ?? registry?.PROVIDES ?? null;
  if (Array.isArray(provides)) {
    for (const entry of provides) {
      add(entry?.symbol, {
        node: entry.node,
        version: String(entry.version ?? '1'),
        type: String(entry.type ?? ''),
        background: entry.background ?? null,
        kind: 'provides',
      });
    }
  } else if (provides && typeof provides === 'object') {
    for (const [symbol, info] of Object.entries(provides)) {
      add(symbol, {
        node: info?.node ?? info,
        version: String(info?.version ?? '1'),
        type: String(info?.type ?? ''),
        background: info?.background ?? null,
        kind: 'provides',
      });
    }
  }

  /*
   * 节点**自己定义**的符号也算引入（`R1` 这种 spec 内的定义）：
   * 定义会进理论，别的节点用它是实打实的依赖，不需要另立登记。
   */
  for (const spec of listSpecs(ctx)) {
    for (const definition of spec.definitions ?? []) {
      add(definition?.name, {
        node: spec.node,
        version: String(spec.nodeVersion ?? '1'),
        type: String(definition.type ?? ''),
        background: spec.background ?? null,
        kind: 'definition',
      });
    }
  }
  return index;
}

/** 这条陈述**自己的**局部名字（含定义名）：出现它们不算跨节点引用。 */
function localNames(spec) {
  const names = new Set();
  for (const item of spec?.declarations ?? []) if (item?.name) names.add(item.name);
  for (const item of spec?.definitions ?? []) if (item?.name) names.add(item.name);
  return names;
}

/** 一个符号的候选提供方：过滤掉"引用自己"，剩下的去重。 */
function providersFor(index, symbol, consumerNode) {
  const list = (index.get(symbol) ?? []).filter((item) => item.node !== consumerNode);
  const seen = new Map();
  for (const item of list) {
    const key = `${item.node}@${item.version}`;
    if (!seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

export function makeJudge(kind = KIND, deps = {}) {
  return {
    kind,
    /**
     * 候选：本条陈述的正文里出现的、**有唯一引入方**的符号。
     *
     * 方向按登记表惯例：`from` = 用到符号的那个节点，`to` = **引入**符号的节点
     * （见 `rel:group:claim-injective-uses-left-mul`）。同一符号有多个引入方时不猜。
     */
    candidates(spec, ctx = {}) {
      const index = providerIndex({ ...ctx, registry: ctx.registry ?? deps.registry });
      const locals = localNames(spec);
      const out = [];
      const seen = new Set();
      const ambiguous = [];
      for (const source of specSources(spec)) {
        for (const token of tokenize(source)) {
          if (locals.has(token)) continue;                 // 本条陈述自己的局部名字
          if (seen.has(token)) continue;
          const providers = providersFor(index, token, spec.node);
          if (providers.length === 0) continue;
          seen.add(token);
          if (providers.length > 1) {
            // 多个节点都登记了这个符号：不挑一个"最像的"，如实记下来交给审阅者。
            ambiguous.push({ symbol: token, providers: providers.map((item) => item.node) });
            continue;
          }
          const info = providers[0];
          out.push({
            kind,
            from: { node: spec.node, version: String(spec.nodeVersion ?? '1') },
            to: { node: info.node, version: info.version },
            direction: null,
            conditions: conditionsOf(spec),
            goal: null,                       // 定义引用不证明命题，只有「用到」这一件事
            reason: `节点 ${spec.node} 的表达里用到符号 ${token}；该符号由 ${info.node}@${info.version} 引入（${info.kind === 'definition' ? '该节点的定义' : '背景登记的背景引用'}），类型 ${info.type || '未标注'}。`,
            symbol: token,
            symbolType: info.type ?? '',
            providerKind: info.kind,
          });
        }
      }
      // 歧义不是候选：它在确认段无法核对到**唯一**引入方，如实上报而不是猜一个。
      if (ambiguous.length) {
        Object.defineProperty(out, 'ambiguous', { value: ambiguous, enumerable: false });
      }
      return out;
    },

    /**
     * 确认：四道核对，缺一即如实报未决。
     *
     * 1. **不是引用自己**——`to` 不能是 `from`；
     * 2. **不是局部名字**——符号不能出现在 `from` 自己的 `declarations`/`definitions` 里
     *    （这一条正是"群里出现 `mul0` 就当成引用了阿贝尔群"的直接防线）；
     * 3. **对端确实引入过这个符号**——在 `BACKGROUND_REFERENCES` 或对端的 `definitions` 里查得到；
     * 4. **版本与类型对得上**——版本不符报 `stale-reference`；类型不符报未决并写出两侧类型。
     */
    confirm(candidate, ctx = {}) {
      const index = providerIndex({ ...ctx, registry: ctx.registry ?? deps.registry });
      const symbol = candidate.symbol;
      if (!symbol) return undecided('候选没带符号，无法核对定义引用。');

      const consumerId = candidate.from?.node ?? null;
      const consumer = consumerId ? specForId(ctx, consumerId) : null;

      // 核对 1：引用自己。
      if (consumerId && candidate.to?.node === consumerId) {
        return undecided(`符号 ${symbol} 由 ${consumerId} 自己引入，不构成跨节点定义引用。`);
      }
      // 核对 2：局部名字。**这条比"符号表里查得到"更重要**——局部参数可以被任何节点复用。
      if (consumer && localNames(consumer).has(symbol)) {
        return undecided(`符号 ${symbol} 是 ${consumerId} 自己的局部声明（参数或定义），不构成对外部节点的定义引用。`);
      }

      const providers = providersFor(index, symbol, consumerId);
      if (providers.length === 0) {
        const registered = index.get(symbol) ?? [];
        if (registered.length) {
          return undecided(`符号 ${symbol} 只由 ${registered.map((item) => item.node).join('、')} 引入，而候选的起点就是它自己；不构成跨节点引用。`);
        }
        return undecided(`登记数据里没有节点**引入**过符号 ${symbol}（"名字在正文里出现"不等于"引入了符号"）。要让这类关系可核，需要在登记表导出 PROVIDES、或在 backgrounds.mjs 的常量上标 introducedBy。`);
      }
      const expectedNode = candidate.to?.node ?? null;
      const info = providers.find((item) => item.node === expectedNode) ?? null;
      if (!info) {
        return unsupported(`符号 ${symbol} 现由 ${providers.map((item) => item.node).join('、')} 引入，与候选记录的 ${expectedNode ?? '(未给)'} 不符（stale-reference）。`);
      }
      if (providers.length > 1) {
        return undecided(`符号 ${symbol} 同时被 ${providers.map((item) => item.node).join('、')} 引入，无法确定唯一来源；请先消除引入登记的歧义。`);
      }
      /*
       * 三个版本都要对得上，缺一条就是 `stale-reference`：
       *
       * 1. `info.version`（引入登记里记的）——它说这条引入关系是哪一版的；
       * 2. `current`（引入方节点**现在**的版本）——对端改版之后，旧候选不该再算成立；
       * 3. `candidate.to.version`（**候选自己记的**）——这一条早先漏了。
       *
       * 第 3 条不能省：候选是"当时的快照"，重放时若它记的对端版本已经过期，
       * 即使前两条恰好相等，也不该判成立——那正是"证据必须随条件行走"的意思。
       */
      const registered = String(info.version);
      const current = String(specForId(ctx, info.node)?.nodeVersion ?? registered ?? '1');
      const claimed = candidate.to?.version === undefined || candidate.to?.version === null
        ? null : String(candidate.to.version);
      if (claimed !== null && claimed !== current) {
        return unsupported(`符号 ${symbol} 的引入方 ${info.node} 版本已变化：候选记的是 ${claimed}，当前是 ${current}（stale-reference）。`);
      }
      if (current !== registered) {
        return unsupported(`符号 ${symbol} 的引入登记记的是 ${info.node}@${registered}，而该节点当前版本是 ${current}（stale-reference）。`);
      }
      const consumerType = candidate.symbolType ?? '';
      if (consumerType && info.type && consumerType !== info.type) {
        return undecided(`符号 ${symbol} 的类型对不上：候选记 ${consumerType}，${info.node} 登记的是 ${info.type}。`);
      }
      return proved(`符号 ${symbol} 由 ${info.node}@${info.version} 引入（${info.kind === 'definition' ? '该节点的定义' : '引入登记 PROVIDES'}），类型 ${info.type || '未标注'}；定义引用成立。`, {
        mode: 'definition',
        evidenceKind: 'reference',
        // 把核对依据带上：界面要能显示"成立在哪一条登记上"，而不是一句"已核"。
        provider: { node: info.node, version: info.version, type: info.type, kind: info.kind, background: info.background },
        checkedBy: info.kind === 'definition' ? 'definitions' : 'PROVIDES',
      });
    },
  };
}
