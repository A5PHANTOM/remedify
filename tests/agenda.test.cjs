const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/lib/agenda.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const compiledModule = { exports: {} };
new Function('exports', 'require', 'module', compiled)(compiledModule.exports, require, compiledModule);
const { groupAgenda } = compiledModule.exports;
const now = new Date(2026, 10, 9, 12).getTime();
const task = (id, day, hour = 10, status = 'open') => ({ id, title: id, dueAt: new Date(2026, 10, day, hour), status });
test('all future dates remain visible and sorted behind pending tasks', () => {
 const groups = groupAgenda([task('later', 12), task('tomorrow', 10), task('old', 7), task('today', 9, 16)], now);
 assert.deepEqual(groups.map(g => g.items[0].id), ['old', 'today', 'tomorrow', 'later']);
 assert.deepEqual(groups.slice(0, 3).map(g => g.label), ['Pending', 'Today', 'Tomorrow']);
});
test('passing the deadline makes an open task pending without mutating it', () => {
 const item = task('deadline', 9, 13);
 assert.equal(groupAgenda([item], now)[0].pending, false);
 assert.equal(groupAgenda([item], now + 3600001)[0].pending, true);
 assert.equal(item.status, 'open');
});
test('completion removes overdue priority and reopening restores it', () => {
 const done = task('old', 7, 10, 'done');
 assert.equal(groupAgenda([done], now)[0].label, 'Completed');
 assert.equal(groupAgenda([{ ...done, status: 'open' }], now)[0].label, 'Pending');
});
test('tomorrow is correct across a year boundary', () => {
 const groups = groupAgenda([{ id: 'next-year', status: 'open', dueAt: new Date(2027, 0, 1, 8) }], +new Date(2026, 11, 31, 23));
 assert.equal(groups[0].label, 'Tomorrow');
});
