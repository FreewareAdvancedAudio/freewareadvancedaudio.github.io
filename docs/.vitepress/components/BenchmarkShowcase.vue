<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ view: 'resources' | 'decoder' | 'quality' }>()

// Published snapshot: Discussion #90, 2026-09-29. Do not mix with local runs.
const encoders = [
  { name: 'FAAC', speed: 506.9, footprint: 73.4 },
  { name: 'FDK-AAC', speed: 152.9, footprint: 940.5 },
  { name: 'Apple AAC', speed: 112.1, footprint: 100.3 },
  { name: 'FFmpeg AAC', speed: 40.4, footprint: 274.5 }
]
const encoderMetrics = [
  { key: 'speed' as const, title: 'Encoding throughput', icon: 'gauge-high', value: '507×', unit: 'realtime', summary: '3.3× the measured FDK-AAC throughput', max: 506.9, format: (n: number) => `${n.toFixed(1)}×`, note: 'Aggregate throughput · higher is better' },
  { key: 'footprint' as const, title: 'Encoder footprint', icon: 'microchip', value: '73', unit: 'KB', summary: 'About 8% of the measured FDK-AAC footprint', max: 940.5, format: (n: number) => `${n.toFixed(1)} KB`, note: 'Code + constants + initialized data · lower is better' }
]
const decoders = [
  { name: 'FAAD3', speed: 490.3, footprint: 136.0 },
  { name: 'LibHelix', speed: 426.1, footprint: 121.4 },
  { name: 'FAAD2', speed: 376.8, footprint: 296.3 },
  { name: 'FDK-AAC', speed: 344.1, footprint: 940.5 },
  { name: 'Apple AAC', speed: 174.4, footprint: 100.3 },
  { name: 'FFmpeg AAC', speed: 135.1, footprint: 274.5 }
]
const decoderMetrics = [
  { key: 'speed' as const, title: 'Decoding throughput', icon: 'gauge-high', value: '490×', unit: 'realtime', summary: 'FAAD3 · 15% higher throughput than LibHelix', max: 490.3, format: (n: number) => `${n.toFixed(1)}×`, note: 'Aggregate throughput · higher is better' },
  { key: 'footprint' as const, title: 'Decoder footprint', icon: 'microchip', value: '54%', unit: 'less code', summary: 'FAAD3 compared with FAAD2 · 136 KB', max: 940.5, format: (n: number) => `${n.toFixed(1)} KB`, note: 'Helix and Apple were smaller · lower is better' }
]
const metrics = computed(() => props.view === 'decoder' ? decoderMetrics : encoderMetrics)
const implementations = computed(() => props.view === 'decoder' ? decoders : encoders)
const profile = ref<'lc' | 'he'>('he')
const faacLabel = computed(() => profile.value === 'lc' ? 'FAAC · LC' : 'FAAC · HE v1')
const quality = [
  { rate: 24, lc: 2.715, he: 3.427, ffmpeg: 2.515 },
  { rate: 32, lc: 3.454, he: 3.812, ffmpeg: 2.508 },
  { rate: 40, lc: 3.868, he: 4.020, ffmpeg: 2.667 },
  { rate: 48, lc: 4.110, he: 4.172, ffmpeg: 3.833 },
  { rate: 56, lc: 4.258, he: 4.309, ffmpeg: 4.129 },
  { rate: 64, lc: 4.379, he: 4.414, ffmpeg: 4.279 }
]
const qualityWidth = (score: number) => `${(score - 1) / 4 * 100}%`
const displayScore = (score: number) => (Math.round(score * 100) / 100).toFixed(2)
</script>

<template>
  <div v-if="view !== 'quality'" class="resource-cards" :aria-label="view === 'decoder' ? 'Measured decoder throughput and footprint' : 'Measured encoder throughput and footprint'">
    <article v-for="metric in metrics" :key="metric.key" class="metric-card">
      <div class="metric-heading"><i :class="`fa-solid fa-${metric.icon}`" aria-hidden="true"></i><h3>{{ metric.title }}</h3></div>
      <div class="metric-value">{{ metric.value }} <span>{{ metric.unit }}</span></div>
      <p class="metric-summary">{{ metric.summary }}</p>
      <div class="resource-rows">
        <div v-for="encoder in implementations" :key="encoder.name" class="resource-row" :class="{ 'is-faac': encoder.name === 'FAAC' || encoder.name === 'FAAD3' }">
          <div class="resource-label"><span>{{ encoder.name }}</span><strong>{{ metric.format(encoder[metric.key]) }}</strong></div>
          <div class="resource-track" aria-hidden="true"><div :style="{ width: `${encoder[metric.key] / metric.max * 100}%` }"></div></div>
        </div>
      </div>
      <p class="metric-note">{{ metric.note }}</p>
    </article>
  </div>

  <figure v-else class="quality-chart" aria-labelledby="quality-chart-caption">
    <figcaption id="quality-chart-caption">48 kHz stereo · 24–64 kbps</figcaption>
    <div class="profile-controls" role="group" aria-label="FAAC profile to compare with FFmpeg LC">
      <button type="button" :aria-pressed="profile === 'he'" @click="profile = 'he'">FAAC HE v1 vs FFmpeg LC</button>
      <button type="button" :aria-pressed="profile === 'lc'" @click="profile = 'lc'">LC vs LC</button>
    </div>
    <p class="chart-note">Average objective MOS · higher is better</p>
    <div class="quality-axis" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
    <div v-for="point in quality" :key="point.rate" class="quality-group">
      <div class="rate-label">{{ point.rate }} <span>kbps</span></div>
      <div class="quality-pair">
        <div class="quality-row faac-row">
          <span class="encoder-label">{{ faacLabel }}</span>
          <div class="quality-track" aria-hidden="true"><div :style="{width: qualityWidth(point[profile])}"></div></div>
          <strong>{{ displayScore(point[profile]) }}</strong>
        </div>
        <div class="quality-row ffmpeg-row">
          <span class="encoder-label">FFmpeg · LC</span>
          <div class="quality-track" aria-hidden="true"><div :style="{width: qualityWidth(point.ffmpeg)}"></div></div>
          <strong>{{ displayScore(point.ffmpeg) }}</strong>
        </div>
      </div>
    </div>
    <p class="chart-note profile-note" aria-live="polite">{{ profile === 'lc' ? 'Both encoders use AAC-LC.' : 'Different profiles: FAAC uses HE-AAC v1; the tested FFmpeg native encoder uses AAC-LC.' }} Bitrates are requested targets, not matched actual payload rates. Scores are model estimates, not listening-test results.</p>
    <details class="quality-data">
      <summary>View all scores</summary>
      <table>
        <thead><tr><th>Target kbps</th><th>FAAC LC</th><th>FAAC HE v1</th><th>FFmpeg LC</th></tr></thead>
        <tbody><tr v-for="point in quality" :key="point.rate"><td>{{ point.rate }}</td><td>{{ point.lc.toFixed(3) }}</td><td>{{ point.he.toFixed(3) }}</td><td>{{ point.ffmpeg.toFixed(3) }}</td></tr></tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.resource-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
.metric-card, .quality-chart { border: 1px solid var(--vp-c-divider); border-radius: 24px; background: linear-gradient(145deg, var(--vp-c-bg-soft), var(--vp-c-bg)); padding: 32px; }
.metric-heading { display: flex; gap: 10px; align-items: center; color: var(--audio-icon-cyan); }
.metric-heading h3 { margin: 0; font-size: 15px; color: var(--vp-c-text-1); }
.metric-value { margin-top: 22px; font-size: clamp(48px, 5vw, 68px); line-height: 1.15; letter-spacing: -2px; font-weight: 700; color: var(--audio-icon-cyan); }
.metric-value span { font-size: 15px; font-weight: 500; letter-spacing: 0; color: var(--vp-c-text-2); }
.metric-card .metric-summary { margin: 8px 0 24px; min-height: 48px; font-size: 14px; line-height: 24px; }
.resource-rows { display: grid; gap: 14px; }
.resource-label { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; line-height: 20px; }
.resource-label strong { font-variant-numeric: tabular-nums; white-space: nowrap; }
.resource-track { margin-top: 5px; height: 8px; border-radius: 3px; background: rgba(148, 163, 184, 0.12); }
.resource-track > div { height: 100%; border-radius: inherit; background: #64748b; }
.is-faac .resource-label { color: var(--audio-icon-cyan); }
.is-faac .resource-track > div { background: var(--audio-icon-cyan); }
.metric-card .metric-note { margin: 22px 0 0; color: var(--vp-c-text-3); font-size: 12px; line-height: 18px; }
.quality-chart { margin: 24px 0; }
.quality-chart figcaption { font-weight: 600; font-size: 17px; }
.profile-controls { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.profile-controls button { padding: 7px 12px; border: 1px solid var(--vp-c-divider); border-radius: 8px; color: var(--vp-c-text-2); font-size: 12px; line-height: 18px; }
.profile-controls button[aria-pressed="true"] { color: var(--audio-icon-cyan); background: var(--vp-c-brand-soft); border-color: var(--vp-c-brand-1); }
.profile-controls button:focus-visible, .quality-data summary:focus-visible { outline: 2px solid var(--audio-icon-cyan); outline-offset: 3px; }
.quality-chart .chart-note { font-size: 12px; line-height: 20px; color: var(--vp-c-text-2); margin: 12px 0; }
.quality-axis { display: flex; justify-content: space-between; margin: 18px 42px 8px 164px; color: var(--vp-c-text-3); font-size: 11px; }
.quality-group { display: grid; grid-template-columns: 48px minmax(0, 1fr); gap: 12px; padding: 12px 0; border-top: 1px solid var(--vp-c-divider); }
.rate-label { align-self: center; font-size: 16px; font-weight: 600; line-height: 20px; }
.rate-label span { display: block; font-size: 11px; font-weight: 400; color: var(--vp-c-text-3); }
.quality-pair { display: grid; gap: 7px; }
.quality-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) 34px; gap: 8px; align-items: center; font-size: 11px; line-height: 18px; }
.quality-row strong { text-align: right; font-variant-numeric: tabular-nums; font-size: 12px; }
.faac-row { color: var(--audio-icon-cyan); }
.ffmpeg-row { color: var(--audio-icon-violet); }
.quality-track { height: 10px; background: rgba(148, 163, 184, 0.1); border-radius: 3px; }
.quality-track > div { height: 100%; border-radius: inherit; background: currentColor; }
.quality-chart .profile-note { margin-top: 20px; }
.quality-data { margin-top: 16px; font-size: 13px; }
.quality-data summary { cursor: pointer; color: var(--vp-c-text-2); }
.quality-data table { font-size: 12px; }
@media (max-width: 640px) {
  .resource-cards { grid-template-columns: 1fr; }
  .metric-card, .quality-chart { padding: 18px; }
  .metric-card .metric-summary { min-height: 0; }
  .quality-group { grid-template-columns: 36px minmax(0, 1fr); gap: 8px; }
  .quality-row { grid-template-columns: minmax(0, 1fr) 34px; gap: 4px 8px; }
  .encoder-label { grid-column: 1 / -1; }
  .quality-axis { margin-left: 44px; }
}
</style>
