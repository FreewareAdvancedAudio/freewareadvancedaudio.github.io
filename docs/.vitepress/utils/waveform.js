const MIN_PEAK = 0.06
const DEFAULT_MAX_RMS = 0.001

function clampPeak(value) {
  return Math.max(MIN_PEAK, Math.min(1.0, value))
}

// RMS of one slice, subsampled to ~120 frames per channel for speed.
function sliceRms(getSample, channels, start, end) {
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

function computeRmsSlices(getSample, channels, totalFrames, sliceCount) {
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

// Peaks for a decoded AudioBuffer-like object, scaled against the reference's
// loudest slice so level differences between source and encode stay visible.
export function computeWaveformPeaksFromAudioBuffer(audioBuffer, refMaxRms = DEFAULT_MAX_RMS, sliceCount = 360) {
  const channels = audioBuffer.numberOfChannels
  const data = Array.from({ length: channels }, (_, ch) => audioBuffer.getChannelData(ch))
  const result = computeRmsSlices((ch, i) => data[ch][i], channels, audioBuffer.length, sliceCount)
  if (!result) return []
  const scaleBase = Math.max(refMaxRms, result.max * 0.8)
  return Array.from(result.rms, (r) => clampPeak(r / scaleBase))
}
