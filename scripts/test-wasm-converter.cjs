// Smoke-test the real worker with generated tones, without external audio samples.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

function metadata(bytes) {
  const found = {};
  function walk(start, end) {
    for (let offset = start; offset + 8 <= end;) {
      const size = bytes.readUInt32BE(offset);
      const name = bytes.toString('ascii', offset + 4, offset + 8);
      assert.ok(size >= 8 && offset + size <= end, `Invalid ${name} atom`);
      const payload = bytes.subarray(offset + 8, offset + size);
      if (['mdhd', 'stts', 'mp4a', 'esds'].includes(name)) found[name] = payload;
      if (['moov', 'trak', 'mdia', 'minf', 'stbl'].includes(name)) walk(offset + 8, offset + size);
      if (name === 'stsd') walk(offset + 16, offset + size);
      if (name === 'mp4a') walk(offset + 36, offset + size);
      offset += size;
    }
  }
  walk(0, bytes.length);
  assert.equal(found.mdhd[0], 0);
  const durations = [];
  for (let i = 0; i < found.stts.readUInt32BE(4); i++) {
    durations.push([found.stts.readUInt32BE(8 + i * 8), found.stts.readUInt32BE(12 + i * 8)]);
  }
  // ES_Descriptor -> DecoderConfigDescriptor -> DecoderSpecificInfo (ASC).
  const esds = found.esds;
  function descriptor(offset, tag) {
    assert.equal(esds[offset++], tag);
    let size = 0, byte;
    do { byte = esds[offset++]; size = (size << 7) | (byte & 127); } while (byte & 128);
    return { offset, size };
  }
  const es = descriptor(4, 3);
  assert.equal(esds[es.offset + 2], 0); // no optional ES flags
  const config = descriptor(es.offset + 3, 4);
  const specific = descriptor(config.offset + 13, 5);
  const gapless = bytes.toString('latin1').match(/ ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{16})/);
  assert.ok(gapless);
  return {
    timescale: found.mdhd.readUInt32BE(12),
    duration: found.mdhd.readUInt32BE(16),
    sampleEntryRate: found.mp4a.readUInt32BE(24) >>> 16,
    channels: found.mp4a.readUInt16BE(16),
    durations,
    asc: esds.subarray(specific.offset, specific.offset + specific.size).toString('hex'),
    gapless: gapless.slice(1).map(value => BigInt('0x' + value).toString()),
  };
}

function writeWav(filename, pcm, settings) {
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.byteLength, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(settings.channels, 22);
  header.writeUInt32LE(settings.sampleRate, 24); header.writeUInt32LE(settings.sampleRate * settings.channels * 2, 28);
  header.writeUInt16LE(settings.channels * 2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.byteLength, 40);
  fs.writeFileSync(filename, Buffer.concat([header, Buffer.from(pcm.buffer)]));
}

async function main() {
  const frontend = process.argv[3] && path.resolve(process.argv[3]);
  const wasmDir = path.resolve(process.argv[2] || 'docs/public/wasm');
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faac-wasm-smoke-'));
  // Emscripten emits CommonJS; isolate it from this site's type: module package.
  const modulePath = path.join(outputDir, 'faac.cjs');
  fs.copyFileSync(path.join(wasmDir, 'faac.js'), modulePath);
  const createModule = require(modulePath);
  const wasmBinary = fs.readFileSync(path.join(wasmDir, 'faac.wasm'));
  const workerSource = fs.readFileSync(path.join(__dirname, '../docs/public/wasm/faac-worker.js'), 'utf8');
  const cases = [
    { objectType: 'lc', channels: 1, sampleRate: 44100, bitrate: 96, samples: 44117 },
    { objectType: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'he-v1', channels: 1, sampleRate: 44100, bitrate: 48, samples: 44117 },
    { objectType: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 48123 },
    { objectType: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 123 },
    { objectType: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 123 },
    { objectType: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 49152 },
    { objectType: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 49152 },
  ];
  for (const settings of cases) {
    const pcm = new Int16Array(settings.samples * settings.channels);
    for (let i = 0; i < settings.samples; i++) {
      for (let ch = 0; ch < settings.channels; ch++) {
        pcm[i * settings.channels + ch] = Math.round(12000 * Math.sin(2 * Math.PI * (440 + ch * 220) * i / settings.sampleRate));
      }
    }
    const messages = [];
    let imported;
    const self = {
      location: { href: 'https://example.test/fork/wasm/faac-worker.js' },
      postMessage(message) { messages.push(message); },
    };
    const context = vm.createContext({
      self, URL, Int16Array,
      importScripts(url) {
        imported = url;
        self.FAACModule = () => createModule({ wasmBinary });
      },
    });
    vm.runInContext(workerSource, context);
    await self.onmessage({ data: { ...settings, pcm16Data: pcm.buffer } });
    assert.equal(imported, 'https://example.test/fork/wasm/faac.js');
    assert.equal(messages.find(message => message.type === 'error'), undefined,
                 JSON.stringify(messages.find(message => message.type === 'error')));
    const progress = messages.filter(message => message.type === 'progress').map(message => message.progress);
    assert.ok(progress.every((value, index) => value >= 15 && value < 100 && (!index || value >= progress[index - 1])), 'Progress must be monotonic and reserve completion for the finished file');
    assert.equal(progress.at(-1), 98, 'Finalization has its own progress stage');
    const result = messages.find(message => message.type === 'complete');
    assert.ok(result, 'Worker must complete encoding');
    const bytes = Buffer.from(result.encodedBytes);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
    for (const atom of ['mdat', 'moov', 'esds']) assert.ok(bytes.includes(Buffer.from(atom)), atom);
    // iTunSMPB must retain the true source count, including partial final frames.
    const text = bytes.toString('latin1');
    const gapless = text.match(/ ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{16})/);
    assert.ok(gapless, 'Gapless metadata must be present');
    const divisor = settings.objectType === 'he-v1' ? 2 : 1;
    assert.equal(parseInt(gapless[4], 16), Math.floor((settings.samples + Math.floor(divisor / 2)) / divisor));
    assert.ok(parseInt(gapless[2], 16) > 0, 'Encoder priming must be recorded');
    const name = `${settings.objectType}-${settings.channels}ch-${settings.samples}.m4a`;
    fs.writeFileSync(path.join(outputDir, name), bytes);
    const fields = metadata(bytes);
    assert.equal(fields.timescale, Math.round(settings.sampleRate / divisor));
    assert.equal(fields.sampleEntryRate, fields.timescale);
    assert.equal(fields.channels, settings.channels);
    assert.ok(fields.durations.every(([count, duration]) => count > 0 && duration === 1024));
    assert.equal(fields.duration, fields.durations.reduce((sum, [count, duration]) => sum + count * duration, 0));
    const wavPath = path.join(outputDir, name + '.wav');
    writeWav(wavPath, pcm, settings);
    if (frontend) {
      const cliPath = path.join(outputDir, name + '.cli.m4a');
      execFileSync(frontend, ['--object-type', divisor === 2 ? 'he-aac-v1' : 'lc', '-b', String(settings.bitrate), '-o', cliPath, wavPath], { stdio: 'pipe' });
      assert.deepEqual(fields, metadata(fs.readFileSync(cliPath)), 'WASM metadata must match the native frontend, including ASC and gapless fields');
    }
    console.log(`PASS ${name} (${bytes.length} bytes; FAAC ${result.version})`);
  }
  // Invalid settings must return the library's specific error, not fake success.
  const messages = [];
  const self = { FAACModule: () => createModule({ wasmBinary }), postMessage: message => messages.push(message) };
  vm.runInNewContext(workerSource, { self, URL, Int16Array });
  await self.onmessage({ data: { sampleRate: 100, channels: 2, bitrate: 128, objectType: 'lc', pcm16Data: new Int16Array(246).buffer } });
  const error = messages.find(message => message.type === 'error');
  assert.ok(error && error.message.startsWith('Opening encoder: '), 'Invalid settings must produce a specific encoder error');
  assert.ok(!messages.some(message => message.type === 'complete'));
  console.log('PASS invalid configuration reports a specific error');
  console.log(`Outputs: ${outputDir}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
