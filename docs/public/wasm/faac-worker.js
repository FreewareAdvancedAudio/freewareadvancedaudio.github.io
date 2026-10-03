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
  const { pcm16Data, bitrate, objectType, sampleRate, channels } = e.data;
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
    const statusPtr = faac._malloc(4);
    if (!statusPtr) throw new Error('Not enough memory to encode this file.');
    let session = 0;
    try {
      const pcmInput = new Int16Array(pcm16Data);
      if (!Number.isInteger(channels) || channels < 1 || !pcmInput.length || pcmInput.length % channels) {
        throw new Error('The input audio has an invalid channel layout or no samples.');
      }
      self.postMessage({ type: 'progress', progress: 20, status: 'Configuring audio encoder...' });
      session = faac._wasm_converter_open(sampleRate, channels, bitrate * 1000,
                                          objectType === 'he-v1' ? 1 : 0, statusPtr);
      check(faac.getValue(statusPtr, 'i32'), 'Opening encoder');
      if (!session) throw new Error('The encoder could not be initialized.');
      const frameSamples = faac._wasm_converter_frame_samples(session);
      const inputPtr = faac._wasm_converter_input(session);
      const totalSamples = pcmInput.length / channels;
      const versionStr = faac.UTF8ToString(faac._wasm_converter_version());
      let processed = 0;
      let lastProgress = 20;
      while (processed < totalSamples) {
        const samples = Math.min(frameSamples, totalSamples - processed);
        const chunk = pcmInput.subarray(processed * channels, (processed + samples) * channels);
        faac.HEAP16.set(chunk, inputPtr / 2);
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
      self.postMessage({ type: 'complete', encodedBytes: output.buffer, version: versionStr }, [output.buffer]);
    } finally {
      faac._wasm_converter_close(session);
      faac._free(statusPtr);
    }
  } catch (err) {
    let message = err.message || 'Conversion failed';
    if (message.includes('importScripts') || message.includes('failed to load')) {
      message = 'The audio converter could not load. Please reload the page and try again.';
    }
    self.postMessage({ type: 'error', message });
  }
};
