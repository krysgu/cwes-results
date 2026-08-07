import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), 'utf8'));
}

export function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

export function parseElapsedTime(value) {
  const parts = String(value ?? '').split(':').map(Number);
  if (![2, 3].includes(parts.length) || parts.some((part) => !Number.isFinite(part))) return null;
  const [hours, minutes, seconds = 0] = parts;
  if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function privateDataPaths(value, path = '$', matches = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => privateDataPaths(item, `${path}[${index}]`, matches));
    return matches;
  }
  if (!value || typeof value !== 'object') return matches;
  const privateKey = /(address|email|phone|street|postal|zip|mailing)/i;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (privateKey.test(key)) matches.push(childPath);
    privateDataPaths(child, childPath, matches);
  }
  return matches;
}
