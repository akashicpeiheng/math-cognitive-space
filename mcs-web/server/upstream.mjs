import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../core/ontology.mjs';

/**
 * 上游（DeepTutor）检出的**只读**信息（2026-10 加，TODO A4-26）。
 *
 * 第四十八轮的边界：「DeepTutor 版本号现在是核对之后写死的 v1.6.12」。
 * 写死的版本号会悄悄过期，而且读者无法判断它是什么时候核对的。现在改成运行期只读：
 *
 * - 从本机检出 `<检出名>/deeptutor/__version__.py`（在 `.bridge-research` 下）读出 `__version__`；
 * - 同时报出**来源路径**（仓库相对）、**读取时间**与**文件修改时间**——
 *   「这个版本号是什么时候、从哪里读到的」和版本号本身一样重要；
 * - 读不到就说读不到（`available: false` + 原因），不退回一个看起来像实时值的手抄数字。
 *
 * 两条纪律与 `maintenance.mjs` 一致：**只读**、**不泄露绝对路径**。
 * 缓存 5 分钟：一次页面加载会问好几次状态，没必要每次读盘（同一套做法见 A4-33）。
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const RESEARCH_DIR = '.bridge-research';
/** 检出目录里可能同时有 api / tag / 主检出，主检出的 `deeptutor/__version__.py` 才算数。 */
function candidateCheckouts(researchRoot) {
  const root = researchRoot;
  if (!existsSync(root)) return [];
  let names = [];
  try { names = readdirSync(root); } catch { return []; }
  return names
    .map((name) => ({ name, versionFile: join(root, name, 'deeptutor', '__version__.py') }))
    .filter((entry) => existsSync(entry.versionFile));
}

/** 读主检出：优先名字里不带 -api- / -tag- 的那一份（那是源码主检出）。 */
function readVersionFile(researchRoot) {
  const candidates = candidateCheckouts(researchRoot);
  if (candidates.length === 0) return { found: false, reason: `没有在 ${RESEARCH_DIR} 下找到 DeepTutor 检出（缺 deeptutor/__version__.py）` };
  const preferred = candidates.find((entry) => !/-api-|-tag-/.test(entry.name)) ?? candidates[0];
  let text;
  try { text = readFileSync(preferred.versionFile, 'utf8'); } catch (error) {
    return { found: false, reason: `读取 ${preferred.versionFile} 失败：${error.message}` };
  }
  const match = /^\s*__version__\s*=\s*['"]([^'"]+)['"]/m.exec(text);
  if (!match) return { found: false, reason: `${preferred.name}/deeptutor/__version__.py 里没有 __version__` };
  let fileModifiedAt = null;
  try { fileModifiedAt = statSync(preferred.versionFile).mtime.toISOString(); } catch { /* 拿不到时间不影响版本号 */ }
  const relative = `${RESEARCH_DIR}/${preferred.name}/deeptutor/__version__.py`;
  return { found: true, version: match[1], source: relative, fileModifiedAt, checkout: preferred.name, checkouts: candidates.length };
}

let cache = null;

/**
 * 上游版本快照。`force` 用于测试与「刷新」入口。
 *
 * 返回形状固定（读不到也返回同形状），调用方不必区分两种分支：
 * `{ available, version, source, readAt, fileModifiedAt, note }`。
 */
export function upstreamSnapshot({ force = false, now = () => Date.now(), researchRoot = join(REPO_ROOT, RESEARCH_DIR) } = {}) {
  if (!force && cache && now() - cache.readAtMs < CACHE_TTL_MS) return cache.value;
  const read = readVersionFile(researchRoot);
  const value = read.found
    ? {
      available: true,
      version: read.version,
      label: `v${read.version}`,
      source: read.source,
      sourceKind: 'runtime-read',
      fileModifiedAt: read.fileModifiedAt,
      readAt: new Date(now()).toISOString(),
      note: `版本号在运行期读自 ${read.source}（检出目录 ${read.checkout}${read.checkouts > 1 ? `，同级还有 ${read.checkouts - 1} 份检出` : ''}）。`,
    }
    : {
      available: false,
      version: null,
      label: null,
      source: null,
      sourceKind: 'unavailable',
      fileModifiedAt: null,
      readAt: new Date(now()).toISOString(),
      note: `${read.reason}；界面据此显示「未读到本机检出」，不显示一个手抄的版本号。`,
    };
  cache = { readAtMs: now(), value };
  return value;
}

/** 测试用：清掉缓存，让下一次调用真的去读盘。 */
export function resetUpstreamCache() {
  cache = null;
}
