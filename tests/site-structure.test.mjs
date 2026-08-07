import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot } from './helpers.mjs';

const requiredFiles = [
  'index.html', 'results/index.html', 'record-book/index.html', '404.html',
  'assets/css/site.css', 'assets/js/results.js', 'assets/js/record-book.js',
  'assets/images/og.jpg', 'data/results.json', 'data/record-book.json', '.nojekyll'
];

test('all required GitHub Pages files exist', () => {
  for (const file of requiredFiles) assert.ok(existsSync(resolve(repoRoot, file)), `Missing ${file}`);
});

test('local HTML links, scripts, styles, and images resolve', () => {
  for (const htmlPath of ['index.html', 'results/index.html', 'record-book/index.html', '404.html']) {
    const fullPath = resolve(repoRoot, htmlPath);
    const html = readFileSync(fullPath, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (!reference || /^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;
      const target = reference.startsWith('/cwes-results/')
        ? resolve(repoRoot, reference.slice('/cwes-results/'.length))
        : resolve(dirname(fullPath), reference);
      assert.ok(existsSync(target), `${htmlPath} points to missing ${relative(repoRoot, target)}`);
    }
  }
});

test('browser JavaScript passes Node syntax checks', () => {
  for (const file of ['assets/js/results.js', 'assets/js/record-book.js']) {
    const check = spawnSync(process.execPath, ['--check', resolve(repoRoot, file)], { encoding: 'utf8' });
    assert.equal(check.status, 0, `${file} has invalid JavaScript:\n${check.stderr}`);
  }
});

test('pages load their external public data files', () => {
  const resultsScript = readFileSync(resolve(repoRoot, 'assets/js/results.js'), 'utf8');
  const recordScript = readFileSync(resolve(repoRoot, 'assets/js/record-book.js'), 'utf8');
  assert.match(resultsScript, /fetch\('\.\.\/data\/results\.json'\)/);
  assert.match(recordScript, /fetch\('\.\.\/data\/record-book\.json'\)/);
});

test('site files contain no common broken-encoding markers', () => {
  const markers = /(?:â€|â€™|â€œ|â€\u009d|ï»¿|�)/;
  for (const file of requiredFiles.filter((path) => !path.endsWith('.jpg'))) {
    const content = readFileSync(resolve(repoRoot, file), 'utf8');
    assert.doesNotMatch(content, markers, `${file} contains a likely encoding artifact`);
  }
});
