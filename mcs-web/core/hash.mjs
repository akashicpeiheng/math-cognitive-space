import { createHash } from 'node:crypto';
import { canonicalString } from '../shared/contracts.mjs';

export function sha256(value) {
  const data = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalString(value);
  return createHash('sha256').update(data).digest('hex');
}

export function bytesHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function shortHash(value, length = 12) {
  return sha256(value).slice(0, length);
}
