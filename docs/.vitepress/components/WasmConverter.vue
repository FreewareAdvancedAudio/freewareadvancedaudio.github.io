<template>
  <div class="wasm-converter-container">
    <div class="converter-card">
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
          Drop another audio file here, or <span class="browse-link">browse to replace it</span>
        </div>
        <input
          type="file"
          ref="fileInput"
          class="hidden-file-input"
          accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a,.aac,.webm,.wma"
          @change="handleFileChange"
        />
      </div>

      <!-- Opt-in demo song: a sibling of the drop zone so its click doesn't open the file picker. -->
      <div v-if="!selectedFile" class="demo-row">
        <span>No file handy?</span>
        <button type="button" class="demo-btn" :disabled="isDemoLoading" @click="loadDemo">
          <i :class="isDemoLoading ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play'" aria-hidden="true"></i>
          {{ isDemoLoading ? 'Downloading…' : 'Try a demo song' }}
        </button>
        <span v-if="demoError" class="demo-error" role="alert">{{ demoError }}</span>
      </div>

      <!-- Original Audio Player -->
      <div v-if="selectedFile" class="result-card original-audio-card">
        <div class="result-card-header">
          <div class="result-info">
            <span class="result-name">{{ selectedFile.name }}</span>
            <div class="result-meta">
              <span class="metadata-chip">
                <span class="metadata-label">Source file</span>
                {{ formatFileSize(selectedFile.size) }} · {{ selectedFile.name.split('.').pop()?.toUpperCase() || 'Audio' }}
              </span>
              <span class="metadata-chip">
                <span class="metadata-label">Audio</span>
                <template v-if="decodedAudio">{{ formatSampleRate(decodedAudio.sampleRate) }} · {{ formatChannelLayout(decodedAudio.channels) }} · {{ decodedAudio.bitDepth }}-bit</template>
                <template v-else>{{ isDecoding ? 'Decoding audio…' : 'Preparing audio…' }}</template>
              </span>
            </div>
          </div>
        </div>

        <div v-if="originalAudioUrl" class="result-player-fullwidth">
          <WaveformPlayer
            ref="originalPlayerRef"
            track-id="original"
            aria-label="Original audio"
            :src="originalAudioUrl"
            :peaks="originalPeaks"
            :duration="decodedAudio?.duration || 0"
            :active-track-id="activeTrackId"
            :shared-time="isReferenceMatch(currentReferenceId) ? sharedPlaybackTime : 0"
            :playback-start-time="isReferenceMatch(currentReferenceId) ? sharedPlaybackStartTime : null"
            :loop-region="isReferenceMatch(currentReferenceId) ? sharedLoopRegion : { start: 0, end: null, repeat: false }"
            :muted="isGlobalMuted"
            :loading="isDecoding"
            @play="onTrackPlay($event, currentReferenceId)"
            @pause="onTrackPause($event, currentReferenceId)"
            @seek="onTrackSeek($event, currentReferenceId)"
            @timeupdate="onTrackTimeUpdate($event, currentReferenceId)"
            @update:playback-start-time="onUpdatePlaybackStartTime($event, currentReferenceId)"
            @update:loop-region="onUpdateLoopRegion($event, currentReferenceId)"
            @update:muted="onUpdateGlobalMuted"
          />
        </div>
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
        <summary>More settings <span>{{ rateControl.toUpperCase() }} · {{ objectType === 'auto' ? 'Auto profile' : objectType === 'lc' ? 'AAC-LC' : 'HE-AAC v1' }} · {{ resampleMode === 'auto' ? 'Auto rate' : resampleMode === 'keep' ? 'Keep rate' : formatSampleRate(resampleHz) }}</span></summary>
        <div class="controls-grid">
          <div class="control-group">
            <label class="control-label" for="rate-control">Rate control</label>
            <div id="rate-control" class="choice-segments" role="group" aria-label="Rate control">
              <button v-for="mode in rateControlOptions" :key="mode.value" type="button"
                class="choice-segment" :class="{ active: rateControl === mode.value }"
                :aria-pressed="rateControl === mode.value" :disabled="isProcessing || isDecoding"
                @click="rateControl = mode.value">
                <span>{{ mode.label }}</span><small v-if="mode.hint">{{ mode.hint }}</small>
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
                <span>{{ profile.label }}</span><small v-if="profile.hint">{{ profile.hint }}</small>
              </button>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label" for="sample-rate">Sample rate</label>
            <div id="sample-rate" class="choice-segments" role="group" aria-label="Output sample rate">
              <button v-for="mode in resampleOptions" :key="mode.value" type="button"
                class="choice-segment" :class="{ active: resampleMode === mode.value }"
                :aria-pressed="resampleMode === mode.value" :disabled="isProcessing || isDecoding || (mode.value === 'custom' && !customRates.length)"
                @click="resampleMode = mode.value">
                <span>{{ mode.label }}</span><small v-if="mode.hint">{{ mode.hint }}</small>
              </button>
            </div>
            <select v-if="resampleMode === 'custom' && customRates.length" v-model.number="resampleHz"
              class="rate-select" aria-label="Output sample rate in kHz" :disabled="isProcessing || isDecoding">
              <option v-for="rate in customRates" :key="rate" :value="rate">{{ formatSampleRate(rate) }}</option>
            </select>
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
          <span v-if="isDecoding"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Decoding audio… {{ progress }}%</span>
          <span v-else-if="!isProcessing">
            <i class="fa-solid fa-file-audio" aria-hidden="true"></i> Convert to M4A
          </span>
          <span v-else>
            <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Encoding… {{ progress }}%
          </span>
        </button>

        <div class="progress-bar-bg" v-if="isDecoding || isProcessing || progress === 100" role="progressbar"
             aria-label="Audio conversion" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar-fill" :style="{ transform: `scaleX(${progress / 100})` }"></div>
        </div>

        <div class="status-msg" role="status" aria-live="polite" v-if="statusMessage">
          {{ statusMessage }}
        </div>
      </div>

      <!-- Encoded Audio Results -->
      <p class="visually-hidden" aria-live="polite" aria-atomic="true">{{ resultAnnouncement }}</p>
      <div class="results-section" v-if="results.length > 0">
        <h4 class="results-title"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Encoded M4A Output</h4>
        <div class="result-card" v-for="item in results" :key="item.id">
          <!-- Card Header: Title & Meta Chips -->
          <div class="result-card-header">
            <div class="result-info">
              <span class="result-name">{{ item.name }}</span>
              <div class="result-meta">
                <span v-for="detail in item.details" :key="detail.label" class="metadata-chip">
                  <span class="metadata-label">{{ detail.label }}</span>
                  <span>{{ detail.value }}</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Waveform Player spans 100% full width with Download and Discard buttons in the action slot -->
          <div class="result-player-fullwidth">
            <WaveformPlayer
              :track-id="item.id"
              :aria-label="item.name"
              :src="item.url"
              :peaks="item.peaks"
              :duration="item.duration || decodedAudio?.duration || 0"
              :active-track-id="activeTrackId"
              :shared-time="isReferenceMatch(item.referenceId) ? sharedPlaybackTime : 0"
              :playback-start-time="isReferenceMatch(item.referenceId) ? sharedPlaybackStartTime : null"
              :loop-region="isReferenceMatch(item.referenceId) ? sharedLoopRegion : { start: 0, end: null, repeat: false }"
              :muted="isGlobalMuted"
              :loading="false"
              @play="onTrackPlay($event, item.referenceId)"
              @pause="onTrackPause($event, item.referenceId)"
              @seek="onTrackSeek($event, item.referenceId)"
              @timeupdate="onTrackTimeUpdate($event, item.referenceId)"
              @update:playback-start-time="onUpdatePlaybackStartTime($event, item.referenceId)"
              @update:loop-region="onUpdateLoopRegion($event, item.referenceId)"
            >
              <template #actions>
                <!-- Download Button (matches exact circular player-btn dimensions) -->
                <a
                  :href="item.url"
                  :download="item.name"
                  class="player-btn download-btn"
                  :aria-label="`Download ${item.name}`"
                  title="Download output"
                >
                  <i class="fa-solid fa-download" aria-hidden="true"></i>
                </a>

                <!-- Discard Button (matches exact circular player-btn dimensions) -->
                <button
                  ref="discardButtons"
                  type="button"
                  class="player-btn discard-btn"
                  :aria-label="`Discard ${item.name}`"
                  title="Discard output"
                  @click="discardResult(item)"
                >
                  <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
                </button>
              </template>
            </WaveformPlayer>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import WaveformPlayer from './WaveformPlayer.vue'
import { computeWaveformPeaksFromPcm, computeWaveformPeaksFromAudioBuffer } from '../utils/waveform.js'

const fileInput = ref(null)
const selectedFile = ref(null)
const originalAudioUrl = ref(null)
const originalPlayerRef = ref(null)
const originalPeaks = ref([])
const referenceMaxRms = ref(0.001) // Track reference file's peak RMS for relative normalization
const decodedAudio = ref(null)
const isDecoding = ref(false)

// Reference identifier for currently loaded source file
const currentReferenceId = computed(() => {
  return selectedFile.value ? `${selectedFile.value.name}-${selectedFile.value.size}` : ''
})

// Synchronized playback state across all versions of the song
const activeTrackId = ref('')
const activeReferenceId = ref('')
const sharedPlaybackTime = ref(0)
const sharedPlaybackStartTime = ref(null)
const sharedLoopRegion = ref({ start: 0, end: null, repeat: false })
const isGlobalMuted = ref(false)

let decodeRequest = 0
const isDragOver = ref(false)
const isDemoLoading = ref(false)
const demoError = ref('')
let demoRequest = 0
const bitrate = ref(128)
const quantQuality = ref(100)
const rateControl = ref('abr')
const rateControlOptions = [
  { value: 'vbr', label: 'VBR', hint: 'Quality' },
  { value: 'abr', label: 'ABR' },
  { value: 'cbr', label: 'CBR' },
]
const profileOptions = [
  { value: 'auto', label: 'Auto', hint: 'Recommended' },
  { value: 'lc', label: 'AAC-LC' },
  { value: 'he-v1', label: 'HE-AAC v1', hint: 'Low bitrates' },
]
const objectType = ref('auto')
// Mirrors the CLI's --rate <auto|keep|hz>.
const resampleOptions = [
  { value: 'auto', label: 'Auto', hint: 'Recommended' },
  { value: 'keep', label: 'Keep' },
  { value: 'custom', label: 'Custom' },
]
const resampleMode = ref('auto')
const resampleHz = ref(44100)
const customRates = computed(() => {
  const source = decodedAudio.value?.sampleRate || 0
  return [48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000].filter(rate => rate < source)
})
const isProcessing = ref(false)
const progress = ref(0)
const statusMessage = ref('')
const results = ref([])
const convertButton = ref(null)
const discardButtons = ref([])
const resultAnnouncement = ref('')
let activeWorker = null
const maxQuantQuality = computed(() => objectType.value === 'he-v1' ? 75 : 5000)
const qualityPresets = computed(() => [20, 30, 40, 50, 60, 75, 100, 150, 200, 300, 500, 800].filter(value => value <= maxQuantQuality.value))

// Keep the chosen custom rate valid for the loaded file (it must stay below the input rate).
watch(customRates, rates => {
  if (!rates.includes(resampleHz.value)) resampleHz.value = rates[0] || 44100
  if (!rates.length && resampleMode.value === 'custom') resampleMode.value = 'auto'
})

function normalizeQuality() {
  if (quantQuality.value > maxQuantQuality.value) quantQuality.value = maxQuantQuality.value
}

async function discardResult(item) {
  const index = results.value.indexOf(item)
  if (index < 0) return
  if (activeTrackId.value === item.id) {
    activeTrackId.value = ''
  }
  URL.revokeObjectURL(item.url)
  results.value.splice(index, 1)
  resultAnnouncement.value = `Discarded ${item.name}.`
  await nextTick()
  const nextButton = discardButtons.value ? discardButtons.value[Math.min(index, discardButtons.value.length - 1)] : null
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

function clearResults() {
  for (const item of results.value) {
    if (item?.url) URL.revokeObjectURL(item.url)
  }
  results.value = []
  activeTrackId.value = ''
  sharedPlaybackTime.value = 0
  sharedPlaybackStartTime.value = null
  sharedLoopRegion.value = { start: 0, end: null, repeat: false }
}

function handleBeforeUnload(event) {
  if (results.value.length > 0) {
    event.preventDefault()
    event.returnValue = ''
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleBeforeUnload)
  }
})

async function loadDemo() {
  if (isDemoLoading.value || isProcessing.value) return
  const request = ++demoRequest
  isDemoLoading.value = true
  demoError.value = ''
  try {
    const response = await fetch(withBase('/media/pipeline-tighter.m4a'))
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    // The user picked their own file while the demo was downloading.
    if (request !== demoRequest) return
    selectFile(new File([blob], 'pipeline-tighter.m4a', { type: 'audio/mp4' }))
  } catch {
    if (request === demoRequest) demoError.value = 'Could not download the demo song. Please try again.'
  } finally {
    if (request === demoRequest) isDemoLoading.value = false
  }
}

function selectFile(file) {
  demoRequest++
  isDemoLoading.value = false
  activeTrackId.value = ''
  sharedPlaybackTime.value = 0
  sharedPlaybackStartTime.value = null
  sharedLoopRegion.value = { start: 0, end: null, repeat: false }
  if (originalAudioUrl.value) {
    URL.revokeObjectURL(originalAudioUrl.value)
    originalAudioUrl.value = null
  }
  selectedFile.value = file
  originalAudioUrl.value = null
  originalPeaks.value = []
  referenceMaxRms.value = 0.001
  decodedAudio.value = null
  statusMessage.value = ''
  const request = ++decodeRequest
  void decodeSelectedFile(file, request)
}

function isReferenceMatch(refId) {
  return !activeReferenceId.value || activeReferenceId.value === refId
}

// Synchronized playback event handlers
function onTrackPlay({ trackId }, refId) {
  if (refId && activeReferenceId.value !== refId) {
    // Switched to a track from a different reference: reset sync time
    activeReferenceId.value = refId
    sharedPlaybackTime.value = 0
    sharedPlaybackStartTime.value = null
  }
  activeTrackId.value = trackId
}

function onTrackPause({ trackId }, refId) {
  if (activeTrackId.value === trackId) {
    activeTrackId.value = ''
  }
}

function onTrackSeek(time, refId) {
  if (refId) activeReferenceId.value = refId
  sharedPlaybackTime.value = time
}

function onTrackTimeUpdate(time, refId) {
  if (refId && activeReferenceId.value !== refId) return
  sharedPlaybackTime.value = time
}

function onUpdatePlaybackStartTime(time, refId) {
  if (refId) activeReferenceId.value = refId
  sharedPlaybackStartTime.value = time
}

function onUpdateLoopRegion(region, refId) {
  if (refId) activeReferenceId.value = refId
  sharedLoopRegion.value = region
}

function onUpdateGlobalMuted(muted) {
  isGlobalMuted.value = muted
}

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  }
  if (activeWorker) {
    activeWorker.terminate()
    activeWorker = null
  }
  if (originalAudioUrl.value) {
    URL.revokeObjectURL(originalAudioUrl.value)
  }
  clearResults()
})

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function formatSampleRate(hz) {
  if (!hz) return ''
  const khz = hz / 1000
  return `${Number(khz.toFixed(2))} kHz`
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

function parseAudioHeader(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 12) return { sampleRate: null, bitDepth: null }
  const view = new DataView(arrayBuffer)
  const bytes = new Uint8Array(arrayBuffer)

  // 1. WAV ("RIFF" ... "WAVE")
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
      let offset = 12
      let sampleRate = null
      let bitDepth = null
      while (offset + 8 <= arrayBuffer.byteLength) {
        const chunkId = String.fromCharCode(bytes[offset], bytes[offset+1], bytes[offset+2], bytes[offset+3])
        const chunkSize = view.getUint32(offset + 4, true)
        if (chunkId === 'fmt ' && chunkSize >= 16 && offset + 8 + chunkSize <= arrayBuffer.byteLength) {
          sampleRate = view.getUint32(offset + 12, true)
          bitDepth = view.getUint16(offset + 22, true)
          return { sampleRate: sampleRate > 0 ? sampleRate : null, bitDepth: bitDepth > 0 ? bitDepth : null }
        }
        offset += 8 + chunkSize + (chunkSize % 2)
      }
    }
  }

  // 2. FLAC ("fLaC")
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
    if (arrayBuffer.byteLength >= 22) {
      const sampleRate = (bytes[18] << 12) | (bytes[19] << 4) | (bytes[20] >> 4)
      const bitDepth = (((bytes[20] & 0x01) << 4) | (bytes[21] >> 4)) + 1
      return { sampleRate: sampleRate > 0 ? sampleRate : null, bitDepth: bitDepth > 0 ? bitDepth : null }
    }
  }

  return { sampleRate: null, bitDepth: null }
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

function audioBufferToFloat32(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  const pcmFloat = new Float32Array(length * numChannels)

  let offset = 0
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      // Web Audio and FAAC_INPUT_FLOAT both use unity full scale (+-1.0).
      pcmFloat[offset++] = audioBuffer.getChannelData(channel)[i]
    }
  }

  return pcmFloat
}

// Decode an encoded M4A and compute its waveform peaks relative to the reference track
async function extractWaveformFromM4a(buffer, refMaxRms = 0.001, sliceCount = 360) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return []
  const tempCtx = new AudioContextClass()
  try {
    const audioBuffer = await tempCtx.decodeAudioData(buffer.slice(0))
    return computeWaveformPeaksFromAudioBuffer(audioBuffer, refMaxRms, sliceCount)
  } catch {
    return []
  } finally {
    try { await tempCtx.close() } catch {}
  }
}

function createPreviewWav(pcmData, sampleRate, channels, sampleFormat) {
  // PCM WAV is broadly playable in native browser audio controls, even when
  // the browser can decode the chosen source format but cannot play it.
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
  return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
}

async function decodeSelectedFile(file, request) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    statusMessage.value = 'This browser does not provide audio decoding.'
    return
  }
  isDecoding.value = true
  progress.value = 5
  statusMessage.value = 'Reading audio file...'
  const nextPaint = () => new Promise((resolve) => setTimeout(resolve, 30))
  let audioCtx
  let trickle
  try {
    const fileBuffer = await file.arrayBuffer()
    if (request !== decodeRequest) return
    progress.value = 25
    statusMessage.value = 'Decoding audio stream...'
    await nextPaint()

    // decodeAudioData detaches fileBuffer, so keep a copy of M4A sources for tag carry-over.
    const fileBytes = new Uint8Array(fileBuffer)
    const isM4aSource = fileBytes.length > 12 && String.fromCharCode(...fileBytes.subarray(4, 8)) === 'ftyp'
    const sourceM4a = isM4aSource ? fileBuffer.slice(0) : undefined
    const { sampleRate: nativeRate, bitDepth: parsedBitDepth } = parseAudioHeader(fileBuffer)

    if (nativeRate) {
      try {
        audioCtx = new AudioContextClass({ sampleRate: nativeRate })
      } catch {
        throw new Error(`This browser cannot decode audio at ${nativeRate} Hz.`)
      }
    } else {
      audioCtx = new AudioContextClass()
    }

    // Steady, smooth progression while decodeAudioData runs asynchronously
    trickle = setInterval(() => {
      if (request === decodeRequest && progress.value < 75) {
        progress.value += Math.max(1, Math.round((75 - progress.value) / 6))
      }
    }, 120)

    const decodedBuffer = await audioCtx.decodeAudioData(fileBuffer)
    clearInterval(trickle)
    if (request !== decodeRequest) return

    progress.value = 80
    statusMessage.value = 'Processing PCM audio...'
    await nextPaint()

    const isHighPrecision = parsedBitDepth && parsedBitDepth > 16
    const sampleFormat = isHighPrecision ? 'float' : 'int16'
    const pcmData = isHighPrecision
      ? audioBufferToFloat32(decodedBuffer)
      : audioBufferToPcm16(decodedBuffer)

    progress.value = 90
    statusMessage.value = 'Generating audio waveform...'
    await nextPaint()

    // Extract high-resolution waveform peaks
    const { peaks, maxRms } = computeWaveformPeaksFromPcm(pcmData, decodedBuffer.numberOfChannels, sampleFormat, 360)
    originalPeaks.value = peaks
    referenceMaxRms.value = maxRms

    decodedAudio.value = {
      pcmData,
      sampleFormat,
      bitDepth: parsedBitDepth || (isHighPrecision ? 24 : 16),
      sampleRate: decodedBuffer.sampleRate,
      channels: decodedBuffer.numberOfChannels,
      duration: decodedBuffer.duration,
      sourceM4a,
    }
    if (originalAudioUrl.value) URL.revokeObjectURL(originalAudioUrl.value)
    originalAudioUrl.value = createPreviewWav(pcmData, decodedBuffer.sampleRate, decodedBuffer.numberOfChannels, sampleFormat)

    progress.value = 100
    statusMessage.value = 'Audio decoded and ready to encode.'
    await nextPaint()
  } catch (err) {
    if (request === decodeRequest) statusMessage.value = 'Could not decode this audio: ' + err.message
  } finally {
    clearInterval(trickle)
    if (request === decodeRequest) {
      isDecoding.value = false
    }
    if (audioCtx?.close) {
      try { await audioCtx.close() } catch {}
    }
  }
}

async function startEncoding() {
  if (!selectedFile.value || !decodedAudio.value || isDecoding.value) return

  activeTrackId.value = ''

  isProcessing.value = true
  progress.value = 0
  statusMessage.value = 'Preparing Web Worker encoding task…'

  try {
    const { pcmData, sampleFormat, sampleRate, channels, duration, bitDepth, sourceM4a } = decodedAudio.value
    // Let the bar render at 0 before advancing; otherwise a rerun jumps 100 -> 5.
    await new Promise((resolve) => setTimeout(resolve, 200))
    progress.value = 5
    const workerUrl = new URL(withBase('/wasm/faac-worker.js'), window.location.origin).href
    const worker = new Worker(workerUrl)
    activeWorker = worker

    worker.onmessage = (e) => {
      const msg = e.data
      if (msg.type === 'progress') {
        progress.value = msg.progress
        statusMessage.value = msg.status
      } else if (msg.type === 'complete') {
        activeWorker = null
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
          { label: 'Input', value: `${formatSampleRate(sampleRate)} · ${bitDepth ? bitDepth + '-bit · ' : ''}${formatChannelLayout(channels)}` },
          { label: 'Output', value: `${formatFileSize(outputBuffer.byteLength)} · ~${Math.round(averageKbps)} kbps${msg.resolvedSampleRate && msg.resolvedSampleRate !== sampleRate ? ` · resampled to ${formatSampleRate(msg.resolvedSampleRate)}` : ''}` },
        ]

        const resultItem = {
          id: `encoded-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: outName,
          referenceId: selectedFile.value ? `${selectedFile.value.name}-${selectedFile.value.size}` : 'default',
          details,
          url: url,
          peaks: originalPeaks.value ? [...originalPeaks.value] : [],
          duration: duration,
          isWaveformLoading: false,
          rawBuffer: outputBuffer
        }
        results.value.unshift(resultItem)

        // Compute actual waveform of the encoded M4A output with shared normalization against reference
        void extractWaveformFromM4a(outputBuffer.buffer, referenceMaxRms.value, 360).then(encodedPeaks => {
          if (encodedPeaks && encodedPeaks.length > 0) {
            // Only update if difference from original peaks is meaningful, avoiding visual pop
            resultItem.peaks = encodedPeaks
          }
        })

        worker.terminate()
      } else if (msg.type === 'error') {
        activeWorker = null
        statusMessage.value = 'Worker Error: ' + msg.message
        isProcessing.value = false
        worker.terminate()
      }
    }

    worker.onerror = () => {
      activeWorker = null
      statusMessage.value = 'The audio converter could not run. Please reload the page and try again.'
      isProcessing.value = false
      worker.terminate()
    }

    const workerPcm = pcmData.slice()
    const isFloat = sampleFormat === 'float'
    const m4a = sourceM4a?.slice(0)
    worker.postMessage({
      pcm16Data: !isFloat ? workerPcm.buffer : undefined,
      pcmFloatData: isFloat ? workerPcm.buffer : undefined,
      sampleFormat,
      bitrate: bitrate.value,
      rateControl: rateControl.value,
      quantQuality: quantQuality.value,
      objectType: objectType.value,
      sampleRate,
      channels,
      resampleRate: resampleMode.value === 'custom' && customRates.value.includes(resampleHz.value) ? resampleHz.value : (resampleMode.value === 'keep' ? 'keep' : 'auto'),
      sourceM4a: m4a
    }, [workerPcm.buffer, ...(m4a ? [m4a] : [])])

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

.demo-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin: -0.4rem 0 1.25rem;
  color: #94a3b8;
  font-size: 0.9rem;
}

.demo-btn {
  min-height: 2.75rem;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(16, 185, 129, 0.45);
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.12);
  color: #6ee7b7;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
}

.demo-btn:hover:not(:disabled),
.demo-btn:focus-visible {
  background: #10b981;
  color: #0f172a;
}

.demo-btn:disabled {
  cursor: progress;
  opacity: 0.7;
}

.demo-error {
  flex-basis: 100%;
  text-align: center;
  color: #fca5a5;
}

.original-audio-card {
  margin-bottom: 1.25rem;
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

.rate-select {
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
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
  display: block;
  height: 6px;
  width: 100%;
  transform-origin: left center;
  will-change: transform;
  background: linear-gradient(90deg, #10b981, #38bdf8);
  transition: transform 0.1s linear;
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
  border-radius: 12px;
  padding: 0.85rem 1rem;
  margin-bottom: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-card-header {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

@media (min-width: 640px) {
  .result-card-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-weight: 700;
  font-size: 0.92rem;
  color: #f8fafc;
  display: block;
}

.result-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.metadata-chip {
  min-width: 0;
  padding: 0.45rem 0.65rem;
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

/* Waveform Player Action Buttons (Download & Discard) */
.player-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.player-btn:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}

.download-btn {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.88rem;
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.35);
  text-decoration: none;
}

.download-btn:hover,
.download-btn:focus-visible {
  background: #10b981;
  color: #0f172a;
  border-color: #10b981;
}

.discard-btn {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.85rem;
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.25);
}

.discard-btn:hover,
.discard-btn:focus-visible {
  background: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.result-player-fullwidth {
  width: 100%;
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

  .player-btn.download-btn,
  .player-btn.discard-btn {
    width: 2rem;
    height: 2rem;
    font-size: 0.8rem;
  }
}
</style>
