// 有限简单类型：原子类型 | (t) | t -> t。
// 表达：const(name) | var(name) | app(f,a) | lam(x,type,body)。
import { McsError, CODES } from '../shared/errors.mjs';

const ATOM = /^[A-Za-z][A-Za-z0-9_]*$/;

export function parseType(source) {
  if (typeof source !== 'string' || !source.trim()) {
    throw new McsError(CODES.BAD_REQUEST, '类型必须是非空字符串');
  }
  const text = source.trim();
  let index = 0;
  function skip() { while (text[index] === ' ') index += 1; }
  function atom() {
    skip();
    if (text[index] === '(') {
      index += 1;
      const inner = arrow();
      skip();
      if (text[index] !== ')') throw new McsError(CODES.BAD_REQUEST, `类型缺少右括号：${text}`);
      index += 1;
      return inner;
    }
    const start = index;
    while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) index += 1;
    const name = text.slice(start, index);
    if (!ATOM.test(name)) throw new McsError(CODES.BAD_REQUEST, `非法类型名：${text}`);
    return { kind: 'atom', name };
  }
  function arrow() {
    let left = atom();
    skip();
    if (text[index] === '-' && text[index + 1] === '>') {
      index += 2;
      const right = arrow();
      return { kind: 'arrow', from: left, to: right };
    }
    return left;
  }
  const parsed = arrow();
  skip();
  if (index !== text.length) throw new McsError(CODES.BAD_REQUEST, `类型尾部无法解析：${text.slice(index)}`);
  return parsed;
}

export function typeToString(type) {
  if (type.kind === 'atom') return type.name;
  const left = type.from.kind === 'arrow' ? `(${typeToString(type.from)})` : typeToString(type.from);
  return `${left} -> ${typeToString(type.to)}`;
}

export function typeEquals(a, b) {
  return typeToString(a) === typeToString(b);
}

export function parseEnv(env = {}) {
  const parsed = {};
  for (const [name, type] of Object.entries(env)) parsed[name] = parseType(type);
  return parsed;
}

export function checkTerm(term, env = {}) {
  const typedEnv = parseEnv(env);
  function infer(node, local) {
    if (!node || typeof node !== 'object') throw new McsError(CODES.BAD_REQUEST, '表达项必须是 {const|var|app|lam} 对象');
    if (node.const !== undefined) {
      if (!typedEnv[node.const]) throw new McsError(CODES.BAD_REQUEST, `未声明的常元：${node.const}`);
      return typedEnv[node.const];
    }
    if (node.var !== undefined) {
      const bound = local[node.var] ?? typedEnv[node.var];
      if (!bound) throw new McsError(CODES.BAD_REQUEST, `未绑定的变量：${node.var}`);
      return bound;
    }
    if (node.app) {
      const fn = infer(node.app.fn, local);
      const arg = infer(node.app.arg, local);
      if (fn.kind !== 'arrow') throw new McsError(CODES.BAD_REQUEST, '应用到非函数类型');
      if (!typeEquals(fn.from, arg)) {
        throw new McsError(CODES.BAD_REQUEST, `应用类型不匹配：期望 ${typeToString(fn.from)}，得到 ${typeToString(arg)}`);
      }
      return fn.to;
    }
    if (node.lam) {
      const declared = parseType(node.lam.type);
      const next = { ...local, [node.lam.name]: declared };
      const body = infer(node.lam.body, next);
      return { kind: 'arrow', from: declared, to: body };
    }
    throw new McsError(CODES.BAD_REQUEST, '表达项不是 const/var/app/lam 之一');
  }
  return infer(term, {});
}
