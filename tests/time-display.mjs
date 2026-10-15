import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/app.js', import.meta.url),'utf8');
const name = 'formatClock';
const start = source.indexOf(`function ${name}(seconds) {`);
assert.ok(start >= 0);
const end = source.indexOf('\n}', start)+2;
const context = vm.createContext({});
vm.runInContext(source.slice(start,end),context);
for (const [seconds,expected] of [[0,'00:00.00'],[8,'00:08.00'],[59.99,'00:59.99'],[59.999,'01:00.00'],[3599.999,'60:00.00'],[600,'10:00.00'],[-1,'00:00.00'],[NaN,'00:00.00'],[Infinity,'00:00.00']]) {
  assert.equal(context[name](seconds),expected);
}
console.log('Clock formatting boundaries passed');
