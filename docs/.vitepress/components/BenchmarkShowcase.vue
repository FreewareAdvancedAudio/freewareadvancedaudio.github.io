<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ view: 'resources' | 'decoder' | 'speed' | 'quality' }>()

// Published snapshot: leaderboard gist, generated 2026-11-08. Do not mix with local runs.
const encoders = [
  { name: 'FAAC', speed: 800.8 },
  { name: 'FDK-AAC', speed: 192.2 },
  { name: 'Apple AAC', speed: 177.1 },
  { name: 'FFmpeg AAC', speed: 58.7 }
]
const encoderMetrics = [
  { key: 'speed' as const, title: 'Encoding throughput', icon: 'gauge-high', value: '801×', unit: 'realtime', summary: '4.2× the measured FDK-AAC throughput', max: 800.8, format: (n: number) => `${Math.round(n).toLocaleString('en-US')}×`, note: 'Aggregate throughput · higher is better' }
]
const decoders = [
  // Lead with FAAD3; then follow the encoder card order and append decoder-only implementations.
  { name: 'FAAD3', speed: 2270.6 },
  { name: 'FDK-AAC', speed: 956.7 },
  { name: 'Apple AAC', speed: 1210.0 },
  { name: 'FFmpeg AAC', speed: 597.8 },
  { name: 'Helix AAC', speed: 1023.7 }
]
const decoderMetrics = [
  { key: 'speed' as const, title: 'Decoding throughput', icon: 'gauge-high', value: '2,271×', unit: 'realtime', summary: '2.4× the measured FDK-AAC throughput', max: 2270.6, format: (n: number) => `${Math.round(n).toLocaleString('en-US')}×`, note: 'Aggregate throughput · higher is better' }
]
const metrics = computed(() => props.view === 'decoder' ? decoderMetrics : encoderMetrics)
const implementations = computed(() => props.view === 'decoder' ? decoders : encoders)
const cards = computed(() => props.view === 'speed'
  ? [{ metric: encoderMetrics[0], rows: encoders, label: 'Encoding' }, { metric: decoderMetrics[0], rows: decoders, label: 'Decoding' }]
  : [{ metric: metrics.value[0], rows: implementations.value, label: '' }])

// 48 kHz stereo average MOS, 16–320 kbps. Published snapshot; null means not published.
const rates = [16, 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 256, 320]
const rawQualitySeries = [
  {
    name: 'FAAC',
    label: { lc: 'FAAC · LC', he: 'FAAC · HE v1' },
    color: '#67e8f9',
    dash: '',
    values: {
      lc: [2.083, 3.296, 3.773, 3.972, 4.177, 4.469, 4.613, 4.739, 4.867, 4.926, 4.955, 4.981, 4.991],
      he: [2.978, 3.484, 3.851, 4.163, 4.346, 4.567, 4.691, 4.754, 4.810, 4.827, 4.832, 4.833, 4.833]
    }
  },
  {
    name: 'FDK-AAC',
    label: { lc: 'FDK-AAC · LC', he: 'FDK-AAC · HE v1' },
    color: '#c4b5fd',
    dash: '',
    values: {
      lc: [1.710, 2.164, 2.567, 2.760, 2.951, 4.221, 4.606, 4.718, 4.826, 4.880, 4.927, 4.953, 4.960],
      he: [2.157, 3.321, 3.836, 4.134, 4.267, 4.526, 4.666, 4.742, 4.815, 4.844, 4.854, 4.857, 4.860]
    }
  },
  {
    name: 'Apple AAC',
    label: { lc: 'Apple AAC · LC', he: 'Apple AAC · HE v1' },
    color: '#fbbf24',
    dash: '6 3',
    values: {
      lc: [1.487, 1.548, 2.531, 2.881, 2.875, 3.976, 4.613, 4.710, 4.859, 4.927, 4.963, 4.983, 4.993],
      he: [null, 2.617, 3.843, 4.109, 4.262, 4.543, null, null, null, null, null, null, null]
    }
  },
  {
    name: 'FFmpeg AAC',
    label: { lc: 'FFmpeg AAC · LC', he: 'FFmpeg AAC · HE v1' },
    color: '#94a3b8',
    dash: '2 4',
    values: {
      lc: [2.329, 2.335, 2.373, 2.609, 3.741, 4.306, 4.535, 4.680, 4.799, 4.883, 4.928, 4.935, 4.943],
      he: [null, null, null, null, null, null, null, null, null, null, null, null, null]
    }
  }
]

// Each encoder is plotted at its higher-scoring profile for each bitrate.
const bestOf = (lc: (number | null)[], he: (number | null)[]) => lc.map((lcValue, index) => {
  const heValue = he[index]
  if (lcValue === null) return heValue
  if (heValue === null) return lcValue
  return Math.max(lcValue, heValue)
})
const qualitySeries = rawQualitySeries.map(series => ({
  name: series.name,
  color: series.color,
  dash: series.dash,
  values: bestOf(series.values.lc, series.values.he)
}))
// Draw FAAC last so it sits on top where curves overlap.
const plottedSeries = computed(() => qualitySeries
  .filter(series => series.values.some(value => value !== null))
  .sort((a, b) => Number(a.name === 'FAAC') - Number(b.name === 'FAAC')))

const minRate = rates[0]
const maxRate = rates[rates.length - 1]
const chart = { width: 760, height: 320, top: 18, right: 18, bottom: 38, left: 46 }
const plotWidth = chart.width - chart.left - chart.right
const plotHeight = chart.height - chart.top - chart.bottom
const logSpan = Math.log2(maxRate) - Math.log2(minRate)
const xFor = (rate: number) => chart.left + (Math.log2(rate) - Math.log2(minRate)) / logSpan * plotWidth
const yFor = (score: number) => chart.top + (5 - score) / 4 * plotHeight
const xTicks = [16, 32, 64, 128, 320]
const yTicks = [1, 2, 3, 4, 5]
const linePoints = (values: (number | null)[]) => values
  .map((value, index) => value === null ? null : `${xFor(rates[index]).toFixed(1)},${yFor(value).toFixed(1)}`)
  .filter(Boolean)
  .join(' ')

// Selected bitrate: drag the marker (or use arrow keys) to move it; the panels below follow it.
const selectedIndex = ref(rates.indexOf(48))
const selectedRate = computed(() => rates[selectedIndex.value])
const dragging = ref(false)
const indexAt = (event: PointerEvent) => {
  const rect = (event.currentTarget as SVGElement).getBoundingClientRect()
  const svgX = (event.clientX - rect.left) / rect.width * chart.width
  const fraction = Math.min(1, Math.max(0, (svgX - chart.left) / plotWidth))
  const target = Math.log2(minRate) + fraction * logSpan
  let best = 0
  rates.forEach((rate, index) => { if (Math.abs(Math.log2(rate) - target) < Math.abs(Math.log2(rates[best]) - target)) best = index })
  return best
}
const onDown = (event: PointerEvent) => {
  dragging.value = true
  ;(event.currentTarget as SVGElement).setPointerCapture(event.pointerId)
  selectedIndex.value = indexAt(event)
}
const onMove = (event: PointerEvent) => { if (dragging.value) selectedIndex.value = indexAt(event) }
const onUp = () => { dragging.value = false }
const onKey = (event: KeyboardEvent) => {
  const step = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0
  if (event.key === 'Home') selectedIndex.value = 0
  else if (event.key === 'End') selectedIndex.value = rates.length - 1
  else if (step) selectedIndex.value = Math.min(rates.length - 1, Math.max(0, selectedIndex.value + step))
  else return
  event.preventDefault()
}

// Magnified view: the selected bitrate and its two neighbours either side, y-axis fitted to that window.
const zoom = computed(() => {
  const from = Math.max(0, selectedIndex.value - 2)
  const to = Math.min(rates.length - 1, selectedIndex.value + 2)
  const indices: number[] = []
  for (let i = from; i <= to; i++) indices.push(i)
  const all = plottedSeries.value.flatMap(series => indices.map(i => series.values[i])).filter((v): v is number => v !== null)
  const lo = Math.min(...all)
  const hi = Math.max(...all)
  const pad = Math.max((hi - lo) * 0.12, 0.01)
  const yMin = Math.max(1, lo - pad)
  const yMax = Math.min(5, hi + pad)
  const step = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1].find(candidate => (yMax - yMin) / candidate <= 6) ?? 1
  const ticks: number[] = []
  for (let t = Math.ceil(yMin / step) * step; t <= yMax + 1e-9; t += step) ticks.push(Math.round(t * 1000) / 1000)
  const g = { width: 380, height: 250, top: 14, right: 14, bottom: 34, left: 44 }
  const w = g.width - g.left - g.right
  const h = g.height - g.top - g.bottom
  const l0 = Math.log2(rates[from])
  const span = Math.log2(rates[to]) - l0
  return {
    g, indices, ticks, decimals: step < 0.1 ? 2 : 1, yMin, yMax, from: rates[from], to: rates[to],
    x: (rate: number) => g.left + (Math.log2(rate) - l0) / span * w,
    y: (score: number) => g.top + (yMax - score) / (yMax - yMin) * h
  }
})
const zoomPoints = (values: (number | null)[]) => zoom.value.indices
  .filter(i => values[i] !== null)
  .map(i => `${zoom.value.x(rates[i]).toFixed(1)},${zoom.value.y(values[i] as number).toFixed(1)}`)
  .join(' ')

const bars = computed(() => {
  const faac = qualitySeries[0].values[selectedIndex.value]
  return qualitySeries
    .map(series => ({ name: series.name, color: series.color, value: series.values[selectedIndex.value] }))
    .filter(bar => bar.value !== null)
    // Rank by the real score so the bars always agree with the line chart, even when two scores round to the same 2 decimals.
    .sort((a, b) => (b.value as number) - (a.value as number))
    .map(bar => ({ ...bar, pct: ((bar.value as number) - 1) / 4 * 100, delta: bar.name === 'FAAC' || faac === null ? null : (bar.value as number) - faac }))
})
const qualityAria = computed(() => `Line chart of average MOS from ${minRate} to ${maxRate} kbps, log scale, for ${plottedSeries.value.map(series => series.name).join(', ')}. Currently selected: ${selectedRate.value} kbps. Use the arrow keys to change it.`)
const displayScore = (score: number | null) => score === null ? '—' : score.toFixed(3)
</script>

<template>
  <div v-if="view !== 'quality'" :class="['resource-cards', { 'resource-cards--single': view !== 'speed' }]" :aria-label="view === 'speed' ? 'Measured AAC encoder and decoder throughput' : view === 'decoder' ? 'Measured AAC decoder throughput' : 'Measured AAC encoder throughput'">
    <article v-for="card in cards" :key="card.metric.title" class="metric-card">
      <div class="metric-heading"><i :class="`fa-solid fa-${card.metric.icon}`" aria-hidden="true"></i><h3>{{ card.metric.title }}</h3></div>
      <div class="metric-value">{{ card.metric.value }} <span>{{ card.metric.unit }}</span></div>
      <p class="metric-summary">{{ card.metric.summary }}</p>
      <div class="resource-rows">
        <div v-for="encoder in card.rows" :key="encoder.name" class="resource-row" :class="{ 'is-faac': encoder.name === 'FAAC' || encoder.name === 'FAAD3' }">
          <div class="resource-label"><span>{{ encoder.name }}</span><strong>{{ card.metric.format(encoder[card.metric.key]) }}</strong></div>
          <div class="resource-track" aria-hidden="true"><div :style="{ width: `${encoder[card.metric.key] / card.metric.max * 100}%` }"></div></div>
        </div>
      </div>
      <p class="metric-note">{{ card.metric.note }}</p>
    </article>
  </div>

  <figure v-else class="quality-chart" aria-labelledby="quality-chart-caption">
    <figcaption id="quality-chart-caption">48 kHz stereo · average objective MOS across 16–320 kbps · higher is better</figcaption>

    <ul class="series-legend">
      <li v-for="series in plottedSeries" :key="series.name">
        <span class="legend-swatch" :style="{ background: series.dash ? `repeating-linear-gradient(90deg, ${series.color} 0 5px, transparent 5px 9px)` : series.color }"></span>
        {{ series.name }}
      </li>
    </ul>

    <svg class="quality-svg draggable" :class="{ dragging }" :viewBox="`0 0 ${chart.width} ${chart.height}`" role="slider" tabindex="0" :aria-label="qualityAria" aria-orientation="horizontal" :aria-valuemin="minRate" :aria-valuemax="maxRate" :aria-valuenow="selectedRate" :aria-valuetext="`${selectedRate} kbps`" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @keydown="onKey">
      <title>Average MOS vs bitrate. Drag to choose a bitrate.</title>
      <g aria-hidden="true">
        <rect class="hit-area" :x="chart.left" :y="chart.top" :width="plotWidth" :height="plotHeight" />
        <line v-for="tick in yTicks" :key="tick" class="grid-line" :x1="chart.left" :x2="chart.width - chart.right" :y1="yFor(tick)" :y2="yFor(tick)" />
        <text v-for="tick in yTicks" :key="`y-${tick}`" class="axis-label" :x="chart.left - 10" :y="yFor(tick) + 3" text-anchor="end">{{ tick }}</text>
        <text v-for="rate in xTicks" :key="`x-${rate}`" class="axis-label" :x="xFor(rate)" :y="chart.height - 14" :text-anchor="rate === maxRate ? 'end' : 'middle'">{{ rate }}</text>
        <text class="axis-label axis-title" :x="chart.left + plotWidth / 2" :y="chart.height" text-anchor="middle">kbps · logarithmic scale</text>
        <text class="axis-label axis-title" :x="chart.left - 34" :y="chart.top - 4" text-anchor="start">MOS</text>
        <rect class="zoom-region" :x="xFor(rates[Math.max(0, selectedIndex - 2)])" :y="chart.top" :width="xFor(rates[Math.min(rates.length - 1, selectedIndex + 2)]) - xFor(rates[Math.max(0, selectedIndex - 2)])" :height="plotHeight" />
      </g>
      <g v-for="series in plottedSeries" :key="series.name" :style="{ color: series.color }" aria-hidden="true" pointer-events="none">
        <polyline :points="linePoints(series.values)" fill="none" stroke="currentColor" :stroke-width="series.name === 'FAAC' ? 3 : 1.75" :stroke-dasharray="series.dash || undefined" stroke-linejoin="round" stroke-linecap="round" :opacity="series.name === 'FAAC' ? 1 : 0.85" />
        <circle v-for="(value, index) in series.values" :key="index" v-show="value !== null && index === selectedIndex" :cx="xFor(rates[index])" :cy="value === null ? 0 : yFor(value)" r="4.5" fill="currentColor" stroke="var(--vp-c-bg)" stroke-width="1.5" />
      </g>
      <g aria-hidden="true" pointer-events="none">
        <line class="cursor-line" :x1="xFor(selectedRate)" :x2="xFor(selectedRate)" :y1="chart.top" :y2="chart.top + plotHeight" />
        <g :transform="`translate(${xFor(selectedRate)} ${chart.top + plotHeight})`">
          <rect class="cursor-handle" x="-24" y="2" width="48" height="20" rx="10" />
          <text class="cursor-text" x="0" y="16" text-anchor="middle">{{ selectedRate }}</text>
        </g>
      </g>
    </svg>
    <p class="chart-note">Drag the marker along the chart, or focus it and use the arrow keys, to inspect a bitrate. The shaded region is what the magnified view shows.</p>

    <div class="detail-grid">
      <div class="detail-panel">
        <p class="zoom-title">Magnified · {{ zoom.from }}–{{ zoom.to }} kbps · y-axis {{ zoom.yMin.toFixed(zoom.decimals) }}–{{ zoom.yMax.toFixed(zoom.decimals) }}</p>
        <svg class="quality-svg" :viewBox="`0 0 ${zoom.g.width} ${zoom.g.height}`" role="img" :aria-label="`Magnified average MOS from ${zoom.from} to ${zoom.to} kbps`">
          <g aria-hidden="true">
            <line v-for="tick in zoom.ticks" :key="tick" class="grid-line" :x1="zoom.g.left" :x2="zoom.g.width - zoom.g.right" :y1="zoom.y(tick)" :y2="zoom.y(tick)" />
            <text v-for="tick in zoom.ticks" :key="`zy-${tick}`" class="axis-label" :x="zoom.g.left - 8" :y="zoom.y(tick) + 3" text-anchor="end">{{ tick.toFixed(zoom.decimals) }}</text>
            <text v-for="i in zoom.indices" :key="`zx-${i}`" class="axis-label" :x="zoom.x(rates[i])" :y="zoom.g.height - 16" :text-anchor="i === zoom.indices[0] ? 'start' : i === zoom.indices[zoom.indices.length - 1] ? 'end' : 'middle'">{{ rates[i] }}</text>
            <text class="axis-label axis-title" :x="zoom.g.width / 2" :y="zoom.g.height" text-anchor="middle">kbps · logarithmic scale</text>
            <line class="cursor-line" :x1="zoom.x(selectedRate)" :x2="zoom.x(selectedRate)" :y1="zoom.g.top" :y2="zoom.g.height - zoom.g.bottom" />
          </g>
          <g v-for="series in plottedSeries" :key="series.name" :style="{ color: series.color }">
            <polyline :points="zoomPoints(series.values)" fill="none" stroke="currentColor" :stroke-width="series.name === 'FAAC' ? 3 : 1.75" :stroke-dasharray="series.dash || undefined" stroke-linejoin="round" stroke-linecap="round" :opacity="series.name === 'FAAC' ? 1 : 0.85" />
            <template v-for="i in zoom.indices" :key="i">
              <circle v-if="series.values[i] !== null" :cx="zoom.x(rates[i])" :cy="zoom.y(series.values[i] as number)" :r="i === selectedIndex ? 4.5 : 3" fill="currentColor" stroke="var(--vp-c-bg)" stroke-width="1.5">
                <title>{{ series.name }} · {{ rates[i] }} kbps: {{ displayScore(series.values[i]) }} MOS</title>
              </circle>
            </template>
          </g>
        </svg>
      </div>

      <div class="detail-panel">
        <p class="zoom-title">{{ selectedRate }} kbps · bars span MOS 1.0–5.0 · best first</p>
        <div class="resource-rows">
          <div v-for="bar in bars" :key="bar.name" class="resource-row" :class="{ 'is-faac': bar.name === 'FAAC' }">
            <div class="resource-label"><span>{{ bar.name }}</span><strong>{{ displayScore(bar.value) }}<template v-if="bar.delta !== null"> ({{ bar.delta >= 0 ? '+' : '−' }}{{ Math.abs(bar.delta).toFixed(3) }})</template></strong></div>
            <div class="resource-track bar-track" aria-hidden="true"><div :style="{ width: `${bar.pct}%`, background: bar.color }"></div></div>
          </div>
        </div>
        <p class="chart-note">Parentheses show the gap to FAAC. Near the top of the scale, compare the numbers rather than bar lengths.</p>
      </div>
    </div>

    <p class="chart-note">
      Each encoder is shown at its higher-scoring profile for that bitrate, so points may mix profiles.
      Bitrates are requested targets, not matched actual payload rates. Scores are model estimates, not listening-test results.
    </p>

  </figure>
</template>

<style scoped>
.resource-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 24px 0; }
.resource-cards--single { grid-template-columns: minmax(0, 1fr); }
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
.bar-track { height: 12px; }
.draggable { cursor: ew-resize; touch-action: pan-y; user-select: none; outline-offset: 4px; }
.draggable.dragging { cursor: grabbing; }
.zoom-region { fill: rgba(103, 232, 249, 0.10); }
.hit-area { fill: transparent; }
.cursor-line { stroke: var(--vp-c-text-2); stroke-width: 1; stroke-dasharray: 3 3; }
.cursor-handle { fill: var(--audio-icon-cyan); }
.cursor-text { fill: #0b1220; font-size: 11px; font-weight: 700; font-variant-numeric: tabular-nums; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--vp-c-divider); }
.detail-panel .resource-rows { margin-top: 12px; }
.is-faac .resource-label span { font-weight: 700; }
.quality-chart figcaption { font-weight: 600; font-size: 17px; }
.series-legend { display: flex; flex-wrap: wrap; gap: 6px 18px; margin: 16px 0 4px; padding: 0; list-style: none; font-size: 12px; color: var(--vp-c-text-2); }
.series-legend li { display: flex; align-items: center; gap: 7px; }
.legend-swatch { display: inline-block; width: 20px; height: 3px; border-radius: 2px; }
.quality-svg { display: block; width: 100%; height: auto; overflow: visible; }
.axis-label { fill: var(--vp-c-text-3); font-size: 10px; font-variant-numeric: tabular-nums; }
.axis-title { fill: var(--vp-c-text-2); font-size: 10px; }
.grid-line { stroke: var(--vp-c-divider); stroke-width: 1; }
.quality-chart .chart-note { font-size: 12px; line-height: 20px; color: var(--vp-c-text-2); margin: 12px 0; }
.zoom-title { font-size: 13px; font-weight: 600; color: var(--vp-c-text-2); margin: 0 0 8px; }
@media (max-width: 640px) {
  .detail-grid { grid-template-columns: 1fr; }
  .resource-cards { grid-template-columns: 1fr; }
  .metric-card, .quality-chart { padding: 18px; }
  .metric-card .metric-summary { min-height: 0; }
  .axis-label { font-size: 9px; }
}
</style>
