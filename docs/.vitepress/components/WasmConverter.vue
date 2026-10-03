<template>
  <div class="wasm-converter-container">
    <div class="converter-card">
      <div class="converter-header">
        <h3 class="converter-title"><i class="fa-solid fa-bolt" aria-hidden="true"></i> Try FAAC: Audio to M4A</h3>
        <p class="converter-subtitle">
          <strong>Your audio stays in your browser.</strong> Encode to M4A with FAAC and download the result. Input format support depends on your browser. For music comparisons, start with a lossless source.
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
        </div>
        <input
          type="file"
          ref="fileInput"
          class="hidden-file-input"
          accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm,.wma"
          @change="handleFileChange"
        />
      </div>

      <!-- Encoding Settings Panel -->
      <div class="controls-grid" v-if="selectedFile">
        <div class="control-group">
          <label class="control-label" for="bitrate">
            Bitrate
            <span class="value-badge">{{ bitrate }} kbps</span>
          </label>
          <div class="slider-wrapper">
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
          <div class="preset-buttons">
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
        </div>

        <div class="control-group">
          <label class="control-label" for="aac-profile">AAC profile</label>
          <select id="aac-profile" v-model="objectType" :disabled="isProcessing" class="control-select">
            <option value="auto">Auto</option>
            <option value="lc">AAC-LC</option>
            <option value="he-v1">HE-AAC v1 (SBR)</option>
          </select>
        </div>
      </div>

      <!-- Convert Action & Progress Bar -->
      <div class="action-area" v-if="selectedFile">
        <button
          class="convert-btn"
          :disabled="isProcessing"
          @click="startEncoding"
        >
          <span v-if="!isProcessing">
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
      <div class="results-section" v-if="results.length > 0">
        <h4 class="results-title"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Encoded M4A Output</h4>
        <div class="result-card" v-for="item in results" :key="item.url">
          <div class="result-info">
            <span class="result-name">{{ item.name }}</span>
            <span class="result-meta">{{ item.details }}</span>
          </div>

          <div class="result-actions">
            <audio ref="resultPlayers" controls :src="item.url" class="audio-player"></audio>
            <a :href="item.url" :download="item.name" class="download-link">
              <i class="fa-solid fa-download" aria-hidden="true"></i> Download .m4a
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { withBase } from 'vitepress'

const fileInput = ref(null)
const selectedFile = ref(null)
const isDragOver = ref(false)
const bitrate = ref(128)
const objectType = ref('auto')
const isProcessing = ref(false)
const progress = ref(0)
const statusMessage = ref('')
const results = ref([])
const resultPlayers = ref([])

function triggerFileInput() {
  if (isProcessing.value) return
  fileInput.value?.click()
}

function handleFileChange(event) {
  if (isProcessing.value) return
  const files = event.target.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
  }
}

function handleDrop(event) {
  if (isProcessing.value) return
  isDragOver.value = false
  const files = event.dataTransfer.files
  if (files && files.length > 0) {
    selectedFile.value = files[0]
  }
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

async function startEncoding() {
  if (!selectedFile.value) return

  for (const player of resultPlayers.value) player.pause()

  isProcessing.value = true
  progress.value = 0
  statusMessage.value = 'Decoding input audio via Web Audio API...'

  try {
    const rawArrayBuffer = await selectedFile.value.arrayBuffer()
    progress.value = 10

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const decodedBuffer = await audioCtx.decodeAudioData(rawArrayBuffer.slice(0))
    const sampleRate = decodedBuffer.sampleRate
    const channels = decodedBuffer.numberOfChannels
    const pcm16Data = audioBufferToPcm16(decodedBuffer)
    if (audioCtx.close) await audioCtx.close()

    statusMessage.value = 'Preparing Web Worker encoding task...'
    progress.value = 15

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
        const outName = `${baseName}_faac_${bitrate.value}k.m4a`
        const outBlob = new Blob([outputBuffer], { type: 'audio/mp4' })
        const url = URL.createObjectURL(outBlob)
        const profileLabel = msg.resolvedObjectType === 'he-v1' ? 'HE-AAC v1' : 'AAC-LC'

        results.value.unshift({
          name: outName,
          details: `${bitrate.value} kbps ABR • ${profileLabel} • ${sampleRate} Hz • ${formatChannelLayout(channels)}`,
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

    worker.postMessage({
      pcm16Data: pcm16Data.buffer,
      bitrate: bitrate.value,
      objectType: objectType.value,
      sampleRate,
      channels
    }, [pcm16Data.buffer])

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
  padding: 1.5rem;
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

.control-select {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #f8fafc;
  padding: 0.6rem;
  font-size: 0.9rem;
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
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
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
  font-size: 0.75rem;
  color: #64748b;
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

@media (min-width: 640px) {
  .audio-player {
    flex: 1;
  }
}

.download-link {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.download-link:hover {
  background: #10b981;
  color: #0f172a;
}
</style>
