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
  const isFloat = settings.sampleFormat === 'float';
  const formatTag = isFloat ? 3 : 1; // 3 = WAVE_FORMAT_FLOAT, 1 = WAVE_FORMAT_PCM
  const bitsPerSample = isFloat ? 32 : 16;
  const blockAlign = settings.channels * (bitsPerSample / 8);
  const byteRate = settings.sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF'); header.writeUInt32LE(36 + pcm.byteLength, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(formatTag, 20); header.writeUInt16LE(settings.channels, 22);
  header.writeUInt32LE(settings.sampleRate, 24); header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32); header.writeUInt16LE(bitsPerSample, 34);
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
  fs.copyFileSync(path.join(wasmDir, 'faac.wasm'), path.join(outputDir, 'faac.wasm'));
  const createModule = require(modulePath);
  const wasmBinary = fs.readFileSync(path.join(wasmDir, 'faac.wasm'));
  const workerSource = fs.readFileSync(path.join(__dirname, '../docs/public/wasm/faac-worker.js'), 'utf8');
  // A browser worker loads Emscripten once and handles multiple messages. Keep
  // one VM and module for the whole suite instead of recompiling WASM per case.
  const messages = [];
  let imported;
  let modulePromise;
  const self = {
    location: { href: 'https://example.test/fork/wasm/faac-worker.js' },
    postMessage(message) { messages.push(message); },
  };
  const context = vm.createContext({
    self, URL, Int16Array, Float32Array,
    setTimeout, clearTimeout,
    importScripts(url) {
      imported = url;
      self.FAACModule = () => {
        modulePromise ||= createModule({ wasmBinary });
        return modulePromise;
      };
    },
  });
  vm.runInContext(workerSource, context);
  const cases = [
    { objectType: 'auto', expectedResolved: 'he-v1', channels: 2, sampleRate: 44100, bitrate: 48, samples: 44117 },
    { objectType: 'auto', expectedResolved: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 1, sampleRate: 44100, bitrate: 96, samples: 44117 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 96000, sampleFormat: 'float', bitrate: 256, samples: 96000, expectedRate: 48000 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 1, sampleRate: 48000, bitrate: 18, samples: 48123, expectedRate: 32000 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 1, sampleRate: 48000, bitrate: 18, samples: 48121, expectedRate: 32000 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 96000, bitrate: 256, samples: 123, expectedRate: 48000 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 96000, bitrate: 256, samples: 96123, resampleRate: 'keep' },
    { objectType: 'lc', expectedResolved: 'lc', channels: 1, sampleRate: 48000, bitrate: 18, samples: 48123, resampleRate: 'keep' },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123, resampleRate: 44100, expectedRate: 44100 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 48123, resampleRate: 32000, expectedRate: 32000 },
    { objectType: 'lc', rateControl: 'vbr', quantQuality: 100, expectedRateControl: 'vbr', expectedQuality: 100, channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123, resampleRate: 24000, expectedRate: 24000 },
    { objectType: 'auto', channels: 2, sampleRate: 96000, bitrate: 128, samples: 96123, expectedRate: 48000 },
    { objectType: 'auto', channels: 1, sampleRate: 48000, bitrate: 18, samples: 48123 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 1, sampleRate: 48000, bitrate: 18, samples: 48123 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 1, sampleRate: 44100, bitrate: 48, samples: 44117 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 48123 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 123 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 123 },
    { objectType: 'lc', expectedResolved: 'lc', channels: 2, sampleRate: 48000, bitrate: 128, samples: 49152 },
    { objectType: 'he-v1', expectedResolved: 'he-v1', channels: 2, sampleRate: 48000, bitrate: 64, samples: 49152 },
    { objectType: 'lc', rateControl: 'vbr', quantQuality: 1, expectedRateControl: 'vbr', expectedQuality: 1, channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'lc', rateControl: 'vbr', quantQuality: 5000, expectedRateControl: 'vbr', expectedQuality: 5000, channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'he-v1', rateControl: 'vbr', quantQuality: 75, expectedResolved: 'he-v1', expectedRateControl: 'vbr', expectedQuality: 75, channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'lc', rateControl: 'abr', expectedRateControl: 'abr', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
    { objectType: 'lc', rateControl: 'cbr', expectedRateControl: 'cbr', channels: 2, sampleRate: 48000, bitrate: 128, samples: 48123 },
  ];
  for (const settings of cases) {
    messages.length = 0;
    const isFloat = settings.sampleFormat === 'float';
    const pcm = isFloat ? new Float32Array(settings.samples * settings.channels) : new Int16Array(settings.samples * settings.channels);
    for (let i = 0; i < settings.samples; i++) {
      for (let ch = 0; ch < settings.channels; ch++) {
        const val = Math.sin(2 * Math.PI * (440 + ch * 220) * i / settings.sampleRate);
        pcm[i * settings.channels + ch] = isFloat ? val * 0.5 : Math.round(12000 * val);
      }
    }
    const workerData = {
      ...settings,
      pcm16Data: !isFloat ? pcm.buffer : undefined,
      pcmFloatData: isFloat ? pcm.buffer : undefined,
    };
    await self.onmessage({ data: workerData });
    assert.equal(imported, 'https://example.test/fork/wasm/faac.js');
    assert.equal(messages.find(message => message.type === 'error'), undefined,
                 JSON.stringify(messages.find(message => message.type === 'error')));
    const progress = messages.filter(message => message.type === 'progress').map(message => message.progress);
    assert.ok(progress.every((value, index) => value >= 15 && value < 100 && (!index || value >= progress[index - 1])), 'Progress must be monotonic and reserve completion for the finished file');
    assert.equal(progress.at(-1), 98, 'Finalization has its own progress stage');
    const result = messages.find(message => message.type === 'complete');
    assert.ok(result, 'Worker must complete encoding');
    if (settings.expectedResolved) {
      assert.equal(result.resolvedObjectType, settings.expectedResolved, `Expected resolved profile ${settings.expectedResolved}`);
    }
    const expectedRateControl = settings.expectedRateControl || (settings.bitrate ? 'abr' : 'vbr');
    assert.equal(result.resolvedRateControl, expectedRateControl, `Expected ${expectedRateControl} rate control`);
    if (expectedRateControl === 'vbr') {
      assert.equal(result.resolvedBitrate, 0, 'VBR must not report a target bitrate');
      assert.equal(result.resolvedQuality, settings.expectedQuality ?? 100, 'VBR quality must be preserved');
    } else {
      assert.equal(result.resolvedBitrate, settings.bitrate * 1000, 'Resolved whole-stream bitrate must match the requested target');
    }
    const bytes = Buffer.from(result.encodedBytes);
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
    for (const atom of ['mdat', 'moov', 'esds']) assert.ok(bytes.includes(Buffer.from(atom)), atom);
    // iTunSMPB must retain the true source count, including partial final frames.
    const text = bytes.toString('latin1');
    const gapless = text.match(/ ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{8}) ([0-9A-Fa-f]{16})/);
    assert.ok(gapless, 'Gapless metadata must be present');
    const effectiveObjectType = result.resolvedObjectType || settings.objectType;
    const divisor = effectiveObjectType === 'he-v1' ? 2 : 1;
    const outRate = settings.expectedRate || settings.sampleRate;
    assert.equal(result.resolvedSampleRate, outRate, 'Resolved output rate');
    const expectedSource = Math.ceil(settings.samples * outRate / settings.sampleRate);
    const expectedCount = Math.floor((expectedSource + Math.floor(divisor / 2)) / divisor);
    // Resampling may differ from the ideal ratio by a frame or two.
    assert.ok(Math.abs(parseInt(gapless[4], 16) - expectedCount) <= 0, 'Gapless sample count (faar guarantees ceil(in * out / in_rate))');
    const rateText = outRate === settings.sampleRate ? `, ${outRate}Hz,` : `, ${settings.sampleRate}Hz->${outRate}Hz,`;
    assert.ok(result.encoderTag.startsWith(`FAAC ${result.version}, `) && result.encoderTag.includes(rateText) && /, cutoff \d+Hz, (LC|HE v1)$/.test(result.encoderTag), result.encoderTag);
    assert.ok(bytes.includes(Buffer.from(result.encoderTag)), 'Encoder tag must be written to the file');
    assert.ok(parseInt(gapless[2], 16) > 0, 'Encoder priming must be recorded');
    const name = `${settings.objectType}-${settings.channels}ch-${settings.samples}.m4a`;
    fs.writeFileSync(path.join(outputDir, name), bytes);
    const fields = metadata(bytes);
    assert.equal(fields.timescale, Math.round(outRate / divisor));
    assert.equal(fields.sampleEntryRate, Math.min(65535, fields.timescale));
    assert.equal(fields.channels, settings.channels);
    assert.ok(fields.durations.every(([count, duration]) => count > 0 && duration === 1024));
    assert.equal(fields.duration, fields.durations.reduce((sum, [count, duration]) => sum + count * duration, 0));
    const wavPath = path.join(outputDir, name + '.wav');
    if (frontend) {
      writeWav(wavPath, pcm, settings);
      const cliPath = path.join(outputDir, name + '.cli.m4a');
      const rateArgs = expectedRateControl === 'vbr'
        ? ['-q', String(settings.expectedQuality ?? 100)]
        : ['-b', String(settings.bitrate), ...(expectedRateControl === 'cbr' ? ['--cbr'] : [])];
      execFileSync(frontend, ['--object-type', divisor === 2 ? 'he-aac-v1' : 'lc', ...rateArgs, '-o', cliPath, wavPath], { stdio: 'pipe' });
      assert.deepEqual(fields, metadata(fs.readFileSync(cliPath)), 'WASM metadata must match the native frontend, including ASC and gapless fields');
    }
    console.log(`PASS ${name} (${bytes.length} bytes; FAAC ${result.version})`);
  }
  // Tags carry over from an M4A source; regenerated and stale values do not.
  {
    const box = (name, ...parts) => {
      const body = Buffer.concat(parts);
      const header = Buffer.alloc(8);
      header.writeUInt32BE(body.length + 8); header.write(name, 4, 'latin1');
      return Buffer.concat([header, body]);
    };
    const data = (type, payload) => box('data', Buffer.from([0, 0, 0, type, 0, 0, 0, 0]), payload);
    const text = (key, value) => box(key, data(1, Buffer.from(value)));
    const free = (name, value) => box('----', box('mean', Buffer.alloc(4), Buffer.from('com.apple.iTunes')),
      box('name', Buffer.alloc(4), Buffer.from(name)), data(1, Buffer.from(value)));
    const ilst = box('ilst',
      text('\xa9nam', 'Smoke Title'), text('\xa9ART', 'Smoke Artist'), text('\xa9too', 'Old Encoder 1.0'),
      box('trkn', data(0, Buffer.from([0, 0, 0, 3, 0, 9, 0, 0]))),
      box('covr', data(13, Buffer.from([0xff, 0xd8, 0xff, 0xd9]))),
      free('MYTAG', 'kept'), free('iTunSMPB', ' 00000000 00000000 00000000 0000000000000001'));
    const udta = box('udta', box('meta', Buffer.alloc(4), ilst));
    const pcm = new Int16Array(48000 * 2);
    for (let i = 0; i < 48000; i++) pcm[2 * i] = pcm[2 * i + 1] = Math.round(8000 * Math.sin(i / 20));
    const base = { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', pcm16Data: pcm.buffer.slice(0) };
    messages.length = 0;
    await self.onmessage({ data: base });
    const plain = Buffer.from(messages.find(m => m.type === 'complete').encodedBytes);
    // moov is the last top-level atom in the progressive output; append udta inside it.
    let moovAt = 0;
    while (plain.toString('ascii', moovAt + 4, moovAt + 8) !== 'moov') moovAt += plain.readUInt32BE(moovAt);
    assert.equal(moovAt + plain.readUInt32BE(moovAt), plain.length, 'Test source needs moov last');
    const source = Buffer.concat([plain, udta]);
    source.writeUInt32BE(plain.readUInt32BE(moovAt) + udta.length, moovAt);
    messages.length = 0;
    await self.onmessage({ data: { ...base, pcm16Data: pcm.buffer.slice(0), sourceM4a: source.buffer.slice(source.byteOffset, source.byteOffset + source.length) } });
    assert.equal(messages.find(m => m.type === 'error'), undefined);
    const tagged = Buffer.from(messages.find(m => m.type === 'complete').encodedBytes);
    for (const needle of ['Smoke Title', 'Smoke Artist', 'MYTAG', 'kept']) assert.ok(tagged.includes(Buffer.from(needle)), needle);
    assert.ok(tagged.includes(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), 'cover art');
    assert.ok(!tagged.includes(Buffer.from('Old Encoder')), 'source encoder tag must not be copied');
    assert.ok(!tagged.includes(Buffer.from('00000000 00000000 00000000 0000000000000001')), 'source iTunSMPB must not be copied');
    assert.ok(tagged.includes(Buffer.from('trkn')), 'track number');
    // A later untagged encode in the same module must not inherit them.
    messages.length = 0;
    await self.onmessage({ data: { ...base, pcm16Data: pcm.buffer.slice(0) } });
    const clean = Buffer.from(messages.find(m => m.type === 'complete').encodedBytes);
    for (const needle of ['Smoke Title', 'Smoke Artist', 'MYTAG']) assert.ok(!clean.includes(Buffer.from(needle)), `${needle} leaked`);
    assert.ok(!clean.includes(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), 'cover leaked');
    fs.writeFileSync(path.join(outputDir, 'tagged.m4a'), tagged);
    console.log('PASS M4A source tags are carried over, regenerated tags are not');
  }
  // Invalid settings must return the library's specific error, not fake success.
  for (const invalid of [
    { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', sampleFormat: 'float', pcmFloatData: Float32Array.from({ length: 246 }, (_, i) => (i % 2 ? 1 : -1) * 16000).buffer, message: 'Float PCM must use unity' },
    { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', resampleRate: 48000, pcm16Data: new Int16Array(246).buffer, message: 'The output rate' },
    { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', resampleRate: 'bogus', pcm16Data: new Int16Array(246).buffer, message: 'Choose auto, keep' },
    { sampleRate: 100, channels: 2, bitrate: 128, objectType: 'lc', pcm16Data: new Int16Array(246).buffer, message: 'Opening encoder:' },
    { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', rateControl: 'unknown', pcm16Data: new Int16Array(246).buffer, message: 'Choose VBR' },
    { sampleRate: 48000, channels: 2, bitrate: 128, objectType: 'lc', rateControl: 'vbr', quantQuality: 5001, pcm16Data: new Int16Array(246).buffer, message: 'VBR quality' },
  ]) {
    messages.length = 0;
    await self.onmessage({ data: invalid });
    const error = messages.find(message => message.type === 'error');
    assert.ok(error && error.message.startsWith(invalid.message), `Invalid settings must report ${invalid.message}`);
    assert.ok(!messages.some(message => message.type === 'complete'));
  }
  console.log('PASS invalid sample rate, rate control, and VBR quality are rejected');

  const loadMessages = [];
  const loadFailureSelf = {
    location: { href: 'https://example.test/wasm/faac-worker.js' },
    postMessage: message => loadMessages.push(message),
  };
  const loadFailureContext = vm.createContext({
    self: loadFailureSelf,
    URL,
    importScripts() { throw new Error("Failed to load script 'https://example.test/wasm/faac.js'"); },
  });
  vm.runInContext(workerSource, loadFailureContext);
  await loadFailureSelf.onmessage({ data: {} });
  const loadError = loadMessages.find(message => message.type === 'error');
  assert.ok(loadError?.message.includes('faac.js') && loadError.message.includes('faac.wasm'),
            'Missing WASM assets must report the module paths and likely cause');
  console.log('PASS missing WASM assets include actionable load details');
  console.log(`Outputs: ${outputDir}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
