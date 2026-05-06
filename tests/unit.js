'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {flatten, esc, highlight, displayName, dirOf, buildChartTree, setNestedPath, coerceValue, getNestedVal, valChanged, cleanStaleBracketKeys} = require('../app/lib.js');

// ─────────────────────────────────────────────
// flatten
// ─────────────────────────────────────────────

test('flatten: null value', () => {
  const out = [];
  flatten(null, 'a', out);
  assert.deepEqual(out, [{path: 'a', val: null, type: 'null'}]);
});

test('flatten: undefined value', () => {
  const out = [];
  flatten(undefined, 'a', out);
  assert.deepEqual(out, [{path: 'a', val: null, type: 'null'}]);
});

test('flatten: number value', () => {
  const out = [];
  flatten(42, 'num', out);
  assert.deepEqual(out, [{path: 'num', val: '42', type: 'num'}]);
});

test('flatten: boolean value', () => {
  const out = [];
  flatten(true, 'flag', out);
  assert.deepEqual(out, [{path: 'flag', val: 'true', type: 'bool'}]);
});

test('flatten: string value', () => {
  const out = [];
  flatten('hello', 'key', out);
  assert.deepEqual(out, [{path: 'key', val: 'hello', type: 'str'}]);
});

test('flatten: empty array', () => {
  const out = [];
  flatten([], 'arr', out);
  assert.deepEqual(out, [{path: 'arr', val: '[]', type: 'arr'}]);
});

test('flatten: array with items', () => {
  const out = [];
  flatten(['a', 'b'], 'arr', out);
  assert.deepEqual(out, [
    {path: 'arr[0]', val: 'a', type: 'str'},
    {path: 'arr[1]', val: 'b', type: 'str'},
  ]);
});

test('flatten: empty object', () => {
  const out = [];
  flatten({}, 'obj', out);
  assert.deepEqual(out, [{path: 'obj', val: '{}', type: 'arr'}]);
});

test('flatten: nested object', () => {
  const out = [];
  flatten({a: {b: 1}}, '', out);
  assert.deepEqual(out, [{path: 'a.b', val: '1', type: 'num'}]);
});

// ─────────────────────────────────────────────
// esc
// ─────────────────────────────────────────────

test('esc: ampersand', () => {
  assert.equal(esc('a&b'), 'a&amp;b');
});

test('esc: less-than', () => {
  assert.equal(esc('<b>'), '&lt;b&gt;');
});

test('esc: greater-than', () => {
  assert.equal(esc('x>y'), 'x&gt;y');
});

test('esc: double quote', () => {
  assert.equal(esc('"hi"'), '&quot;hi&quot;');
});

test("esc: single quote", () => {
  assert.equal(esc("it's"), "it&#39;s");
});

// ─────────────────────────────────────────────
// highlight
// ─────────────────────────────────────────────

test('highlight: no query returns escaped text', () => {
  assert.equal(highlight('<b>hi</b>', ''), '&lt;b&gt;hi&lt;/b&gt;');
});

test('highlight: single match', () => {
  assert.equal(highlight('foobar', 'foo'), '<span class="hl">foo</span>bar');
});

test('highlight: case-insensitive match', () => {
  assert.equal(highlight('FooBar', 'foo'), '<span class="hl">Foo</span>Bar');
});

test('highlight: multiple matches', () => {
  assert.equal(highlight('aXbXc', 'x'), 'a<span class="hl">X</span>b<span class="hl">X</span>c');
});

test('highlight: match with special chars in text', () => {
  // The text has a '<' which must be escaped outside AND inside the highlight span
  assert.equal(highlight('a<b', 'a'), '<span class="hl">a</span>&lt;b');
});

// ─────────────────────────────────────────────
// displayName
// ─────────────────────────────────────────────

test('displayName: key with pipe returns part after pipe', () => {
  assert.equal(displayName('root|sub'), 'sub');
});

test('displayName: key without pipe returns full key', () => {
  assert.equal(displayName('mychart'), 'mychart');
});

// ─────────────────────────────────────────────
// dirOf
// ─────────────────────────────────────────────

test('dirOf: path with directory', () => {
  assert.equal(dirOf('foo/bar/baz.yaml'), 'foo/bar');
});

test('dirOf: path without slash', () => {
  assert.equal(dirOf('chart.yaml'), '');
});

test('dirOf: nested path', () => {
  assert.equal(dirOf('a/b/c/d.yaml'), 'a/b/c');
});

// ─────────────────────────────────────────────
// buildChartTree
// ─────────────────────────────────────────────

// Mock parseYaml using JSON so test fixtures are easy to write
function mockParse(str) {
  return JSON.parse(str);
}

function jsonStr(obj) {
  return JSON.stringify(obj);
}

test('buildChartTree: throws when no Chart.yaml in fileMap', () => {
  assert.throws(
    () => buildChartTree({'values.yaml': jsonStr({})}, mockParse),
    /No Chart\.yaml found/
  );
});

test('buildChartTree: single chart, no subcharts', () => {
  const fileMap = {
    'Chart.yaml': jsonStr({name: 'myapp', version: '1.0.0', description: 'A simple app'}),
    'values.yaml': jsonStr({replicaCount: 2}),
  };
  const tree = buildChartTree(fileMap, mockParse);
  assert.equal(tree.root, 'myapp');
  assert.ok(tree.entries['myapp']);
  assert.equal(tree.entries['myapp'].name, 'myapp');
  assert.equal(tree.entries['myapp'].version, '1.0.0');
  assert.deepEqual(tree.entries['myapp'].dependencies, []);
  assert.deepEqual(tree.data['myapp'], {replicaCount: 2});
});

test('buildChartTree: root + one subchart discovered from charts/ subdir', () => {
  const fileMap = {
    'Chart.yaml': jsonStr({name: 'parent', version: '0.1.0'}),
    'values.yaml': jsonStr({foo: 'bar'}),
    'charts/child/Chart.yaml': jsonStr({name: 'child', version: '0.2.0'}),
    'charts/child/values.yaml': jsonStr({baz: 1}),
  };
  const tree = buildChartTree(fileMap, mockParse);
  assert.equal(tree.root, 'parent');
  // parent entry exists and lists namespaced child dependency
  assert.ok(tree.entries['parent']);
  assert.ok(tree.entries['parent|child']);
  assert.ok(tree.entries['parent'].dependencies.includes('parent|child'));
});

test('buildChartTree: subchart namespaced key displayName equals bare chart name', () => {
  const fileMap = {
    'Chart.yaml': jsonStr({name: 'root'}),
    'charts/sub/Chart.yaml': jsonStr({name: 'sub'}),
  };
  const tree = buildChartTree(fileMap, mockParse);
  assert.equal(displayName('root|sub'), 'sub');
});

test('buildChartTree: deps from Chart.yaml dependencies array merged (no duplicates)', () => {
  // The root Chart.yaml lists 'child' as a dependency AND it also exists in charts/ subdir
  const fileMap = {
    'Chart.yaml': jsonStr({
      name: 'root',
      dependencies: [{name: 'child', version: '1.0.0'}],
    }),
    'charts/child/Chart.yaml': jsonStr({name: 'child', version: '1.0.0'}),
    'charts/child/values.yaml': jsonStr({x: 1}),
  };
  const tree = buildChartTree(fileMap, mockParse);
  const rootDeps = tree.entries['root'].dependencies;
  const uniqueDeps = [...new Set(rootDeps)];
  assert.deepEqual(rootDeps, uniqueDeps, 'dependencies should not contain duplicates');
  assert.ok(rootDeps.includes('root|child'));
});

test('buildChartTree: values.yaml parsed and stored in data', () => {
  const fileMap = {
    'Chart.yaml': jsonStr({name: 'app'}),
    'values.yaml': jsonStr({image: {tag: 'latest'}, port: 8080}),
  };
  const tree = buildChartTree(fileMap, mockParse);
  assert.deepEqual(tree.data['app'], {image: {tag: 'latest'}, port: 8080});
});

test('buildChartTree: rootFallback used when Chart.yaml has no name field', () => {
  const fileMap = {
    'Chart.yaml': jsonStr({version: '0.1.0'}),
  };
  const tree = buildChartTree(fileMap, mockParse, 'myfallback');
  assert.equal(tree.root, 'myfallback');
  assert.ok(tree.entries['myfallback']);
});

// ─────────────────────────────────────────────
// setNestedPath
// ─────────────────────────────────────────────

test('setNestedPath: sets a top-level key', () => {
  const obj = {port: 80};
  setNestedPath(obj, 'port', 9090);
  assert.equal(obj.port, 9090);
});

test('setNestedPath: sets a nested key', () => {
  const obj = {service: {port: 80}};
  setNestedPath(obj, 'service.port', 8080);
  assert.equal(obj.service.port, 8080);
});

test('setNestedPath: creates intermediate objects when missing', () => {
  const obj = {};
  setNestedPath(obj, 'a.b.c', 'hello');
  assert.equal(obj.a.b.c, 'hello');
});

test('setNestedPath: sets deeply nested key without disturbing siblings', () => {
  const obj = {image: {tag: 'latest', repository: 'nginx'}};
  setNestedPath(obj, 'image.tag', 'v1.2.3');
  assert.equal(obj.image.tag, 'v1.2.3');
  assert.equal(obj.image.repository, 'nginx');
});

test('setNestedPath: does nothing when path traverses a non-object', () => {
  const obj = {a: 'string'};
  setNestedPath(obj, 'a.b', 'value');
  // 'a' is a string, so traversal stops — original value unchanged
  assert.equal(obj.a, 'string');
});

test('setNestedPath: overwrites existing nested object with scalar', () => {
  const obj = {service: {port: 80, type: 'ClusterIP'}};
  setNestedPath(obj, 'service.type', 'NodePort');
  assert.equal(obj.service.type, 'NodePort');
  assert.equal(obj.service.port, 80);
});

// ─────────────────────────────────────────────
// coerceValue
// ─────────────────────────────────────────────

test('coerceValue: coerces to number when original is number', () => {
  assert.equal(coerceValue('42', 100), 42);
});

test('coerceValue: returns string when original is number but input is not numeric', () => {
  assert.equal(coerceValue('abc', 100), 'abc');
});

test('coerceValue: coerces "true" to boolean true when original is boolean', () => {
  assert.equal(coerceValue('true', false), true);
});

test('coerceValue: coerces "false" to boolean false when original is boolean', () => {
  assert.equal(coerceValue('false', true), false);
});

test('coerceValue: returns string when original is boolean but input is not true/false', () => {
  assert.equal(coerceValue('yes', true), 'yes');
});

test('coerceValue: coerces "null" string to null when original is null', () => {
  assert.equal(coerceValue('null', null), null);
});

test('coerceValue: returns plain string when original is string', () => {
  assert.equal(coerceValue('hello', 'world'), 'hello');
});

test('coerceValue: returns plain string when original is undefined', () => {
  assert.equal(coerceValue('hello', undefined), 'hello');
});

test('coerceValue: coerces integer string to number, preserves zero', () => {
  assert.equal(coerceValue('0', 5), 0);
});

test('coerceValue: coerces float string to number', () => {
  assert.equal(coerceValue('3.14', 1.0), 3.14);
});

// ─────────────────────────────────────────────
// Additional flatten tests
// ─────────────────────────────────────────────

const {describe} = require('node:test');

describe('flatten: additional cases', () => {
  test('deeply nested object 3 levels', () => {
    const out = [];
    flatten({a: {b: {c: 42}}}, '', out);
    assert.equal(out.length, 1);
    assert.equal(out[0].path, 'a.b.c');
    assert.equal(out[0].val, '42');
    assert.equal(out[0].type, 'num');
  });

  test('mixed array of objects', () => {
    const out = [];
    flatten({ports: [{name: 'http', port: 80}]}, '', out);
    const paths = out.map(e => e.path);
    assert.ok(paths.includes('ports[0].name'), 'expected ports[0].name');
    assert.ok(paths.includes('ports[0].port'), 'expected ports[0].port');
    const nameEntry = out.find(e => e.path === 'ports[0].name');
    const portEntry = out.find(e => e.path === 'ports[0].port');
    assert.equal(nameEntry.val, 'http');
    assert.equal(portEntry.val, '80');
    assert.equal(portEntry.type, 'num');
  });

  test('boolean false value', () => {
    const out = [];
    flatten({enabled: false}, '', out);
    assert.equal(out.length, 1);
    assert.equal(out[0].path, 'enabled');
    assert.equal(out[0].val, 'false');
    assert.equal(out[0].type, 'bool');
  });

  test('null value in nested path', () => {
    const out = [];
    flatten({config: {key: null}}, '', out);
    assert.equal(out.length, 1);
    assert.equal(out[0].path, 'config.key');
    assert.equal(out[0].val, null);
    assert.equal(out[0].type, 'null');
  });
});

// ─────────────────────────────────────────────
// Additional setNestedPath tests
// ─────────────────────────────────────────────

describe('setNestedPath: additional cases', () => {
  test('overwrites existing nested value', () => {
    const obj = {a: {b: 1}};
    setNestedPath(obj, 'a.b', 2);
    assert.equal(obj.a.b, 2);
  });

  test('single key with no dots', () => {
    const obj = {};
    setNestedPath(obj, 'port', 8080);
    assert.equal(obj.port, 8080);
  });
});

// ─────────────────────────────────────────────
// Additional coerceValue tests
// ─────────────────────────────────────────────

describe('coerceValue: additional cases', () => {
  test('empty string with string original returns empty string', () => {
    assert.equal(coerceValue('', 'hello'), '');
  });

  test('"null" input always returns null regardless of original type', () => {
    assert.equal(coerceValue('null', 'something'), null);
  });

  test('"maybe" with boolean original falls back to string', () => {
    assert.equal(coerceValue('maybe', true), 'maybe');
  });
});

// ─────────────────────────────────────────────
// Additional highlight tests
// ─────────────────────────────────────────────

describe('highlight: additional cases', () => {
  test('query appears multiple times wraps both occurrences', () => {
    const result = highlight('port portforward', 'port');
    assert.equal(
      result,
      '<span class="hl">port</span> <span class="hl">port</span>forward'
    );
  });

  test('empty query returns escaped input', () => {
    assert.equal(highlight('<b>', ''), '&lt;b&gt;');
  });
});

// ─────────────────────────────────────────────
// Additional buildChartTree tests
// ─────────────────────────────────────────────

describe('buildChartTree: additional cases', () => {
  test('root with no values.yaml but has subcharts is still built', () => {
    const fileMap = {
      'Chart.yaml': jsonStr({name: 'rootchart', version: '1.0.0'}),
      'charts/sub/Chart.yaml': jsonStr({name: 'sub', version: '0.1.0'}),
      'charts/sub/values.yaml': jsonStr({key: 'val'}),
    };
    const tree = buildChartTree(fileMap, mockParse);
    assert.equal(tree.root, 'rootchart');
    assert.ok(tree.entries['rootchart'], 'root entry should exist');
    assert.equal(tree.entries['rootchart'].values_file, undefined, 'root should have no values_file');
    assert.ok(tree.entries['rootchart|sub'], 'subchart entry should exist');
  });

  test('subchart whose name comes from directory when Chart.yaml has no name field', () => {
    const fileMap = {
      'Chart.yaml': jsonStr({name: 'parent', version: '1.0.0'}),
      'charts/mysubdir/Chart.yaml': jsonStr({version: '0.5.0'}),
    };
    const tree = buildChartTree(fileMap, mockParse);
    const subKey = Object.keys(tree.entries).find(k => k !== 'parent');
    assert.ok(subKey, 'a subchart entry should exist');
    assert.equal(displayName(subKey), 'mysubdir');
  });
});

// ─────────────────────────────────────────────
// getNestedVal
// ─────────────────────────────────────────────

test('getNestedVal: top-level key exists returns value', () => {
  const obj = {port: 8080};
  assert.equal(getNestedVal(obj, 'port'), 8080);
});

test('getNestedVal: nested key two levels returns value', () => {
  const obj = {service: {port: 3000}};
  assert.equal(getNestedVal(obj, 'service.port'), 3000);
});

test('getNestedVal: deeply nested three levels returns value', () => {
  const obj = {a: {b: {c: 'deep'}}};
  assert.equal(getNestedVal(obj, 'a.b.c'), 'deep');
});

test('getNestedVal: non-existent key returns undefined', () => {
  const obj = {a: 1};
  assert.equal(getNestedVal(obj, 'z'), undefined);
});

test('getNestedVal: path through null returns undefined', () => {
  const obj = {a: null};
  assert.equal(getNestedVal(obj, 'a.b'), undefined);
});

test('getNestedVal: path through a string (non-object) returns undefined', () => {
  const obj = {a: 'hello'};
  assert.equal(getNestedVal(obj, 'a.b'), undefined);
});

test('getNestedVal: single key on empty object returns undefined', () => {
  assert.equal(getNestedVal({}, 'missing'), undefined);
});

test('getNestedVal: array value at path returns the array', () => {
  const arr = [1, 2, 3];
  const obj = {items: arr};
  assert.deepEqual(getNestedVal(obj, 'items'), arr);
});

test('getNestedVal: explicit undefined value at key returns undefined', () => {
  const obj = {a: undefined};
  assert.equal(getNestedVal(obj, 'a'), undefined);
});

test('getNestedVal: number value at path returns number', () => {
  const obj = {metrics: {count: 42}};
  assert.equal(getNestedVal(obj, 'metrics.count'), 42);
});

test('getNestedVal: bracket notation reads array element', () => {
  const obj = {env: ['a', 'b', 'c']};
  assert.equal(getNestedVal(obj, 'env[1]'), 'b');
});

test('getNestedVal: nested bracket notation reads deep array element', () => {
  const obj = {global: {env: ['x', 'y']}};
  assert.equal(getNestedVal(obj, 'global.env[0]'), 'x');
});

test('getNestedVal: bracket then dot reads object inside array', () => {
  const obj = {items: [{name: 'foo'}, {name: 'bar'}]};
  assert.equal(getNestedVal(obj, 'items[1].name'), 'bar');
});

test('setNestedPath: bracket notation sets array element', () => {
  const obj = {env: ['a', 'b', 'c']};
  setNestedPath(obj, 'env[1]', 'CHANGED');
  assert.equal(obj.env[1], 'CHANGED');
  assert.equal(obj.env[0], 'a');
});

test('setNestedPath: nested bracket notation sets deep array element', () => {
  const obj = {global: {env: ['x', 'y']}};
  setNestedPath(obj, 'global.env[0]', 'NEW');
  assert.equal(obj.global.env[0], 'NEW');
  assert.equal(obj.global.env[1], 'y');
});

test('setNestedPath: removes stale bracket key when setting array element', () => {
  // Simulate corruption: obj has both the real array and a stale literal-bracket key
  const obj = {global: {env: ['original', 'b'], 'env[0]': 'stale'}};
  setNestedPath(obj, 'global.env[0]', 'NEW');
  assert.equal(obj.global.env[0], 'NEW');       // real array updated
  assert.equal(obj.global['env[0]'], undefined); // stale key removed
});

// ─────────────────────────────────────────────
// cleanStaleBracketKeys
// ─────────────────────────────────────────────

test('cleanStaleBracketKeys: removes stale top-level bracket key', () => {
  const obj = {env: ['a', 'b'], 'env[0]': 'stale'};
  cleanStaleBracketKeys(obj);
  assert.deepEqual(Object.keys(obj), ['env']);
  assert.deepEqual(obj.env, ['a', 'b']);
});

test('cleanStaleBracketKeys: removes stale nested bracket key', () => {
  const obj = {global: {env: ['x', 'y'], 'env[1]': 'STALE'}};
  cleanStaleBracketKeys(obj);
  assert.equal(obj.global['env[1]'], undefined);
  assert.deepEqual(obj.global.env, ['x', 'y']);
});

test('cleanStaleBracketKeys: leaves non-stale bracket-looking keys alone', () => {
  // key "env[0]" exists but there is no "env" array sibling → not stale, keep it
  const obj = {'env[0]': 'keep'};
  cleanStaleBracketKeys(obj);
  assert.equal(obj['env[0]'], 'keep');
});

test('cleanStaleBracketKeys: is a no-op on clean objects', () => {
  const obj = {global: {env: ['a', 'b'], other: 'val'}};
  cleanStaleBracketKeys(obj);
  assert.deepEqual(obj.global.env, ['a', 'b']);
  assert.equal(obj.global.other, 'val');
});

// ─────────────────────────────────────────────
// valChanged
// ─────────────────────────────────────────────

test('valChanged: same string returns false', () => {
  assert.equal(valChanged('hello', 'hello'), false);
});

test('valChanged: different string returns true', () => {
  assert.equal(valChanged('hello', 'world'), true);
});

test('valChanged: same number returns false', () => {
  assert.equal(valChanged(42, 42), false);
});

test('valChanged: number vs string of that number returns false', () => {
  // String(42) === "42" and String("42") === "42"
  assert.equal(valChanged(42, '42'), false);
});

test('valChanged: null vs null returns false', () => {
  assert.equal(valChanged(null, null), false);
});

test('valChanged: null vs string "null" returns false', () => {
  // null maps to "null", String("null") === "null"
  assert.equal(valChanged(null, 'null'), false);
});

test('valChanged: null vs some other value returns true', () => {
  assert.equal(valChanged(null, 'something'), true);
});

test('valChanged: true vs true returns false', () => {
  assert.equal(valChanged(true, true), false);
});

test('valChanged: true vs false returns true', () => {
  assert.equal(valChanged(true, false), true);
});

test('valChanged: undefined vs undefined returns false', () => {
  // undefined === null is false, so String(undefined) = "undefined" for both sides
  assert.equal(valChanged(undefined, undefined), false);
});
