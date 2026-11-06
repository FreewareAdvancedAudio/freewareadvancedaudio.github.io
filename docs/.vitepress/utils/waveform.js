// Helper functions for PCM conversion, WAV creation, and waveform generation.
// Designed to run cleanly inside both Web Worker and standard contexts.

const MIN_PEAK = 0.06
const DEFAULT_MAX_RMS = 0.001

export function clampPeak(value) {
  return Math.max(MIN_PEAK, Math.min(1.0, value))
}

export function sliceRms(getSample, channels, start, end) {
  const step = Math.max(1, Math.floor((end - start) / 120))
  let sumSquares = 0
  let count = 0
  for (let ch = 0; ch < channels; ch++) {
    for (let i = start; i < end; i += step) {
      const sample = getSample(ch, i)
      sumSquares += sample * sample
      count++
    }
  }
  return count > 0 ? Math.sqrt(sumSquares / count) : 0
}

export function computeRmsSlices(getSample, channels, totalFrames, sliceCount) {
  const framesPerSlice = Math.floor(totalFrames / sliceCount)
  if (framesPerSlice <= 0) return null
  const rms = new Float32Array(sliceCount)
  let max = DEFAULT_MAX_RMS
  for (let slice = 0; slice < sliceCount; slice++) {
    const start = slice * framesPerSlice
    const end = slice === sliceCount - 1 ? totalFrames : (slice + 1) * framesPerSlice
    rms[slice] = sliceRms(getSample, channels, start, end)
    if (rms[slice] > max) max = rms[slice]
  }
  return { rms, max }
}

// Peaks for interleaved PCM, normalized to the file's own loudest slice.
export function computeWaveformPeaksFromPcm(pcmData, channels, sampleFormat, sliceCount = 360) {
  if (!pcmData || !pcmData.length || !channels) return { peaks: [], maxRms: DEFAULT_MAX_RMS }
  const normalizer = sampleFormat === 'float' ? 1.0 : 32768.0
  const result = computeRmsSlices(
    (ch, frame) => pcmData[frame * channels + ch] / normalizer,
    channels,
    Math.floor(pcmData.length / channels),
    sliceCount
  )
  if (!result) return { peaks: [], maxRms: DEFAULT_MAX_RMS }
  const peaks = Array.from(result.rms, (r) => clampPeak(r / result.max))
  return { peaks, maxRms: result.max }
}

// Peaks for planar channel data (array of Float32Array per channel), scaled against refMaxRms.
export function computeWaveformPeaksFromPlanar(channelData, refMaxRms = DEFAULT_MAX_RMS, sliceCount = 360) {
  const channels = channelData.length
  if (!channels || !channelData[0]?.length) return []
  const totalFrames = channelData[0].length
  const result = computeRmsSlices((ch, i) => channelData[ch][i], channels, totalFrames, sliceCount)
  if (!result) return []
  const scaleBase = Math.max(refMaxRms, result.max * 0.8)
  return Array.from(result.rms, (r) => clampPeak(r / scaleBase))
}

// Peaks for a decoded AudioBuffer-like object, scaled against the reference's
// loudest slice so level differences between source and encode stay visible.
export function computeWaveformPeaksFromAudioBuffer(audioBuffer, refMaxRms = DEFAULT_MAX_RMS, sliceCount = 360) {
  const channels = audioBuffer.numberOfChannels
  const data = Array.from({ length: channels }, (_, ch) => audioBuffer.getChannelData(ch))
  return computeWaveformPeaksFromPlanar(data, refMaxRms, sliceCount)
}

export function planarToPcm16(channelData) {
  const numChannels = channelData.length
  const length = channelData[0].length
  const pcm16 = new Int16Array(length * numChannels)

  let offset = 0
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = channelData[channel][i]
      sample = Math.max(-1, Math.min(1, sample))
      pcm16[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
  }

  return pcm16
}

export function planarToFloat32(channelData) {
  const numChannels = channelData.length
  const length = channelData[0].length
  const pcmFloat = new Float32Array(length * numChannels)

  let offset = 0
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      pcmFloat[offset++] = channelData[channel][i]
    }
  }

  return pcmFloat
}

export function buildWavBuffer(pcmData, sampleRate, channels, sampleFormat) {
  const pcm = new Int16Array(pcmData.length)
  if (sampleFormat === 'float') {
    for (let i = 0; i < pcm.length; i++) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]))
      pcm[i] = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7FFF)
    }
  } else {
    pcm.set(pcmData)
  }
  const wav = new ArrayBuffer(44 + pcm.byteLength)
  const view = new DataView(wav)
  const write = (offset, value) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  const blockAlign = channels * 2
  write(0, 'RIFF'); view.setUint32(4, 36 + pcm.byteLength, true)
  write(8, 'WAVE'); write(12, 'fmt '); view.setUint32(16, 16, true)
  view.setUint16(20, 1, true); view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true); view.setUint16(34, 16, true)
  write(36, 'data'); view.setUint32(40, pcm.byteLength, true)
  new Int16Array(wav, 44).set(pcm)
  return wav
}
