// Dedicated worker for audio processing tasks:
// - Interleaving planar channel data to PCM (Int16 or Float32)
// - Building preview WAV byte buffers
// - Computing waveform RMS peak slices

import {
  planarToPcm16,
  planarToFloat32,
  computeWaveformPeaksFromPcm,
  computeWaveformPeaksFromPlanar,
  buildWavBuffer,
} from './waveform.js'

self.onmessage = function (e) {
  const { id, type, payload } = e.data
  try {
    if (type === 'processDecodedAudio') {
      const { channelBuffers, sampleRate, sampleFormat, sliceCount = 360 } = payload
      const channelData = channelBuffers.map((buf) => new Float32Array(buf))
      const channels = channelData.length
      const isFloat = sampleFormat === 'float'

      // Granular sample-based progress computation across 3 stages:
      // Stage 1: Planar channel interleaving to PCM (0% - 35% of worker task)
      // Stage 2: Waveform RMS peak analysis (35% - 70% of worker task)
      // Stage 3: WAV preview buffer construction (70% - 100% of worker task)
      const totalFrames = channelData[0].length

      self.postMessage({
        id,
        type: 'progress',
        progress: 0,
        status: 'Converting audio channels to PCM...',
      })

      const pcmData = isFloat ? planarToFloat32(channelData) : planarToPcm16(channelData)

      self.postMessage({
        id,
        type: 'progress',
        progress: 35,
        status: 'Analyzing waveform peaks...',
      })

      const { peaks, maxRms } = computeWaveformPeaksFromPcm(pcmData, channels, sampleFormat, sliceCount)

      self.postMessage({
        id,
        type: 'progress',
        progress: 70,
        status: 'Building audio preview buffer...',
      })

      const wavBuffer = buildWavBuffer(pcmData, sampleRate, channels, sampleFormat)

      self.postMessage({
        id,
        type: 'progress',
        progress: 100,
        status: 'Audio processing complete.',
      })

      self.postMessage(
        {
          id,
          type: 'complete',
          success: true,
          pcmBuffer: pcmData.buffer,
          peaks,
          maxRms,
          wavBuffer,
        },
        [pcmData.buffer, wavBuffer]
      )
    } else if (type === 'computePlanarPeaks') {
      const { channelBuffers, refMaxRms, sliceCount = 360 } = payload
      const channelData = channelBuffers.map((buf) => new Float32Array(buf))
      const peaks = computeWaveformPeaksFromPlanar(channelData, refMaxRms, sliceCount)
      self.postMessage({
        id,
        type: 'complete',
        success: true,
        peaks,
      })
    } else {
      throw new Error(`Unknown task type: ${type}`)
    }
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err.message || String(err),
    })
  }
}
