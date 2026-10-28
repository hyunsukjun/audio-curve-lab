import assert from 'node:assert/strict';
import {createSourceLoadGate, fetchDefaultSource, DEFAULT_SOURCE_NAME} from '../src/default-source.js';

const realFetch = globalThis.fetch;
const gate = createSourceLoadGate();
const first = gate.begin(), second = gate.begin();
assert.equal(first.current(), false);
assert.equal(first.signal.aborted, true);
assert.equal(second.current(), true);
gate.cancel();
assert.equal(second.current(), false);
assert.equal(second.signal.aborted, true);
try {
  globalThis.fetch = async () => ({ok:true, arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer});
  const file = await fetchDefaultSource(gate.begin().signal);
  assert.equal(file.name, DEFAULT_SOURCE_NAME);
  assert.equal(file.type, 'audio/mpeg');
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [1,2,3]);
  globalThis.fetch = async () => ({ok:false, status:404});
  await assert.rejects(fetchDefaultSource(gate.begin().signal), /Default sample is unavailable/);
  let release;
  globalThis.fetch = async () => ({ok:true, arrayBuffer:()=>new Promise(resolve=>release=resolve)});
  const request = gate.begin();
  const pending = fetchDefaultSource(request.signal);
  await Promise.resolve();
  gate.begin();
  release(new ArrayBuffer(4));
  await assert.rejects(pending, {name:'AbortError'});
  // A stalled fetch must be bounded, including in a tab with no user gesture.
  const realSet = globalThis.setTimeout, realClear = globalThis.clearTimeout;
  let timeout;
  globalThis.setTimeout = (fn, ms) => { assert.equal(ms,15000); timeout=fn; return 7; };
  globalThis.clearTimeout = () => {};
  try {
    globalThis.fetch = async (_url,{signal}) => new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true}));
    const stalled=fetchDefaultSource(gate.begin().signal);
    timeout();
    await assert.rejects(stalled,{name:'AbortError'});
  } finally { globalThis.setTimeout=realSet; globalThis.clearTimeout=realClear; }
} finally { globalThis.fetch=realFetch; }
console.log('PASS default source: latest owner, cancel, File bytes, failed HTTP, aborted body and stalled fetch timeout');
