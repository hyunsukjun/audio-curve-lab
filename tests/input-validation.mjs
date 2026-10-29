import assert from "node:assert/strict";
import { validateAudioBuffer } from "../src/audio-import.js";
function buffer(channels = [new Float32Array([0, -0, .25, -1, 1, 4])]) {
  return { length: channels[0].length, sampleRate: 48000, duration: channels[0].length / 48000,
    numberOfChannels: channels.length, getChannelData: channel => channels[channel], copyFromChannel: (out, channel, start = 0) => out.set(channels[channel].subarray(start, start + out.length)) };
}
const source = buffer();
const before = new Uint8Array(source.getChannelData(0).buffer).slice();
assert.equal(await validateAudioBuffer(source), source);
assert.deepEqual(new Uint8Array(source.getChannelData(0).buffer), before, "no sample, gain or signed-zero changes");
for (const value of [NaN, Infinity, -Infinity]) {
  const channels = [new Float32Array(131073), new Float32Array(131073)];
  channels[1][131072] = value;
  await assert.rejects(validateAudioBuffer(buffer(channels)), /invalid audio samples/);
}
for (const patch of [{length: 0}, {numberOfChannels: 0}, {sampleRate: 0}, {sampleRate: NaN}, {duration: 0}, {duration: Infinity}, {length: 1.5}, {copyFromChannel: undefined}]) {
  await assert.rejects(validateAudioBuffer({...source, ...patch}), /empty or invalid/);
}
await assert.rejects(validateAudioBuffer({...source, copyFromChannel: () => { throw new Error("decoder read failure"); }}), /decoder read failure/);
const controller = new AbortController();controller.abort();
await assert.rejects(validateAudioBuffer(source, {signal: controller.signal}), {name: "AbortError"});
await assert.rejects(validateAudioBuffer(source, {isCurrent: () => false}), {name: "AbortError"});
let current = true, reads = 0;
await assert.rejects(validateAudioBuffer({...source, copyFromChannel: (out, channel, start) => { reads++;current = false;source.copyFromChannel(out, channel, start); }}, {isCurrent: () => current}), {name: "AbortError"});
assert.equal(reads, 1);
await validateAudioBuffer({...source, getChannelData: () => { throw new Error("mutable readback must not be used"); }});
await validateAudioBuffer(buffer([new Float32Array(3)])); // silence is valid, not a normalization target.
console.log("PASS: input boundary retains finite PCM; rejects nonfinite/all-channel tail, invalid/empty metadata and stale/aborted requests");
