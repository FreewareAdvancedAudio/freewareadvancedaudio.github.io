import { describe, expect, it } from 'vitest'
import { computeWaveformPeaksFromPcm, computeWaveformPeaksFromAudioBuffer } from './waveform.js'

const fakeBuffer = (channelsData) => ({
  numberOfChannels: channelsData.length,
  length: channelsData[0].length,
  getChannelData: (ch) => channelsData[ch]
})

describe('computeWaveformPeaksFromPcm', () => {
  it('returns empty peaks for empty/invalid input', () => {
    expect(computeWaveformPeaksFromPcm(new Int16Array(0), 2, 'int16').peaks).toEqual([])
    expect(computeWaveformPeaksFromPcm(new Int16Array(10), 0, 'int16').peaks).toEqual([])
    expect(computeWaveformPeaksFromPcm(null, 2, 'int16').peaks).toEqual([])
  })

  it('returns empty peaks when there are fewer frames than slices', () => {
    expect(computeWaveformPeaksFromPcm(new Int16Array(100), 1, 'int16', 360).peaks).toEqual([])
  })

  it('floors silence at the minimum peak', () => {
    const { peaks } = computeWaveformPeaksFromPcm(new Int16Array(3600), 1, 'int16', 36)
    expect(peaks).toHaveLength(36)
    expect(peaks.every((p) => p === 0.06)).toBe(true)
  })

  it('normalizes the loudest slice to 1 and scales others relative to it', () => {
    const pcm = new Int16Array(400)
    pcm.fill(16000, 300) // last quarter loud
    pcm.fill(8000, 0, 100) // first quarter half as loud
    const { peaks, maxRms } = computeWaveformPeaksFromPcm(pcm, 1, 'int16', 4)
    expect(peaks[3]).toBeCloseTo(1)
    expect(peaks[0]).toBeCloseTo(0.5, 1)
    expect(peaks[1]).toBe(0.06)
    expect(maxRms).toBeCloseTo(16000 / 32768, 3)
  })

  it('handles float samples and interleaved stereo', () => {
    const pcm = new Float32Array(800) // 400 frames x 2ch
    for (let i = 0; i < pcm.length; i++) pcm[i] = 0.5
    const { peaks, maxRms } = computeWaveformPeaksFromPcm(pcm, 2, 'float', 4)
    expect(maxRms).toBeCloseTo(0.5)
    expect(peaks.every((p) => Math.abs(p - 1) < 1e-6)).toBe(true)
  })
})

describe('computeWaveformPeaksFromAudioBuffer', () => {
  it('returns [] when too short for the slice count', () => {
    expect(computeWaveformPeaksFromAudioBuffer(fakeBuffer([new Float32Array(10)]), 0.5, 360)).toEqual([])
  })

  it('scales against the reference RMS when the reference is louder', () => {
    const data = new Float32Array(400).fill(0.25)
    const peaks = computeWaveformPeaksFromAudioBuffer(fakeBuffer([data]), 0.5, 4)
    peaks.forEach((p) => expect(p).toBeCloseTo(0.5))
  })

  it('scales against own max*0.8 when louder than the reference, clamped to 1', () => {
    const data = new Float32Array(400).fill(0.5)
    const peaks = computeWaveformPeaksFromAudioBuffer(fakeBuffer([data]), 0.1, 4)
    peaks.forEach((p) => expect(p).toBe(1))
  })

  it('averages across channels', () => {
    const l = new Float32Array(400).fill(0.5)
    const r = new Float32Array(400)
    const peaks = computeWaveformPeaksFromAudioBuffer(fakeBuffer([l, r]), 0.5, 4)
    // rms = sqrt((0.25+0)/2) ≈ 0.354; base = max(0.5, 0.354*0.8)=0.5
    peaks.forEach((p) => expect(p).toBeCloseTo(Math.sqrt(0.125) / 0.5, 2))
  })
})
