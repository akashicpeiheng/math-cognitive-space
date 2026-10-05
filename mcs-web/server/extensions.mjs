/**
 * 已发布内容包的读写（`data/extensions/`）。
 *
 * ## 为什么要有独立的一层
 *
 * 发布不是「把新数据覆盖到 `data/`」：一旦覆盖，就没有「原版本继续生效」这回事了。
 * 这里把已发布内容做成**不可变的包**：每次发布写一个新目录 `data/extensions/<revisionId>/`，
 * 生效与否只由一个小文件 `active.json` 决定。于是「切换版本」「回滚」「失败回退」
 * 全都退化成同一个原子操作——换掉 active.json 里的一个指针（临时文件 + rename）。
 *
 * ## 三条不变量（后面每个函数都在维护它们）
 *
 * 1. **包一旦写入不再修改**：`writePackage` 遇到已存在的目录就报冲突，绝不覆盖；
 *    同一份内容重复发布时靠内容哈希得到同一个 id，直接复用旧包（幂等）。
 * 2. **哈希自洽**：`contentHash = packageHash(pkg)`，`revisionId` 由它派生。
 *    回读时重算一遍，对不上就是「包被改过」，报 `INTERNAL` 而不是继续用。
 * 3. **内容包只描述声明式数据**：节点、关系、证据、定义、契约、证书文本。
 *    这里不 import 任何用户输入的执行入口，也不接受路径参数去读包外的文件
 *    （`revisionId` 先过白名单正则，杜绝 `../` 这类拼出来的路径）。
 */

import { mkdir, readFile, writeFile, rename, readdir, rm, stat, unlink } from 'node:fs/promises';
import { join, resolve, sep, isAbsolute, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { McsError, CODES } from '../shared/errors.mjs';
import { sha256, bytesHash } from '../core/hash.mjs';

export const PACKAGE_SCHEMA = 'mcs-extension-package/1';
export const ACTIVE_SCHEMA = 'mcs-extensions-active/1';
export const ACTIVE_FILE = 'active.json';
export const PACKAGE_FILE = 'package.json';
export const META_FILE = 'meta.json';
export const ITEMS_FILE = 'items.json';
export const ITEMS_SCHEMA = 'mcs-extension-items/1';

/**
 * revisionId 的形状白名单。
 *
 * 它不是装饰：id 来自 URL 与草稿数据，会被拼进文件路径。只允许 `rev:` + 字母数字与 `._-`，
 * 且长度封顶，`..`、分隔符、盘符都进不来——路径穿越在这一层就断掉，
 * 不指望调用方每次都记得校验。
 */
const REVISION_ID_PATTERN = /^rev:[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** 包体里允许出现的字段。多出来的字段一律拒绝（不做「悄悄忽略」）。 */
const PACKAGE_FIELDS = new Set([
  'schema', 'revisionId', 'contentHash', 'parent', 'kind', 'restores',
  'baselineFingerprint', 'reviewDigest', 'acceptedCandidateIds', 'dismissedCandidateIds',
  'notes', 'nodes', 'relations', 'evidence', 'definitions', 'contracts', 'specs',
  'pendingRelations', 'certificates', 'files', 'summary', 'dropped', 'createdBy', 'createdAt',
]);

function nowIso() { return new Date().toISOString(); }

/** 允许 `dataDir` 字符串（规格 §8.2）或 `{ dataDir, extensionsDir }`（服务层 ctx）。 */
export function extensionsRoot(dataDir) {
  if (typeof dataDir === 'string' && dataDir.trim()) return join(resolve(dataDir), 'extensions');
  if (dataDir && typeof dataDir === 'object') {
    if (typeof dataDir.extensionsDir === 'string' && dataDir.extensionsDir.trim()) return resolve(dataDir.extensionsDir);
    if (typeof dataDir.dataDir === 'string' && dataDir.dataDir.trim()) return join(resolve(dataDir.dataDir), 'extensions');
  }
  throw new McsError(CODES.INTERNAL, 'extensionsRoot 需要 dataDir 或 extensionsDir', 500);
}

/** 目录名即 revisionId：先校验形状再拼路径，任何不合规的引用都在这里被挡住。 */
export function assertRevisionId(revisionId) {
  if (typeof revisionId !== 'string' || !REVISION_ID_PATTERN.test(revisionId)) {
    throw new McsError(CODES.BAD_REQUEST, `版本标识非法：${String(revisionId).slice(0, 80)}`, 400, { revision_id: revisionId ?? null });
  }
  return revisionId;
}

/** 目录名必须在 extensionsRoot 之内（防 `..` 与绝对路径），删除/写入前都先过这一关。 */
function withinRoot(root, target) {
  const base = resolve(root);
  const full = resolve(target);
  if (full !== base && !full.startsWith(base + sep)) {
    throw new McsError(CODES.BAD_REQUEST, `路径越出内容包目录：${full}`, 400);
  }
  return full;
}

/**
 * 逻辑 id → 目录名。
 *
 * 规格 §8.2 写的是 `data/extensions/<revisionId>/`，而 §5 的 id 形状是 `rev:<哈希前 16 位>`。
 * 冒号在 Windows 文件名里非法（mkdir 直接 EINVAL），所以落盘时把 `:` 换成 `-`：
 * **逻辑 id 一个字符都不变**（接口、哈希、包体里仍然是 `rev:`），只有目录名如此。
 * 单射且可逆，读回时按同样规则还原；同时也兼容在 POSIX 上按原样建出来的目录。
 */
export function dirNameFor(revisionId) {
  return assertRevisionId(revisionId).replaceAll(':', '-');
}

export function revisionIdFromDirName(dirName) {
  const candidate = String(dirName).replace(/^rev-/, 'rev:');
  return REVISION_ID_PATTERN.test(candidate) ? candidate : null;
}

/* ------------------------------------------------------------ 路径约定 */

/**
 * 一个版本包在扩展根下的目录。
 *
 * 全仓库**只有这一处**把「版本 id」翻成「包目录」——`dirNameFor` 的冒号规则也只有这一份。
 * 别的模块要拼包内文件，一律经这里，免得某处漏了 `dirNameFor` 而在 Windows 上炸 ADS 语法。
 */
export function packageDirPath(extensionsDir, revisionId) {
  return join(resolve(extensionsDir), dirNameFor(revisionId));
}

/**
 * 绝对路径 → 「相对 repoRoot」的 POSIX 形式（本体校验器认的就是这个形状）。
 *
 * **跨盘时必须原样返回绝对路径**：Windows 的 `path.relative` 在两个盘之间返回的是
 * 绝对路径，如果调用方照样 `split(sep).join('/')` 再 `join(staging, …)`，就会拼出
 * `…\staging\D:\other\…` 这种畸形路径（2026-10-04 的 P2 就是这么炸的）。
 * 这里把两种情形分开写清楚：能被表达成相对路径就给相对路径；不能就交回绝对路径，
 * 由下游的 `resolve(repoRoot, p)` 正确解析（绝对路径在 resolve 里优先，语义不变）。
 */
export function toRepoRelative(repoRoot, absolute) {
  const target = resolve(absolute);
  if (!repoRoot) return target.replaceAll(sep, '/');
  const rel = relative(resolve(repoRoot), target);
  if (!rel || isAbsolute(rel)) return target.replaceAll(sep, '/');
  return rel.split(sep).join('/');
}

/**
 * 包内证书文件 → 供本体校验器使用的「相对 repoRoot」路径。
 *
 * `certificateFile` 是**包内相对路径**（`certificates/<id>.json`，不含版本号）；
 * 仓库路径要带上版本目录，而版本目录名由 `dirNameFor` 决定。
 * 「暂存内」与「真实加载时」都由这一个函数算：两处各写一份的话，
 * 只会在真发布时才炸（定义引用没有证书文件，所以迟迟不暴露）。
 */
export function certificateRepoPath({ repoRoot, extensionsDir, revisionId, certificateFile }) {
  if (!certificateFile) return null;
  const absolute = join(packageDirPath(extensionsDir, revisionId), certificateFile);
  return toRepoRelative(repoRoot, absolute);
}

/**
 * 隔离区（暂存根）里的固定布局。
 *
 * **与真实盘位无关**：暂存根内部永远长成 `<staging>/staged-repo/data/extensions/`。
 * 为什么不能照抄真实位置：真实扩展目录可能在另一个盘上，`relative(repoRoot, extensionsDir)`
 * 那时候返回的是绝对路径，照抄就会拼出畸形路径。隔离区的用途只是「用同一条校验规则
 * 试算一遍」，所以它的内部结构只需要**自洽**，不需要与真实盘位同形——
 * 而且自洽之后，`relative()` 的两端永远同盘，跨盘与同盘走的就是同一条代码路径。
 */
export const STAGING_REPO_SUBDIR = Object.freeze(['staged-repo']);

export function stagingLayout(stagingRoot) {
  const repoRoot = resolve(stagingRoot);
  return {
    repoRoot,
    extensionsDir: join(repoRoot, ...STAGING_REPO_SUBDIR, 'data', 'extensions'),
  };
}

async function exists(path) {
  try { await stat(path); return true; } catch { return false; }
}

/** 找出该版本实际所在的目录（优先新命名，兼容旧命名）。 */
async function resolveDir(root, revisionId) {
  const sanitized = dirNameFor(revisionId);
  if (await exists(join(root, sanitized))) return withinRoot(root, join(root, sanitized));
  if (await exists(join(root, revisionId))) return withinRoot(root, join(root, revisionId));
  return withinRoot(root, join(root, sanitized));
}

/**
 * 内容哈希。
 *
 * 两个字段**不参与**哈希，各有理由：
 * - `contentHash` 是自指字段（它就是哈希结果）；
 * - `revisionId` 由内容哈希派生（`rev:` + 前 16 位），必须排除才不会循环；
 * - `files` 是证书正文的携带形式（落盘时拆成独立文件），它的完整性由
 *   `certificates[].sha256` 单独核对——正文进哈希会让包体膨胀一倍，
 *   而「证书文件被改」这件事必须由 verifyPackage 逐个文件查。
 * - `createdAt` / `createdBy` / `notes` 是**这次动作的元数据**，不是内容：
 *   同一份内容 + 同一个父版本在任何时刻发布，都应得到同一个 revisionId，
 *   这正是「重复提交返回同结果」在存储层的落点。
 */
export function packageHash(pkg) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new McsError(CODES.BAD_REQUEST, 'packageHash 需要内容包对象', 400);
  }
  const { contentHash, revisionId, files, createdAt, createdBy, notes, ...hashed } = pkg;
  return `sha256:${sha256(hashed)}`;
}

/** revisionId = `rev:` + 内容哈希前 16 位（规格 §5）。 */
export function revisionIdFor(pkg) {
  return `rev:${packageHash(pkg).slice('sha256:'.length, 'sha256:'.length + 16)}`;
}

/** 逐项清单里各类条目的中文名（写问题文本用，别让维护界面读到 `relations:` 这种字段名）。 */
const ITEM_LABELS = Object.freeze({
  nodes: '节点', relations: '关系', evidence: '证据', definitions: '定义', contracts: '契约', specs: '形式表达',
});

/**
 * 逐项内容指纹（发布清单）。
 *
 * 包体哈希能回答「**这个包**被改过」，回答不了「**哪一条**被改过」。而维护者要的正是后者：
 * 「关系 rel:x 的内容与发布时不一致」比「哈希不符」可操作得多。
 *
 * 清单写在包目录里的独立文件 `items.json`（**不进包体**）：包体哈希与 revisionId 都由内容派生，
 * 往里加字段会让调用方先算出的 id 与落盘内容对不上。清单不参与信任链——它只是**具体化**：
 * 改坏一条关系时，即使连清单一起改，包体哈希仍然对不上 `meta.contentHash`，而目录名就是
 * 由那个哈希派生的，改不动。清单让「哪一条」从哈希里显形，不替哈希做担保。
 */
export function itemDigests(pkg) {
  const pick = (items, keyOf) => Object.fromEntries(
    (items ?? [])
      .map((item) => [keyOf(item), item])
      .filter(([key]) => typeof key === 'string' && key.length > 0)
      .map(([key, item]) => [key, `sha256:${sha256(item)}`]),
  );
  return {
    nodes: pick(pkg?.nodes, (item) => item.id),
    relations: pick(pkg?.relations, (item) => item.id),
    evidence: pick(pkg?.evidence, (item) => item.id),
    definitions: pick(pkg?.definitions, (item) => item.id ?? item.name),
    contracts: pick(pkg?.contracts, (item) => item.id),
    specs: pick(pkg?.specs, (item) => item.node ?? item.id),
  };
}

/** 拿当前包体重算逐项指纹，与发布清单比对，逐条报出「哪一项、期望哈希、实测哈希」。 */
function compareItemDigests({ manifest, pkg, revisionId, problems }) {
  if (!manifest || !pkg) return;
  if (manifest.revisionId && manifest.revisionId !== revisionId) {
    problems.push(`发布清单不属于本版本：${manifest.revisionId} ≠ ${revisionId}`);
  }
  const current = itemDigests(pkg);
  for (const [category, entries] of Object.entries(manifest.digests ?? {})) {
    const label = ITEM_LABELS[category] ?? category;
    const now = current[category] ?? {};
    for (const [key, expected] of Object.entries(entries ?? {})) {
      const actual = now[key];
      if (actual === undefined) problems.push(`${label} ${key} 在发布后消失了（期望哈希 ${expected}）`);
      else if (actual !== expected) problems.push(`${label} ${key} 的内容与发布时不一致：期望哈希 ${expected}，实测哈希 ${actual}`);
    }
    for (const key of Object.keys(now)) {
      if (!Object.prototype.hasOwnProperty.call(entries ?? {}, key)) {
        problems.push(`${label} ${key} 是发布后新增的（不在发布清单里，期望哈希：无）`);
      }
    }
  }
}

/**
 * 读一个 JSON 文件。
 *
 * `optional` 与「缺失时返回什么」是两件事：`null` 本身是一个合法返回值
 * （「还没有激活指针」），不能拿它当「没传这个选项」的标记。所以用显式开关。
 */
async function readJsonFile(file, { optional = false, what = '文件' } = {}) {
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT' && optional) return null;
    if (error.code === 'ENOENT') throw new McsError(CODES.NOT_FOUND, `${what}不存在：${file}`, 404);
    throw new McsError(CODES.INTERNAL, `读取${what}失败：${error.message}`, 500, { file });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new McsError(CODES.INTERNAL, `${what}不是合法 JSON：${error.message}`, 500, { file });
  }
}

/** 只留声明式数据：函数、Symbol、BigInt、循环引用都要在落盘前被拒绝。 */
function assertDeclarative(value, path = 'package') {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new McsError(CODES.BAD_REQUEST, `${path} 含非有限数字`, 400);
    return;
  }
  if (type === 'function' || type === 'symbol' || type === 'bigint' || type === 'undefined') {
    throw new McsError(CODES.BAD_REQUEST, `${path} 含不可序列化的值：${type}（内容包只接受声明式数据）`, 400);
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertDeclarative(item, `${path}[${index}]`));
    return;
  }
  for (const [key, item] of Object.entries(value)) assertDeclarative(item, `${path}.${key}`);
}

/**
 * 回读校验：目录名、meta.id、pkg.revisionId、哈希四者必须一致。
 * 单独抽出来是为了让 `writePackage`、`readPackage`、`verifyPackage` 用同一条判据。
 */
function checkPackageConsistency({ revisionId, revision, pkg, problems }) {
  if (pkg?.schema !== PACKAGE_SCHEMA) problems.push(`内容包 schema 无效：${pkg?.schema}`);
  if (pkg?.revisionId !== revisionId) problems.push(`内容包的 revisionId 与目录不符：${pkg?.revisionId} ≠ ${revisionId}`);
  if (revision?.id !== revisionId) problems.push(`meta 的 id 与目录不符：${revision?.id} ≠ ${revisionId}`);
  const computed = pkg ? packageHash(pkg) : null;
  if (computed && revision?.contentHash && revision.contentHash !== computed) {
    problems.push(`内容哈希不符：meta=${revision.contentHash} 实算=${computed}`);
  }
  if (computed && pkg.contentHash && pkg.contentHash !== computed) {
    problems.push(`内容哈希不符：包内=${pkg.contentHash} 实算=${computed}`);
  }
  if (computed && revisionId !== `rev:${computed.slice(7, 23)}`) {
    problems.push(`revisionId 不是内容哈希派生值：${revisionId} ≠ rev:${computed.slice(7, 23)}`);
  }
  for (const key of Object.keys(pkg ?? {})) {
    if (!PACKAGE_FIELDS.has(key)) problems.push(`内容包含未登记字段：${key}`);
  }
  for (const [index, entry] of (pkg?.certificates ?? []).entries()) {
    if (typeof entry?.path !== 'string' || typeof entry?.sha256 !== 'string') {
      problems.push(`证书条目 ${index} 缺少 path 或 sha256`);
    }
  }
  return problems;
}

/** 列出全部版本（按 id 排序）。坏掉的目录不静默跳过：记进 problems 由调用方决定怎么显示。 */
export async function listPackages(dataDir, { problems = [] } = {}) {
  const root = extensionsRoot(dataDir);
  let names = [];
  try {
    names = await readdir(root);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw new McsError(CODES.INTERNAL, `读取内容包目录失败：${error.message}`, 500, { root });
  }
  const revisions = [];
  for (const name of names.filter((item) => /^rev[-:]/.test(item)).sort()) {
    try {
      const meta = await readJsonFile(join(root, name, META_FILE), { what: '版本元数据' });
      revisions.push(meta);
    } catch (error) {
      problems.push(`版本目录 ${name} 无法读取：${error.message}`);
    }
  }
  return revisions;
}

export async function readPackage(dataDir, revisionId) {
  const root = extensionsRoot(dataDir);
  const dir = await resolveDir(root, revisionId);
  const pkg = await readJsonFile(join(dir, PACKAGE_FILE), { what: '内容包' });
  const revision = await readJsonFile(join(dir, META_FILE), { what: '版本元数据' });
  return { revision, package: pkg };
}

export async function readActivePointer(dataDir) {
  const root = extensionsRoot(dataDir);
  const pointer = await readJsonFile(join(root, ACTIVE_FILE), { optional: true, what: '激活索引' });
  if (pointer === null) return null;
  if (pointer.schema !== ACTIVE_SCHEMA) {
    throw new McsError(CODES.INTERNAL, `激活索引 schema 无效：${pointer.schema}`, 500);
  }
  return {
    revision: pointer.revision ?? null,
    updatedAt: pointer.updatedAt ?? null,
    updatedBy: pointer.updatedBy ?? null,
    note: pointer.note ?? null,
  };
}

/**
 * 原子切换生效版本。
 *
 * 先写同目录的临时文件再 `rename`：同卷 rename 是原子操作，读者要么看到旧指针，
 * 要么看到新指针，不会读到半个 JSON。这是「任一步失败 → 原版本继续生效」的最后一道保险。
 */
export async function writeActivePointer(dataDir, revisionId, { updatedBy = null, note = null } = {}) {
  const root = extensionsRoot(dataDir);
  if (revisionId !== null && revisionId !== undefined) assertRevisionId(revisionId);
  await mkdir(root, { recursive: true });
  const payload = {
    schema: ACTIVE_SCHEMA,
    revision: revisionId ?? null,
    updatedAt: nowIso(),
    updatedBy,
    note,
  };
  const target = withinRoot(root, join(root, ACTIVE_FILE));
  const temp = withinRoot(root, join(root, `.${ACTIVE_FILE}.${randomUUID()}.tmp`));
  await writeFile(temp, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  try {
    await rename(temp, target);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw new McsError(CODES.INTERNAL, `切换激活索引失败：${error.message}`, 500, { target });
  }
  return payload;
}

/**
 * 写不可变内容包。
 *
 * 顺序是「先建目录 → 写证书文件 → 写 package.json → 写 meta.json → 回读校验」。
 * 任何一步失败都会把这个**刚建出来的目录**删掉：宁可没有这个包，
 * 也不留一个「active.json 指过来却读不出内容」的半成品。
 * 已存在的目录一律报冲突，绝不覆盖——旧包是回滚的唯一依据。
 */
export async function writePackage(dataDir, revision, pkg) {
  const root = extensionsRoot(dataDir);
  const revisionId = assertRevisionId(revision?.id ?? pkg?.revisionId);
  const dir = withinRoot(root, join(root, dirNameFor(revisionId)));
  const packageFile = join(dir, PACKAGE_FILE);
  const metaFile = join(dir, META_FILE);
  assertDeclarative(pkg, `package(${revisionId})`);
  assertDeclarative(revision, `revision(${revisionId})`);

  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const body = { ...pkg };
  delete body.files;                       // 证书正文落成独立文件，包体里只留哈希
  /*
   * schema 必须由调用方写好，不在这里补。
   *
   * 它参与内容哈希：若这里悄悄补一个字段，调用方先前算出的 revisionId 就与落盘内容对不上，
   * 而这种「差一个字段」的错最容易被当成偶发哈希不一致。宁可在这里明确报错。
   */
  if (body.schema !== PACKAGE_SCHEMA) {
    throw new McsError(CODES.BAD_REQUEST, `内容包 schema 必须是 ${PACKAGE_SCHEMA}（当前：${body.schema ?? '缺失'}）`, 400);
  }
  body.revisionId = revisionId;
  body.contentHash = packageHash(body);
  if (body.contentHash !== revision?.contentHash) {
    throw new McsError(CODES.INTERNAL,
      `内容包哈希与版本记录不符：写入时算得 ${body.contentHash}，版本记录里是 ${revision?.contentHash}；` +
      '两边必须用同一份 packageHash（字段差异通常是漏了 schema 或多带了 files）。', 500);
  }

  await mkdir(root, { recursive: true });
  try {
    await mkdir(dir, { recursive: false });
  } catch (error) {
    if (error.code === 'EEXIST') {
      // 同一份内容重复发布：复用旧包（幂等），但必须确认它读得出来、哈希自洽。
      const existing = await verifyPackage(dataDir, revisionId).catch((verifyError) => ({ ok: false, problems: [verifyError.message] }));
      if (existing.ok) return { revisionId, package: await readPackage(dataDir, revisionId), reused: true };
      throw new McsError(CODES.CONFLICT, `版本目录已存在且校验不通过：${revisionId}`, 409, { revision_id: revisionId, problems: existing.problems });
    }
    throw new McsError(CODES.INTERNAL, `创建版本目录失败：${error.message}`, 500, { dir });
  }

  try {
    for (const file of files) {
      const relative = String(file?.path ?? '');
      if (!relative || relative.includes('..') || /^[A-Za-z]:/.test(relative)) {
        throw new McsError(CODES.BAD_REQUEST, `证书路径非法：${relative}`, 400);
      }
      const target = withinRoot(root, join(dir, relative));
      await mkdir(resolve(target, '..'), { recursive: true });
      const content = typeof file.content === 'string' ? file.content : `${JSON.stringify(file.content, null, 2)}\n`;
      await writeFile(target, content, 'utf8');
      const declared = (body.certificates ?? []).find((entry) => entry.path === relative);
      const actual = `sha256:${bytesHash(Buffer.from(content, 'utf8'))}`;
      if (declared && declared.sha256 !== actual) {
        throw new McsError(CODES.INTERNAL, `证书正文与声明哈希不符：${relative}`, 500, { declared: declared.sha256, actual });
      }
    }
    await writeFile(packageFile, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
    await writeFile(metaFile, `${JSON.stringify(revision, null, 2)}\n`, 'utf8');
    /*
     * 发布清单：逐项指纹写在包目录里，供回读时指出「哪一条被改过」。
     * 它是**派生数据**（可以从包体重算），所以不参与内容哈希与 revisionId；写失败就整体撤销。
     */
    const manifest = {
      schema: ITEMS_SCHEMA,
      revisionId,
      createdAt: nowIso(),
      digests: itemDigests(body),
    };
    await writeFile(join(dir, ITEMS_FILE), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  } catch (error) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }

  const verdict = await verifyPackage(dataDir, revisionId);
  if (!verdict.ok) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
    throw new McsError(CODES.INTERNAL, `新包回读校验失败，已撤销写入：${revisionId}`, 500, { problems: verdict.problems });
  }
  return { revisionId, package: await readPackage(dataDir, revisionId), reused: false };
}

/**
 * 回读并核对哈希（规格 §8.2）。
 *
 * 除了包体哈希，还要逐个核对证书文件：包体哈希只能证明「清单没被改」，
 * 证明不了「清单指的那份证书还在、还是原来那份」。
 */
export async function verifyPackage(dataDir, revisionId) {
  const root = extensionsRoot(dataDir);
  const problems = [];
  let pkg = null;
  let revision = null;
  try {
    const dir = await resolveDir(root, revisionId);
    const packageFile = join(dir, PACKAGE_FILE);
    const metaFile = join(dir, META_FILE);
    pkg = await readJsonFile(packageFile, { what: '内容包' });
    revision = await readJsonFile(metaFile, { what: '版本元数据' });
    checkPackageConsistency({ revisionId: assertRevisionId(revisionId), revision, pkg, problems });
    // 「哪一条被改过」：只在包体哈希已经对不上时才有话可说，逐项清单负责把它说出来。
    const manifest = await readJsonFile(join(dir, ITEMS_FILE), { optional: true, what: '发布清单' })
      .catch((error) => { problems.push(`发布清单无法读取：${error.message}`); return null; });
    compareItemDigests({ manifest, pkg, revisionId: assertRevisionId(revisionId), problems });
    for (const entry of pkg.certificates ?? []) {
      if (typeof entry?.path !== 'string') continue;
      const target = withinRoot(root, join(dir, entry.path));
      try {
        const bytes = await readFile(target);
        const actual = `sha256:${bytesHash(bytes)}`;
        if (actual !== entry.sha256) {
          problems.push(`证书文件 ${entry.path} 的内容与发布时不一致：期望哈希 ${entry.sha256}，实测哈希 ${actual}`);
        }
      } catch (error) {
        problems.push(`证书文件缺失：${entry.path}（期望哈希 ${entry.sha256}，${error.code ?? error.message}）`);
      }
    }
  } catch (error) {
    problems.push(error.message);
  }
  return { ok: problems.length === 0, problems, revision, package: pkg };
}

/** 目录是否存在（发布事务用它判断「同内容是否已经落过盘」）。 */
export async function packageExists(dataDir, revisionId) {
  const root = extensionsRoot(dataDir);
  const dir = await resolveDir(root, revisionId);
  try {
    const info = await stat(dir);
    return info.isDirectory();
  } catch {
    return false;
  }
}

/** 供测试与维护脚本清理：只删指定版本目录，且必须在 extensionsRoot 之内。 */
export async function removePackage(dataDir, revisionId) {
  const root = extensionsRoot(dataDir);
  const dir = await resolveDir(root, revisionId);
  await rm(withinRoot(root, dir), { recursive: true, force: true });
  return { removed: revisionId };
}
