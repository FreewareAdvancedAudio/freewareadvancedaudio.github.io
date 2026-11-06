/*
 * FAAC WebAssembly Worker
 * Copyright (C) 2026 Nils Schimmelmann
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

self.onmessage = async function(e) {
  const { pcm16Data, pcmFloatData, sampleFormat, bitrate, objectType, rateControl, quantQuality, sampleRate, channels, resampleRate, sourceM4a } = e.data;
  self.postMessage({ type: 'progress', progress: 15, status: 'Initializing audio converter...' });

  try {
    if (!self.FAACModule) {
      importScripts(new URL('faac.js', self.location.href).href);
    }
    const faac = await self.FAACModule();
    function check(status, operation) {
      if (status !== 0) {
        throw new Error(operation + ': ' + faac.UTF8ToString(faac._wasm_converter_error(status)));
      }
    }
    if (rateControl !== undefined && !['auto', 'vbr', 'abr', 'cbr'].includes(rateControl)) {
      throw new Error('Choose VBR, ABR, or CBR rate control.');
    }
    if (rateControl === 'vbr' && (!Number.isInteger(quantQuality) || quantQuality < 1 || quantQuality > 5000)) {
      throw new Error('VBR quality must be between 1 and 5000.');
    }
    const statusPtr = faac._malloc(4);
    if (!statusPtr) throw new Error('Not enough memory to encode this file.');
    let session = 0;
    try {
      const isFloat = sampleFormat === 'float' || Boolean(pcmFloatData);
      const pcmInput = isFloat ? new Float32Array(pcmFloatData || pcm16Data) : new Int16Array(pcm16Data);
      if (!Number.isInteger(channels) || channels < 1 || !pcmInput.length || pcmInput.length % channels) {
        throw new Error('The input audio has an invalid channel layout or no samples.');
      }
      if (isFloat) {
        // FAAC_INPUT_FLOAT is unity full scale (+-1.0). Anything far beyond that
        // is a scaling mistake (e.g. 16-bit scale) and would encode as garbage.
        let peak = 0;
        for (let i = 0; i < pcmInput.length; i++) {
          const magnitude = Math.abs(pcmInput[i]);
          if (magnitude > peak) peak = magnitude;
        }
        if (!(peak <= 64)) {
          throw new Error('Float PCM must use unity full scale (+-1.0); found a peak of ' + peak + '.');
        }
      }
      self.postMessage({ type: 'progress', progress: 20, status: 'Configuring audio encoder...' });
      // Like the CLI's --rate: 'auto' (default), 'keep', or a lower rate in Hz.
      const rateRequest = resampleRate === 'keep' ? 1 : (resampleRate === undefined || resampleRate === 'auto' ? 0 : resampleRate);
      if (!Number.isInteger(rateRequest) || rateRequest < 0 || rateRequest === 1 && resampleRate !== 'keep') {
        throw new Error('Choose auto, keep, or a sample rate in Hz.');
      }
      if (rateRequest > 1 && (rateRequest >= sampleRate || rateRequest < 7350 || rateRequest > 96000)) {
        throw new Error('The output rate (' + rateRequest + ' Hz) must be between 7350 Hz and 96000 Hz and lower than the input rate (' + sampleRate + ' Hz).');
      }
      const numObjectType = objectType === 'he-v1' ? 5 : (objectType === 'lc' ? 2 : 0);
      const rateMode = ({ auto: 0, abr: 0, vbr: 1, cbr: 2 })[rateControl] ?? 0;
      const inputFormatCode = isFloat ? 4 : 1; // 4 = FAAC_INPUT_FLOAT, 1 = FAAC_INPUT_16BIT
      session = faac._wasm_converter_open(sampleRate, channels, bitrate * 1000,
                                          numObjectType, rateMode, quantQuality, inputFormatCode, rateRequest, statusPtr);
      check(faac.getValue(statusPtr, 'i32'), 'Opening encoder');
      if (!session) throw new Error('The encoder could not be initialized.');
      const resolvedObjTypeNum = faac._wasm_converter_object_type(session);
      const resolvedObjectType = resolvedObjTypeNum === 5 ? 'he-v1' : 'lc';
      const resolvedRateControl = ['abr', 'vbr', 'cbr'][faac._wasm_converter_rate_control(session)] || 'abr';
      const resolvedBitrate = faac._wasm_converter_bit_rate(session);
      const resolvedQuality = faac._wasm_converter_quant_quality(session);
      const resolvedSampleRate = faac._wasm_converter_sample_rate(session);
      const encoderTag = faac.UTF8ToString(faac._wasm_converter_encoder_name(session));
      // Carry descriptive tags over from an M4A source. Best effort: a source
      // we can't parse just encodes without tags.
      if (sourceM4a && sourceM4a.byteLength) {
        const source = new Uint8Array(sourceM4a);
        const sourcePtr = faac._malloc(source.length);
        if (sourcePtr) {
          try {
            faac.HEAPU8.set(source, sourcePtr);
            faac._wasm_converter_read_tags(session, sourcePtr, source.length);
          } finally {
            faac._free(sourcePtr);
          }
        }
      }
      const frameSamples = faac._wasm_converter_frame_samples(session);
      const inputPtr = faac._wasm_converter_input(session);
      const totalSamples = pcmInput.length / channels;
      const versionStr = faac.UTF8ToString(faac._wasm_converter_version());
      let processed = 0;
      let lastProgress = 20;
      while (processed < totalSamples) {
        const samples = Math.min(frameSamples, totalSamples - processed);
        const chunk = pcmInput.subarray(processed * channels, (processed + samples) * channels);
        if (isFloat) {
          faac.HEAPF32.set(chunk, inputPtr / 4);
        } else {
          faac.HEAP16.set(chunk, inputPtr / 2);
        }
        check(faac._wasm_converter_encode(session, samples * channels), 'Encoding audio');
        processed += samples;
        const progress = 20 + Math.floor((processed / totalSamples) * 75);
        if (progress > lastProgress) {
          self.postMessage({ type: 'progress', progress, status: 'Encoding M4A audio...' });
          lastProgress = progress;
        }
      }
      self.postMessage({ type: 'progress', progress: 98, status: 'Finalizing M4A audio...' });
      check(faac._wasm_converter_finish(session), 'Finalizing M4A audio');
      const encodedBytes = faac.FS.readFile('/output.m4a');
      faac.FS.unlink('/output.m4a');
      if (!encodedBytes.length) throw new Error('FAAC encoding produced no output bytes.');
      // FS buffers can have an offset; transfer only the bytes of the file.
      const output = encodedBytes.slice();
      self.postMessage({ type: 'complete', encodedBytes: output.buffer, version: versionStr,
        resolvedObjectType, resolvedRateControl, resolvedBitrate, resolvedQuality,
        resolvedSampleRate, encoderTag }, [output.buffer]);
    } finally {
      faac._wasm_converter_close(session);
      faac._free(statusPtr);
    }
  } catch (err) {
    let message = err.message || 'Conversion failed';
    const normalizedMessage = message.toLowerCase();
    if (normalizedMessage.includes('importscripts') || normalizedMessage.includes('failed to load')) {
      message = 'The encoder module could not load. Check that faac.js and faac.wasm are available beside the worker, then reload. (' + message + ')';
    }
    self.postMessage({ type: 'error', message });
  }
};
