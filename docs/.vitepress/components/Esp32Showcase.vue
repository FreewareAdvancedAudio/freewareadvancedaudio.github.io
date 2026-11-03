<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ view: 'home' | 'build' | 'devices' | 'memory' }>()

const metrics = [
  {
    icon: 'bolt',
    title: 'ESP32-S3 benchmark',
    value: 'Every profile',
    unit: 'in real time',
    summary: 'AAC-LC, HE-AAC v1 and HE-AAC v2, encode and decode, on an ESP32-S3.',
    rows: [] as { name: string; value: number; label: string; tone: string }[],
    note: 'Relative to real time · higher is better'
  },
  {
    icon: 'sliders',
    title: 'Build only what you need',
    value: 'From 29 KB',
    unit: 'of flash',
    summary: 'Drop HE-AAC, DAB, or DRC at build time. Flash for the same library, measured on ESP32-S3.',
    rows: [
      { name: 'FAAD AAC-LC only', value: 28.8 / 80 * 100, label: '28.8 KB', tone: 'decode' },
      { name: 'FAAD + HE-AAC v1', value: 57.2 / 80 * 100, label: '57.2 KB', tone: 'decode' },
      { name: 'FAAD defaults (+ HE-AAC v2)', value: 76.7 / 80 * 100, label: '76.7 KB', tone: 'decode' },
      { name: 'FAAC AAC-LC only', value: 37.4 / 80 * 100, label: '37.4 KB', tone: 'encode' },
      { name: 'FAAC + HE-AAC v1 (default)', value: 47.4 / 80 * 100, label: '47.4 KB', tone: 'encode' },
      { name: 'FAAC + HE-AAC v2', value: 57.4 / 80 * 100, label: '57.4 KB', tone: 'encode' }
    ],
    note: 'Code + constants + initialized data, two channels · lower is better'
  }
]

// Home-card rows come straight from the ESP32-S3 entry of `devices`, so the two can't drift.
const s3Rows = computed(() => devices[0].rows.flatMap(r => [
  { name: `${r.profile} decode`, value: r.decode.value / deviceMax * 100, label: r.decode.label, tone: 'decode' },
  { name: `${r.profile} encode`, value: r.encode.value / deviceMax * 100, label: r.encode.label, tone: 'encode' }
]))
const shownMetrics = computed(() => metrics
  .filter(m => (props.view === 'build') === (m.icon === 'sliders'))
  .map(m => m.icon === 'bolt' ? { ...m, rows: s3Rows.value } : m))

// Times faster than real time, stereo 44.1/48 kHz music. `value` is the bar length (midpoint of the
// measured range); `label` is what is printed. value 0 / label 'No' means no tested real-time path.
type Speed = { value: number; label: string }
const no: Speed = { value: 0, label: 'No' }
const devices: { name: string; note: string; rows: { profile: string; decode: Speed; encode: Speed }[] }[] = [
  {
    name: 'ESP32-S3', note: '240 MHz · FPU',
    rows: [
      { profile: 'AAC-LC', decode: { value: 11.1, label: '9.3–12.9×' }, encode: { value: 7.5, label: '4.6–10.4×' } },
      { profile: 'HE-AAC v1', decode: { value: 4.5, label: '4.2–4.8×' }, encode: { value: 5.9, label: '4.7–7.1×' } },
      { profile: 'HE-AAC v2', decode: { value: 4.55, label: '4.3–4.8×' }, encode: { value: 2, label: '~2×' } }
    ]
  },
  {
    name: 'Classic ESP32', note: '240 MHz · no PSRAM',
    rows: [
      { profile: 'AAC-LC', decode: { value: 10.4, label: '8.6–12.2×' }, encode: { value: 6, label: '4.0–7.9×' } },
      { profile: 'HE-AAC v1', decode: { value: 3.9, label: '3.6–4.2×' }, encode: { value: 2.8, label: '2.8×+' } },
      { profile: 'HE-AAC v2', decode: no, encode: no }
    ]
  },
  {
    name: 'ESP32-C6', note: '160 MHz · no FPU · Helix decode',
    rows: [
      { profile: 'AAC-LC', decode: { value: 9.35, label: '6.5–12.2×' }, encode: { value: 0.5, label: '0.38–0.60×' } },
      { profile: 'HE-AAC v1', decode: { value: 2.45, label: '2.3–2.6×' }, encode: { value: 0.23, label: '0.22–0.24×' } },
      { profile: 'HE-AAC v2', decode: no, encode: { value: 0.1, label: '~0.1×' } }
    ]
  }
]

const deviceMax = 13
const barWidth = (value: number) => `${Math.max((value / deviceMax) * 100, value > 0 ? 2 : 0)}%`

const memoryRows = [
  { label: 'AAC-LC speed', value: 100, display: '100%' },
  { label: 'HE-AAC speed', value: 87, display: '~87%' }
]
</script>

<template>
  <div class="esp32-showcase">
    <div v-if="view === 'home' || view === 'build'" class="esp32-metric-grid esp32-metric-grid--single">
      <article v-for="metric in shownMetrics" :key="metric.title" class="esp32-card">
        <div class="esp32-card-heading">
          <i :class="`fa-solid fa-${metric.icon}`" aria-hidden="true"></i>
          <h3>{{ metric.title }}</h3>
        </div>
        <div class="esp32-card-value">{{ metric.value }} <span>{{ metric.unit }}</span></div>
        <p class="esp32-card-summary">{{ metric.summary }}</p>
        <div class="esp32-resource-rows">
          <div v-for="row in metric.rows" :key="row.name" class="esp32-resource-row">
            <div class="esp32-resource-label"><span>{{ row.name }}</span><strong>{{ row.label }}</strong></div>
            <div class="esp32-track" aria-hidden="true">
              <div class="esp32-fill" :class="`esp32-fill--${row.tone}`" :style="{ width: `${row.value}%` }"></div>
            </div>
          </div>
        </div>
        <p class="esp32-card-note">{{ metric.note }}</p>
      </article>
    </div>

    <figure v-else-if="view === 'devices'" class="esp32-chart-card">
      <figcaption>Speed across the ESP32 family</figcaption>
      <p class="esp32-chart-deck">Rounded speed relative to real time. The ESP32-S3 and classic ESP32 land in the same range; the FPU-less ESP32-C6 is the outlier.</p>
      <div class="esp32-device-list">
        <div v-for="device in devices" :key="device.name" class="esp32-device">
          <div class="esp32-device-head">
            <strong>{{ device.name }}</strong>
            <span>{{ device.note }}</span>
          </div>
          <div class="esp32-device-bars">
            <template v-for="row in device.rows" :key="row.profile">
              <div class="esp32-bar-row">
                <span class="esp32-bar-label">{{ row.profile }} decode</span>
                <span class="esp32-bar-value">{{ row.decode.label }}</span>
                <div class="esp32-bar-track" aria-hidden="true">
                  <div class="esp32-bar-fill esp32-bar-fill--decode" :style="{ width: barWidth(row.decode.value) }"></div>
                </div>
              </div>
              <div class="esp32-bar-row">
                <span class="esp32-bar-label">{{ row.profile }} encode</span>
                <span class="esp32-bar-value">{{ row.encode.label }}</span>
                <div class="esp32-bar-track" aria-hidden="true">
                  <div class="esp32-bar-fill esp32-bar-fill--encode" :style="{ width: barWidth(row.encode.value) }"></div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
      <p class="esp32-chart-note">The dashed line marks 1× real time. Bars show the middle of the measured range. HE-AAC v2 encode is a single 48 kHz stereo scenario. See the full notes for exact results.</p>
    </figure>

    <figure v-else class="esp32-chart-card">
      <figcaption>Internal RAM vs PSRAM</figcaption>
      <p class="esp32-chart-deck">Moving decoder state to PSRAM frees internal RAM. AAC-LC keeps full speed; HE-AAC gives up about a tenth.</p>
      <div class="esp32-compare-grid">
        <div class="esp32-compare-panel">
          <span class="esp32-compare-label">Internal RAM</span>
          <strong>~100 KB</strong>
          <span>state held internally</span>
        </div>
        <div class="esp32-compare-panel is-highlight">
          <span class="esp32-compare-label">PSRAM</span>
          <strong>~16 KB</strong>
          <span>internal RAM after the move</span>
        </div>
      </div>
      <div class="esp32-memory-rows">
        <div v-for="row in memoryRows" :key="row.label" class="esp32-bar-row">
          <span class="esp32-bar-label">{{ row.label }}</span>
          <span class="esp32-bar-value">{{ row.display }}</span>
          <div class="esp32-bar-track" aria-hidden="true">
            <div class="esp32-bar-fill esp32-bar-fill--memory" :style="{ width: `${row.value}%` }"></div>
          </div>
        </div>
      </div>
      <p class="esp32-chart-note">Speed relative to state in internal RAM. PSRAM is effectively free for AAC-LC and costs about a tenth for HE-AAC. It is a memory-headroom trade, not a bitrate requirement.</p>
    </figure>
  </div>
</template>
