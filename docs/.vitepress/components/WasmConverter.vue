<template>
  <div class="wasm-converter-container">
    <div class="converter-card">
      <div class="converter-header">
        <h3 class="converter-title"><i class="fa-solid fa-bolt" aria-hidden="true"></i> Try FAAC: Audio to M4A</h3>
        <p class="converter-subtitle">
          <strong>Your audio stays in your browser.</strong> Choose a file to decode it once, then compare settings and make multiple M4A encodes without decoding it again.
        </p>
      </div>

      <!-- Drag & Drop File Zone -->
      <div
        class="drop-zone"
        role="button"
        tabindex="0"
        aria-label="Choose an audio file"
        @keydown.enter.prevent="triggerFileInput"
        @keydown.space.prevent="triggerFileInput"
        :class="{ 'is-dragover': isDragOver, 'has-file': selectedFile }"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
        @drop.prevent="handleDrop"
        @click="triggerFileInput"
      >
        <div class="drop-icon"><i class="fa-solid fa-file-audio" aria-hidden="true"></i></div>
        <div class="drop-text" v-if="!selectedFile">
          Drag & drop <strong>an audio file</strong> (WAV, MP3, FLAC, OGG, M4A...) here, or <span class="browse-link">browse file</span>
        </div>
        <div class="drop-text" v-else>
          <strong>Selected File:</strong> {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          <span v-if="decodedAudio" class="source-meta"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Ready · {{ formatDuration(decodedAudio.duration) }} · {{ decodedAudio.sampleRate }} Hz · {{ formatChannelLayout(decodedAudio.channels) }}</span>
        </div>
        <input
          type="file"
          ref="fileInput"
          class="hidden-file-input"
          accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm,.wma"
          @change="handleFileChange"
        />
      </div>

      <!-- Bitrate or quality is the primary control; less common choices stay available in More settings. -->
      <div class="primary-setting" v-if="selectedFile">
        <div class="control-group">
          <label v-if="rateControl !== 'vbr'" class="control-label" for="bitrate">
            Target bitrate
            <span class="value-badge">{{ bitrate }} kbps</span>
          </label>
          <label v-else class="control-label" for="quality">
            Quality <span class="value-badge">{{ quantQuality }}</span>
          </label>
          <div v-if="rateControl !== 'vbr'" class="slider-wrapper">
            <input
              id="bitrate"
              type="range"
              :disabled="isProcessing"
              v-model.number="bitrate"
              min="32"
              max="320"
              step="16"
              class="range-slider"
            />
          </div>
          <div v-if="rateControl !== 'vbr'" class="preset-buttons">
            <button
              v-for="preset in [32, 48, 64, 96, 128, 160, 192, 256, 320]"
              :key="preset"
              class="preset-btn"
              :class="{ active: bitrate === preset }"
              :disabled="isProcessing"
              @click="bitrate = preset"
            >
              {{ preset }}k
            </button>
          </div>
          <input v-else id="quality" v-model.number="quantQuality" type="range" min="1" :max="maxQuantQuality" step="1" class="range-slider" :disabled="isProcessing || isDecoding" />
          <p v-if="rateControl === 'vbr'" class="control-hint">Higher quality uses more data. Range: 1–{{ maxQuantQuality }}<span v-if="maxQuantQuality === 75"> for HE-AAC v1</span>; default: 100.</p>
          <div v-if="rateControl === 'vbr'" class="preset-buttons quality-presets" aria-label="VBR quality presets">
            <button v-for="preset in qualityPresets" :key="preset"
              class="preset-btn" :class="{ active: quantQuality === preset }"
              :disabled="isProcessing || isDecoding" @click="quantQuality = preset">{{ preset }}</button>
          </div>
        </div>
      </div>

      <details class="advanced-settings" v-if="selectedFile">
        <summary>More settings <span>{{ rateControl.toUpperCase() }} · {{ objectType === 'auto' ? 'Auto profile' : objectType === 'lc' ? 'AAC-LC' : 'HE-AAC v1' }}</span></summary>
        <div class="controls-grid">
          <div class="control-group">
            <label class="control-label" for="rate-control">Rate control</label>
            <div id="rate-control" class="choice-segments" role="group" aria-label="Rate control">
              <button v-for="mode in rateControlOptions" :key="mode.value" type="button"
                class="choice-segment" :class="{ active: rateControl === mode.value }"
                :aria-pressed="rateControl === mode.value" :disabled="isProcessing || isDecoding"
                @click="rateControl = mode.value">
                <span>{{ mode.label }}</span><small>{{ mode.hint }}</small>
              </button>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="aac-profile">AAC profile</label>
            <div id="aac-profile" class="choice-segments profile-segments" role="group" aria-label="AAC profile">
              <button v-for="profile in profileOptions" :key="profile.value" type="button"
                class="choice-segment" :class="{ active: objectType === profile.value }"
                :aria-pressed="objectType === profile.value" :disabled="isProcessing || isDecoding"
                @click="objectType = profile.value; normalizeQuality()">
                <span>{{ profile.label }}</span><small>{{ profile.hint }}</small>
              </button>
            </div>
          </div>
        </div>
      </details>

      <!-- Convert Action & Progress Bar -->
      <div class="action-area" v-if="selectedFile">
        <button
          ref="convertButton"
          class="convert-btn"
          :disabled="isProcessing || isDecoding || !decodedAudio"
          @click="startEncoding"
        >
          <span v-if="isDecoding"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Decoding audio…</span>
          <span v-else-if="!isProcessing">
            <i class="fa-solid fa-file-audio" aria-hidden="true"></i> Convert to M4A
          </span>
          <span v-else>
            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Encoding… {{ progress }}%
          </span>
        </button>

        <div class="progress-bar-bg" v-if="isProcessing" role="progressbar"
             aria-label="Audio conversion" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar-fill" :style="{ width: progress + '%' }"></div>
        </div>

        <div class="status-msg" role="status" aria-live="polite" v-if="statusMessage">
          {{ statusMessage }}
        </div>
      </div>

      <!-- Encoded Audio Results -->
      <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ resultAnnouncement }}</p>
      <div class="results-section" v-if="results.length > 0">
        <h4 class="results-title"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Encoded M4A Output</h4>
        <div class="result-card" v-for="item in results" :key="item.url">
          <div class="result-info">
            <span class="result-name">{{ item.name }}</span>
            <div class="result-meta">
              <span v-for="detail in item.details" :key="detail.label" class="metadata-chip">
                <span class="metadata-label">{{ detail.label }}</span>
                <span>{{ detail.value }}</span>
              </span>
            </div>
          </div>

          <div class="result-actions">
            <audio ref="resultPlayers" controls :src="item.url" class="audio-player"></audio>
            <div class="result-action-buttons">
              <a :href="item.url" :download="item.name" class="icon-action download-link"
                :aria-label="`Download ${item.name}`" title="Download output">
                <i class="fa-solid fa-download" aria-hidden="true"></i>
              </a>
              <button ref="discardButtons" type="button" class="icon-action discard-button"
                :aria-label="`Discard ${item.name}`" title="Discard output"
                @click="discardResult(item)">
                <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { withBase } from 'vitepress'

const fileInput = ref(null)
const selectedFile = ref(null)
const decodedAudio = ref(null)
const isDecoding = ref(false)
let decodeRequest = 0
const isDragOver = ref(false)
const bitrate = ref(128)
const quantQuality = ref(100)
const rateControl = ref('abr')
const rateControlOptions = [
  { value: 'vbr', label: 'VBR', hint: 'Quality' },
  { value: 'abr', label: 'ABR', hint: 'Average bitrate' },
  { value: 'cbr', label: 'CBR', hint: 'Constant bitrate' },
]
const profileOptions = [
  { value: 'auto', label: 'Auto', hint: 'Recommended' },
  { value: 'lc', label: 'AAC-LC', hint: 'Standard' },
  { value: 'he-v1', label: 'HE-AAC v1', hint: 'SBR' },
]
const objectType = ref('auto')
const isProcessing = ref(false)
const progress = ref(0)
const statusMessage = ref('')
const results = ref([])
const resultPlayers = ref([])
const convertButton = ref(null)
const discardButtons = ref([])
const resultAnnouncement = ref('')
const maxQuantQuality = computed(() => objectType.value === 'he-v1' ? 75 : 5000)
const qualityPresets = computed(() => [20, 30, 40, 50, 60, 75, 100, 150, 200, 300, 500, 800].filter(value => value <= maxQuantQuality.value))

function normalizeQuality() {
  if (quantQuality.value > maxQuantQuality.value) quantQuality.value = maxQuantQuality.value
}

async function discardResult(item) {
  const index = results.value.indexOf(item)
  if (index < 0) return
  resultPlayers.value[index]?.pause()
  URL.revokeObjectURL(item.url)
  results.value.splice(index, 1)
  resultAnnouncement.value = `Discarded ${item.name}.`
  await nextTick()
  const nextButton = discardButtons.value[Math.min(index, discardButtons.value.length - 1)]
  const focusTarget = nextButton || convertButton.value
  focusTarget?.focus()
}

function triggerFileInput() {
  if (isProcessing.value) return
  fileInput.value?.click()
}

function handleFileChange(event) {
  if (isProcessing.value) return
  const files = event.target.files
  if (files && files.length > 0) {
    selectFile(files[0])
  }
  event.target.value = ''
}

function handleDrop(event) {
  if (isProcessing.value) return
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    selectFile(files[0])
  }
}

function selectFile(file) {
  selectedFile.value = file
  decodedAudio.value = null
  statusMessage.value = ''
  const request = ++decodeRequest
  void decodeSelectedFile(file, request)
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatChannelLayout(channels) {
  if (channels === 1) return 'Mono'
  if (channels === 2) return 'Stereo'
  if (channels === 6) return '5.1 Surround'
  if (channels === 8) return '7.1 Surround'
  return `${channels} Channels`
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function audioBufferToPcm16(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const pcm16 = new Int16Array(length * numChannels)

  let offset = 0
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = audioBuffer.getChannelData(channel)[i]
      sample = Math.max(-1, Math.min(1, sample))
      pcm16[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
    }
  }

  return pcm16
}

async function decodeSelectedFile(file, request) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    statusMessage.value = 'This browser does not provide audio decoding.'
    return
  }
  isDecoding.value = true
  statusMessage.value = 'Decoding audio for reuse…'
  let audioCtx
  try {
    audioCtx = new AudioContextClass()
    const decodedBuffer = await audioCtx.decodeAudioData(await file.arrayBuffer())
    if (request !== decodeRequest) return
    const pcm16Data = audioBufferToPcm16(decodedBuffer)
    decodedAudio.value = {
      pcm16Data,
      sampleRate: decodedBuffer.sampleRate,
      channels: decodedBuffer.numberOfChannels,
      duration: decodedBuffer.duration,
    }
    statusMessage.value = 'Audio decoded and ready to encode.'
  } catch (err) {
    if (request === decodeRequest) statusMessage.value = 'Could not decode this audio: ' + err.message
  } finally {
    if (audioCtx?.close) {
      try { await audioCtx.close() } catch {}
    }
    if (request === decodeRequest) isDecoding.value = false
  }
}

async function startEncoding() {
  if (!selectedFile.value || !decodedAudio.value || isDecoding.value) return

  for (const player of resultPlayers.value) player.pause()

  isProcessing.value = true
  progress.value = 0
  statusMessage.value = 'Preparing Web Worker encoding task…'

  try {
    const { pcm16Data, sampleRate, channels, duration } = decodedAudio.value
    progress.value = 5
    const workerUrl = new URL(withBase('/wasm/faac-worker.js'), window.location.origin).href
    const worker = new Worker(workerUrl)

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'progress') {
        progress.value = msg.progress
        statusMessage.value = msg.status
      } else if (msg.type === 'complete') {
        progress.value = 100
        statusMessage.value = 'FAAC M4A encoding complete!'
        isProcessing.value = false

        const outputBuffer = new Uint8Array(msg.encodedBytes)
        const baseName = selectedFile.value.name.replace(/\.[^/.]+$/, "")
        const profileLabel = msg.resolvedObjectType === 'he-v1' ? 'he-aac-v1' : 'aac-lc'
        const rateLabel = msg.resolvedRateControl === 'vbr'
          ? `vbr-q${msg.resolvedQuality}`
          : `${msg.resolvedRateControl}-${Math.round(msg.resolvedBitrate / 1000)}k`
        const outName = `${baseName}-${rateLabel}-${profileLabel}.m4a`
        const outBlob = new Blob([outputBuffer], { type: 'audio/mp4' })
        const url = URL.createObjectURL(outBlob)
        const profileName = msg.resolvedObjectType === 'he-v1' ? 'HE-AAC v1' : 'AAC-LC'

        const averageKbps = duration > 0 ? outputBuffer.byteLength * 8 / duration / 1000 : 0
        const modeLabel = msg.resolvedRateControl.toUpperCase()
        const details = [
          {
            label: 'Encoding',
            value: `${profileName} · ${modeLabel} · ${msg.resolvedRateControl === 'vbr' ? `Quality ${msg.resolvedQuality}` : `Target ${Math.round(msg.resolvedBitrate / 1000)} kbps`}`,
          },
          { label: 'Input', value: `${sampleRate} Hz · ${formatChannelLayout(channels)} · ${formatDuration(duration)}` },
          { label: 'Output', value: `${formatFileSize(outputBuffer.byteLength)} · ~${Math.round(averageKbps)} kbps` },
        ]
        results.value.unshift({
          name: outName,
          details,
          url: url,
          rawBuffer: outputBuffer
        })

        worker.terminate()
      } else if (msg.type === 'error') {
        statusMessage.value = 'Worker Error: ' + msg.message
        isProcessing.value = false
        worker.terminate()
      }
    }

    worker.onerror = () => {
      statusMessage.value = 'The audio converter could not run. Please reload the page and try again.'
      isProcessing.value = false
      worker.terminate()
    }

    const workerPcm = pcm16Data.slice()
    worker.postMessage({
      pcm16Data: workerPcm.buffer,
      bitrate: bitrate.value,
      rateControl: rateControl.value,
      quantQuality: quantQuality.value,
      objectType: objectType.value,
      sampleRate,
      channels
    }, [workerPcm.buffer])

  } catch (err) {
    statusMessage.value = 'Error: ' + err.message
    isProcessing.value = false
  }
}
</script>

<style scoped>
.wasm-converter-container {
  margin: 1.5rem 0;
  font-family: var(--vp-font-family-base);
}

.converter-card {
  background: var(--vp-c-bg-elv);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: clamp(1rem, 3vw, 1.5rem);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.converter-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #10b981;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.converter-subtitle {
  margin: 0 0 1.25rem 0;
  font-size: 0.9rem;
  color: #94a3b8;
  line-height: 1.5;
}

.drop-zone {
  border: 2px dashed rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  padding: 2rem 1rem;
  text-align: center;
  background: rgba(15, 23, 42, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 1.25rem;
  min-height: 7rem;
  display: grid;
  place-content: center;
  gap: 0.25rem;
}

.drop-zone:focus-visible {
  outline: 3px solid var(--vp-c-brand-1);
  outline-offset: 4px;
}

.drop-zone:hover, .drop-zone.is-dragover {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.drop-zone.has-file {
  border-style: solid;
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.12);
}

.drop-icon {
  font-size: 2.25rem;
  margin-bottom: 0.5rem;
  color: #34d399;
}

.drop-text {
  font-size: 0.95rem;
  color: #e2e8f0;
}

.source-meta {
  display: block;
  margin-top: 0.55rem;
  color: #6ee7b7;
  font-size: 0.82rem;
}

.browse-link {
  color: #34d399;
  text-decoration: underline;
  font-weight: 600;
}

.hidden-file-input {
  display: none;
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.control-group {
  min-width: 0;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.32);
}

.primary-setting {
  margin-bottom: 0.8rem;
}

.primary-setting .control-group {
  padding: 1.15rem;
  border-color: rgba(16, 185, 129, 0.28);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(15, 23, 42, 0.28));
}

.primary-setting .control-label {
  font-size: 1rem;
}

.primary-setting .value-badge {
  padding: 0.35rem 0.7rem;
  font-size: 1rem;
}

.advanced-settings {
  margin-bottom: 1.25rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.2);
}

.advanced-settings summary {
  min-height: 2.75rem;
  padding: 0.65rem 0.85rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.advanced-settings summary span {
  float: right;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 500;
}

.advanced-settings .controls-grid {
  padding: 0 0.75rem 0.75rem;
  margin-bottom: 0;
}

@media (min-width: 640px) {
  .controls-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.control-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #cbd5e1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.value-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
}

.choice-segments {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.25rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 10px;
  background: rgba(2, 6, 23, 0.46);
}

.choice-segment {
  display: flex;
  min-width: 0;
  min-height: 3.15rem;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.12rem;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #cbd5e1;
  cursor: pointer;
  font: inherit;
  padding: 0.35rem 0.2rem;
  touch-action: manipulation;
}

.choice-segment span {
  font-size: 0.83rem;
  font-weight: 700;
  line-height: 1.2;
}

.choice-segment small {
  color: #94a3b8;
  font-size: 0.67rem;
  line-height: 1.2;
}

.choice-segment:hover:not(:disabled) {
  background: rgba(148, 163, 184, 0.12);
}

.choice-segment.active {
  border-color: rgba(16, 185, 129, 0.55);
  background: rgba(16, 185, 129, 0.16);
  color: #6ee7b7;
}

.choice-segment.active small {
  color: #a7f3d0;
}

.choice-segment:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}

.choice-segment:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.slider-wrapper {
  display: flex;
  align-items: center;
}

.range-slider {
  width: 100%;
  accent-color: #10b981;
}

.preset-buttons {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.preset-btn {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  min-height: 2.5rem;
  min-width: 2.8rem;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.control-hint {
  margin: 0;
  color: #94a3b8;
  font-size: 0.8rem;
}

.preset-btn:hover, .preset-btn.active {
  background: #10b981;
  color: #0f172a;
  font-weight: 700;
  border-color: #10b981;
}

.convert-btn {
  width: 100%;
  background: linear-gradient(90deg, #10b981, #06b6d4);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 0.85rem 1.2rem;
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.convert-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.convert-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: #0f172a;
  border-radius: 3px;
  margin-top: 0.75rem;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #38bdf8);
  transition: width 0.15s ease;
}

.status-msg {
  font-size: 0.825rem;
  color: #94a3b8;
  margin-top: 0.5rem;
  text-align: center;
}

.results-section {
  margin-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}

.results-title {
  font-size: 1rem;
  margin: 0 0 0.75rem 0;
  color: #34d399;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.result-card {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.result-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f8fafc;
  display: block;
}

.result-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
  gap: 0.5rem;
  margin-top: 0.6rem;
}

.metadata-chip {
  min-width: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.78rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.metadata-label {
  display: block;
  margin-bottom: 0.15rem;
  color: #94a3b8;
  font-size: 0.67rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.result-actions {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.5rem;
}

@media (min-width: 640px) {
  .result-actions {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
}

.audio-player {
  height: 36px;
  width: 100%;
}

@media (max-width: 420px) {
  .converter-title {
    font-size: 1.15rem;
  }

  .drop-zone {
    padding: 1.5rem 0.75rem;
  }

  .preset-buttons {
    gap: 0.35rem;
  }

  .preset-btn {
    flex: 1 0 3rem;
  }
}

@media (min-width: 640px) {
  .audio-player {
    flex: 1;
  }
}

.result-action-buttons {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.icon-action {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  touch-action: manipulation;
}

.download-link {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  text-decoration: none;
}

.download-link:hover,
.download-link:focus-visible {
  background: #10b981;
  color: #0f172a;
}

.discard-button {
  background: rgba(248, 113, 113, 0.1);
  color: #fca5a5;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.discard-button:hover,
.discard-button:focus-visible {
  background: #ef4444;
  color: #fff;
}

.icon-action:focus-visible {
  outline: 2px solid #e2e8f0;
  outline-offset: 2px;
}
</style>
