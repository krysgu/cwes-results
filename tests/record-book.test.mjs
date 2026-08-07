import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, parseElapsedTime, privateDataPaths, readJson } from './helpers.mjs';

const book = readJson('data/record-book.json');
const results = readJson('data/results.json');

test('record book contains 28 unique routes updated through 2025', () => {
  assert.equal(book.updated_through, 2025);
  assert.equal(book.routes.length, 28);
  const routeNames = book.routes.map((route) => normalize(route.route));
  assert.equal(new Set(routeNames).size, routeNames.length, 'Record-book route names must be unique');
});

test('record holders have valid names, times, years, and shared-record groups', () => {
  for (const route of book.routes) {
    assert.ok(route.route, 'Every record-book row needs a route name');
    if (route.href) assert.match(route.href, /^https:\/\/ultrawilderness\.com\//, `${route.route} has an unexpected route URL`);
    for (const gender of ['male', 'female']) {
      const records = route[gender];
      assert.ok(Array.isArray(records), `${route.route} ${gender} records must be an array`);
      assert.equal(new Set(records.map((record) => normalize(record.name))).size, records.length, `${route.route} repeats a ${gender} holder`);
      for (const record of records) {
        assert.ok(record.name, `${route.route} has an unnamed ${gender} holder`);
        assert.notEqual(parseElapsedTime(record.time), null, `${route.route} has an invalid ${gender} time`);
        assert.ok(Number.isInteger(record.year) && record.year >= 2000 && record.year <= book.updated_through, `${route.route} has an invalid ${gender} year`);
        assert.equal(typeof record.shared, 'boolean', `${route.route} ${gender} shared flag must be boolean`);
      }
      if (records.some((record) => record.shared)) {
        assert.ok(records.length > 1, `${route.route} marks a solo ${gender} record as shared`);
        assert.ok(records.every((record) => record.shared), `${route.route} shared ${gender} holders must all be marked shared`);
        assert.equal(new Set(records.map((record) => record.time)).size, 1, `${route.route} shared ${gender} holders need the same time`);
        assert.equal(new Set(records.map((record) => record.year)).size, 1, `${route.route} shared ${gender} holders need the same year`);
      }
    }
  }
});

test('every record-book route maps to the results archive and its FKT summary agrees', () => {
  const summaries = new Map(results.summaries.map((summary) => [normalize(summary.route_key), summary]));
  for (const route of book.routes) {
    const summary = summaries.get(normalize(route.route));
    assert.ok(summary, `No results summary found for record-book route: ${route.route}`);
    for (const [gender, summaryKey] of [['male', 'male_best'], ['female', 'female_best']]) {
      if (route[gender].length === 0) {
        assert.equal(summary[summaryKey], null, `${route.route} has an unexpected ${gender} best in results`);
        continue;
      }
      assert.ok(summary[summaryKey], `${route.route} is missing its ${gender} best in results`);
      assert.equal(parseElapsedTime(summary[summaryKey].time), parseElapsedTime(route[gender][0].time), `${route.route} ${gender} FKT time disagrees with results`);
      assert.equal(summary[summaryKey].year, route[gender][0].year, `${route.route} ${gender} FKT year disagrees with results`);
    }
  }
});

test('public record-book data contains no private contact fields', () => {
  assert.deepEqual(privateDataPaths(book), []);
});
