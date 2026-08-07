import test from 'node:test';
import assert from 'node:assert/strict';
import { parseElapsedTime, privateDataPaths, readJson } from './helpers.mjs';

const data = readJson('data/results.json');

test('results archive has the expected complete-history shape', () => {
  assert.ok(Array.isArray(data.results));
  assert.ok(Array.isArray(data.summaries));
  assert.ok(Array.isArray(data.progression));
  assert.equal(data.results.length, 625);
  assert.equal(Math.min(...data.results.map((row) => row.year)), 2015);
  assert.equal(Math.max(...data.results.map((row) => row.year)), 2025);
});

test('each result has a unique ID and required public fields', () => {
  const ids = new Set();
  for (const row of data.results) {
    assert.ok(row.result_id, 'Every result needs a result_id');
    assert.equal(ids.has(row.result_id), false, `Duplicate result_id: ${row.result_id}`);
    ids.add(row.result_id);
    assert.ok(row.route_key, `${row.result_id} is missing route_key`);
    assert.ok(row.first_name, `${row.result_id} is missing first_name`);
    assert.ok(row.last_name, `${row.result_id} is missing last_name`);
    assert.ok(['M', 'F'].includes(row.gender), `${row.result_id} has an invalid gender`);
    assert.ok(Number.isInteger(row.year), `${row.result_id} has an invalid year`);
    assert.ok(row.time, `${row.result_id} is missing its displayed time/status`);
  }
});

test('numeric times agree in text, seconds, and hours', () => {
  for (const row of data.results) {
    if (row.time_seconds == null) {
      assert.equal(row.time_hours, null, `${row.result_id} has hours but no seconds`);
      continue;
    }
    assert.equal(parseElapsedTime(row.time), row.time_seconds, `${row.result_id} time text disagrees with time_seconds`);
    assert.ok(Math.abs(row.time_hours * 3600 - row.time_seconds) < 0.001, `${row.result_id} time_hours disagrees with time_seconds`);
  }
});

test('route summaries account for every result exactly', () => {
  const counts = new Map();
  for (const row of data.results) counts.set(row.route_key, (counts.get(row.route_key) ?? 0) + 1);
  assert.equal(data.summaries.length, counts.size);
  for (const summary of data.summaries) {
    assert.equal(summary.result_count, counts.get(summary.route_key), `Incorrect result_count for ${summary.route_key}`);
    assert.ok(summary.first_year <= summary.latest_year, `Invalid year range for ${summary.route_key}`);
  }
});

test('FKT progression is chronological and never gets slower', () => {
  const groups = new Map();
  for (const point of data.progression) {
    const key = `${point.route_key}\u0000${point.gender}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(point);
    assert.equal(parseElapsedTime(point.time), point.time_seconds, `Invalid progression time for ${point.route_key}`);
  }
  for (const [key, points] of groups) {
    for (let index = 1; index < points.length; index += 1) {
      assert.ok(points[index].year >= points[index - 1].year, `${key} progression is not chronological`);
      assert.ok(points[index].time_seconds <= points[index - 1].time_seconds, `${key} progression gets slower`);
    }
  }
});

test('public results data contains no private contact fields', () => {
  assert.deepEqual(privateDataPaths(data), []);
});
