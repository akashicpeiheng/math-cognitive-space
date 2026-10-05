/**
 * 内核口径的序列化（`core/formal/codec.mjs`）。
 *
 * **为什么不能复用 `shared/contracts.mjs#canonicalString`**：检查器 `kernel.py`
 * 只用一种字节口径算哈希——Python 的
 * `json.dumps(x, ensure_ascii=True, separators=(',',':'), sort_keys=True)`。
 * 站内那份走的是 `JSON.stringify`，**没有 ensure_ascii**：同一个对象里只要出现一个
 * 非 ASCII 字符（中文标签、`λ`、`ℝ`、`∧`），两边算出的字节就不同，证书会被判成
 * 「理论哈希不一致」这种最难查的错。所以这里单独实现一份逐字节对齐 Python 的口径，
 * 别的模块一律不要自己拼哈希输入。
 *
 * 对齐的三处细节（都是探针 `tmp/probe/` 核验过的）：
 * 1. 对象键递归排序（`sort_keys=True`）；
 * 2. 分隔符无空格（`separators=(',',':')`）；
 * 3. 所有 `0x7E` 以上的码点转成小写 `\uXXXX`，星光平面字符拆成代理对两个 `\uXXXX`
 *    （Python 的 `ensure_ascii` 转义区间是「空格到 `~` 之外的一切」，所以 **`0x7F`
 *    也要转义**，不能只判 `> 0x7F`）。
 *
 * 事实边界（诚实写清）：只对 **字符串 / 布尔 / null / 整数 / 数组 / 对象** 保证逐字节一致。
 * 浮点数两边的最短往返表示本就不同（`1e-07` vs `1e-7`、`1.0` vs `1`），本项目的证书语料
 * （公式、理论、证明）里不出现浮点，因此不做静默转换，也不假装支持。`undefined` 与
 * Python 的「没有这个键」等价（`JSON.stringify` 会丢键），可以放心使用。
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** 检查器的协议版本，必须与 `kernel.py` 的 `VERSION` 逐字相同。 */
export const KERNEL_VERSION = 'mcs-nd-subset/1';

/** 整包所有 proof 的步骤数之和上限，与 `kernel.py` 的 `MAX_STEPS` 相同。 */
export const MAX_STEPS = 2000;

/** 单份证书的字节上限，与 `kernel.py` 的 `MAX_BYTES` 相同。 */
export const MAX_BYTES = 4_000_000;

/**
 * 递归排序对象键。
 *
 * 只影响键的**顺序**，不改值；数组顺序保持不变（项的语法树靠数组位置表达，
 * 排序数组等于毁掉公式）。返回新对象，不改动入参。
 */
export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

/**
 * `python json.dumps(value, ensure_ascii=True, separators=(',',':'), sort_keys=True)` 的等价实现。
 * 返回的是 ASCII 字符串——与 Python 写进文件、再被 `kernel.stable()` 重算的字节完全一致。
 */
export function pyStableString(value) {
  const json = JSON.stringify(canonicalize(value));
  let out = '';
  for (const ch of json) {
    const code = ch.codePointAt(0);
    if (code > 0x7e) {
      if (code > 0xffff) {
        const offset = code - 0x10000;
        out += `\\u${(0xd800 + (offset >> 10)).toString(16)}\\u${(0xdc00 + (offset & 0x3ff)).toString(16)}`;
      } else {
        out += `\\u${code.toString(16).padStart(4, '0')}`;
      }
    } else {
      // 0x20 以下的控制字符已经由 JSON.stringify 转义成 `\uXXXX`/`\n` 等纯 ASCII 序列，
      // 这里拿到的不可能再是裸控制字符，因此无需二次处理。
      out += ch;
    }
  }
  return out;
}

/** `kernel.digest(x)`：`sha256(pyStableString(x))` 的十六进制小写摘要（不带 `sha256:` 前缀）。 */
export function digest(value) {
  return createHash('sha256').update(pyStableString(value), 'utf8').digest('hex');
}

/**
 * 文件字节的 sha256（不带前缀）——与 `kernel.file_hash()` 同口径。
 *
 * 用同步读：调用点（检查器文件哈希、证书输入哈希）都在同步路径上，
 * 而且文件只有几百 KB，为了一个哈希把整条链改成 Promise 不划算。
 */
export function fileHash(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}
