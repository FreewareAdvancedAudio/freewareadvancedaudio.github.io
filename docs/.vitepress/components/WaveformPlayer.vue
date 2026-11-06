<template>
  <div
    class="waveform-player"
    :class="{ 'is-playing': isPlaying, 'is-loading': loading }"
    role="region"
    :aria-label="ariaLabel || 'Audio player'"
  >
    <!-- Hidden native audio element handles reliable decode & playback -->
    <audio
      ref="audioEl"
      :src="src"
      preload="metadata"
      @play="handleNativePlay"
      @pause="handleNativePause"
      @timeupdate="handleTimeUpdate"
      @ended="handleEnded"
      @loadedmetadata="handleLoadedMetadata"
      @seeking="isSeekingInternal = true"
      @seeked="isSeekingInternal = false"
    ></audio>

    <!-- Play/Pause Control Button -->
    <button
      type="button"
      class="player-btn play-pause-btn"
      :aria-label="isPlaying ? 'Pause' : 'Play'"
      :disabled="!src"
      @click="togglePlay"
    >
      <i
        :class="isPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play icon-play'"
        aria-hidden="true"
      ></i>
    </button>

    <!-- Interactive Waveform Timeline -->
    <div
      ref="trackRef"
      class="waveform-track"
      role="slider"
      tabindex="0"
      :aria-label="`${ariaLabel || 'Audio'} progress`"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(totalDuration)"
      :aria-valuenow="Math.round(currentTime)"
      :aria-valuetext="`${formatDuration(currentTime)} of ${formatDuration(totalDuration)}`"
      @keydown="handleKeydown"
      @pointerdown="handleTrackPointerDown"
      @pointermove="handleTrackPointerMove"
      @pointerup="handleTrackPointerUp"
      @pointercancel="handleTrackPointerCancel"
      @mouseenter="isHovering = true"
      @mouseleave="handleMouseLeave"
    >
      <!-- Background Waveform SVG Bars -->
      <svg
        class="waveform-svg"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath :id="clipId">
            <rect :x="0" :y="0" :width="progressPercent * 10" height="100" />
          </clipPath>
        </defs>

        <!-- Dimmed unplayed bars -->
        <g class="waveform-bars-unplayed">
          <rect
            v-for="(bar, i) in normalizedBars"
            :key="'unplayed-' + i"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="1.0"
          />
        </g>

        <!-- Colored played bars clipped to progress -->
        <g class="waveform-bars-played" :clip-path="`url(#${clipId})`">
          <rect
            v-for="(bar, i) in normalizedBars"
            :key="'played-' + i"
            :x="bar.x"
            :y="bar.y"
            :width="bar.width"
            :height="bar.height"
            rx="1.0"
          />
        </g>
      </svg>

      <!-- Shaded Dim Overlay for outside loop region (iOS trimmer style) -->
      <div
        v-if="isTrimmed"
        class="trimmer-dim dimmer-left"
        :style="{ width: `${loopStartPercent}%` }"
        aria-hidden="true"
      ></div>
      <div
        v-if="isTrimmed"
        class="trimmer-dim dimmer-right"
        :style="{ left: `${loopEndPercent}%`, width: `${100 - loopEndPercent}%` }"
        aria-hidden="true"
      ></div>

      <!-- Active Loop Window Border & Highlight Frame -->
      <div
        v-if="isTrimmed"
        class="trimmer-frame"
        :style="{ left: `${loopStartPercent}%`, width: `${loopEndPercent - loopStartPercent}%` }"
        aria-hidden="true"
      ></div>

      <!-- Trimmer Left Handle (Start) -->
      <div
        class="trimmer-handle trimmer-handle-start"
        :class="{ 'is-active': isTrimmed, 'is-dragging': activeDragHandle === 'start' }"
        :style="{ left: `${loopStartPercent}%` }"
        role="slider"
        tabindex="0"
        aria-label="Loop start trim handle"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(totalDuration)"
        :aria-valuenow="Math.round(loopStart)"
        title="Drag to trim loop start"
        @pointerdown.stop="handleHandlePointerDown('start', $event)"
        @pointermove="handleHandlePointerMove('start', $event)"
        @pointerup="handleHandlePointerUp('start', $event)"
        @pointercancel="handleHandlePointerCancel('start', $event)"
      >
        <div class="handle-bar"></div>
      </div>

      <!-- Trimmer Right Handle (End) -->
      <div
        class="trimmer-handle trimmer-handle-end"
        :class="{ 'is-active': isTrimmed, 'is-dragging': activeDragHandle === 'end' }"
        :style="{ left: `${loopEndPercent}%` }"
        role="slider"
        tabindex="0"
        aria-label="Loop end trim handle"
        :aria-valuemin="0"
        :aria-valuemax="Math.round(totalDuration)"
        :aria-valuenow="Math.round(loopEnd)"
        title="Drag to trim loop end"
        @pointerdown.stop="handleHandlePointerDown('end', $event)"
        @pointermove="handleHandlePointerMove('end', $event)"
        @pointerup="handleHandlePointerUp('end', $event)"
        @pointercancel="handleHandlePointerCancel('end', $event)"
      >
        <div class="handle-bar"></div>
      </div>

      <!-- Last Started Playback Indicator (Grey bar, only visible when hovering over waveform) -->
      <div
        v-if="isHovering && lastStartedPercent !== null"
        class="waveform-last-started-marker"
        :style="{ left: `${lastStartedPercent}%` }"
        aria-hidden="true"
        title="Playback last started here"
      >
        <span class="last-started-pill"></span>
      </div>

      <!-- Scrub Playhead Line -->
      <div
        class="waveform-playhead"
        :class="{ 'is-animating': isPlaying }"
        :style="{ left: `${progressPercent}%` }"
        aria-hidden="true"
      ></div>

      <!-- Mouse Pointer Hover Guide Line -->
      <div
        v-if="hoverPercent !== null"
        class="waveform-hover-line"
        :style="{ left: `${hoverPercent}%` }"
        aria-hidden="true"
      ></div>
    </div>

    <!-- Duration / Timestamp -->
    <div class="player-time" aria-hidden="true">
      <span class="current-time">{{ formatDuration(currentTime) }}</span>
      <span class="time-sep">/</span>
      <span class="total-duration">{{ formatDuration(totalDuration) }}</span>
    </div>

    <!-- Trailing Action Controls: customizable via slot or default Repeat/Mute -->
    <div class="player-actions">
      <slot name="actions">
        <!-- Default: Repeat Toggle Button (FontAwesome fa-repeat) -->
        <button
          type="button"
          class="player-btn repeat-btn"
          :class="{ 'is-active': isRepeatEnabled }"
          :aria-label="isRepeatEnabled ? 'Repeat is ON (click to disable)' : 'Repeat is OFF (click to enable)'"
          :title="isRepeatEnabled ? 'Repeat is ON' : 'Repeat is OFF'"
          @click="toggleRepeat"
        >
          <i class="fa-solid fa-repeat" aria-hidden="true"></i>
        </button>

        <!-- Default: Mute / Unmute Toggle Button -->
        <button
          type="button"
          class="player-btn mute-btn"
          :class="{ 'is-muted': effectiveMuted }"
          :aria-label="effectiveMuted ? 'Unmute' : 'Mute'"
          :title="effectiveMuted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <i :class="effectiveMuted ? 'fa-solid fa-volume-xmark' : 'fa-solid fa-volume-high'" aria-hidden="true"></i>
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  ariaLabel: { type: String, default: 'Audio' },
  peaks: { type: Array, default: () => [] },
  duration: { type: Number, default: 0 },
  activeTrackId: { type: String, default: '' },
  trackId: { type: String, required: true },
  sharedTime: { type: Number, default: 0 },
  playbackStartTime: { type: Number, default: null },
  loopRegion: {
    type: Object,
    default: () => ({ start: 0, end: null, repeat: false })
  },
  loading: { type: Boolean, default: false },
  muted: { type: Boolean, default: null } // Optional controlled mute state
})

const emit = defineEmits([
  'play',
  'pause',
  'seek',
  'timeupdate',
  'update:playbackStartTime',
  'update:loopRegion',
  'update:muted'
])

const audioEl = ref(null)
const trackRef = ref(null)
const isPlaying = ref(false)
const localMuted = ref(false)
const localDuration = ref(0)
const localPlayTime = ref(0) // High-frequency continuous play time during playback
const isDraggingTrack = ref(false)
const isSeekingInternal = ref(false)
const isHovering = ref(false)
const hoverPercent = ref(null)
const activeDragHandle = ref(null) // 'start' | 'end' | null
const trackPixelWidth = ref(600)
let resizeObserver = null
let animationFrameId = null
let lastEmittedSec = -1

const clipId = `waveform-clip-${Math.random().toString(36).slice(2, 9)}`

const totalDuration = computed(() => {
  return props.duration || localDuration.value || 0
})

const isSelfActive = computed(() => {
  return props.activeTrackId === props.trackId
})

const currentTime = computed(() => {
  if (isSelfActive.value && isPlaying.value) {
    return localPlayTime.value
  }
  return props.sharedTime || 0
})

const progressPercent = computed(() => {
  if (!totalDuration.value || totalDuration.value <= 0) return 0
  const time = isSelfActive.value && isPlaying.value ? localPlayTime.value : (props.sharedTime || 0)
  const pct = (time / totalDuration.value) * 100
  return Math.min(100, Math.max(0, pct))
})

// Loop window bounds
const loopStart = computed(() => {
  if (props.loopRegion && typeof props.loopRegion.start === 'number') {
    return Math.max(0, Math.min(totalDuration.value, props.loopRegion.start))
  }
  return 0
})

const loopEnd = computed(() => {
  if (props.loopRegion && typeof props.loopRegion.end === 'number' && props.loopRegion.end > 0) {
    return Math.max(loopStart.value + 0.1, Math.min(totalDuration.value, props.loopRegion.end))
  }
  return totalDuration.value
})

const isTrimmed = computed(() => {
  if (!totalDuration.value || totalDuration.value <= 0) return false
  const trimmedLeft = loopStart.value > 0.05
  const trimmedRight = loopEnd.value < totalDuration.value - 0.05
  return trimmedLeft || trimmedRight
})

const effectiveMuted = computed(() => {
  return props.muted !== null ? props.muted : localMuted.value
})

const isRepeatEnabled = computed(() => {
  return props.loopRegion?.repeat === true
})

const loopStartPercent = computed(() => {
  if (!totalDuration.value || totalDuration.value <= 0) return 0
  return Math.min(100, Math.max(0, (loopStart.value / totalDuration.value) * 100))
})

const loopEndPercent = computed(() => {
  if (!totalDuration.value || totalDuration.value <= 0) return 100
  return Math.min(100, Math.max(0, (loopEnd.value / totalDuration.value) * 100))
})

// Last started position as percent of total duration
const lastStartedPercent = computed(() => {
  if (props.playbackStartTime === null || props.playbackStartTime === undefined || !totalDuration.value) {
    return null
  }
  const pct = (props.playbackStartTime / totalDuration.value) * 100
  return Math.min(100, Math.max(0, pct))
})

// Responsive bar density based on actual pixel width of track
const normalizedBars = computed(() => {
  // Density: approx 1 bar per 3.6px on desktop, scaling cleanly down on smaller screens
  const width = trackPixelWidth.value || 600
  const barCount = Math.max(45, Math.min(220, Math.floor(width / 3.6)))
  const result = []
  const inputPeaks = props.peaks && props.peaks.length > 0 ? props.peaks : []

  const totalSlots = barCount
  const slotWidth = 1000 / totalSlots
  const barWidth = Math.max(1.8, slotWidth * 0.68)

  for (let i = 0; i < barCount; i++) {
    let val = 0.2
    if (inputPeaks.length > 0) {
      // High-resolution sampling over inputPeaks
      const peakIndex = Math.min(
        inputPeaks.length - 1,
        Math.floor((i / barCount) * inputPeaks.length)
      )
      val = inputPeaks[peakIndex] ?? 0.2
    } else {
      // Gentle subtle placeholder when loading
      val = 0.18 + 0.12 * Math.sin(i * 0.2)
    }

    // Dynamic height mapping: preserve contrast for quiet vs loud parts
    val = Math.max(0.06, Math.min(0.96, val))
    const height = val * 86
    const y = (100 - height) / 2
    const x = i * slotWidth + (slotWidth - barWidth) / 2

    result.push({
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(barWidth.toFixed(2)),
      height: Number(height.toFixed(2))
    })
  }
  return result
})

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function handleLoadedMetadata() {
  if (audioEl.value && !isNaN(audioEl.value.duration) && audioEl.value.duration > 0) {
    localDuration.value = audioEl.value.duration
  }
}

function startPlaybackLoop() {
  stopPlaybackLoop()
  // If tab is in background, do not start RAF loop to save battery
  if (typeof document !== 'undefined' && document.hidden) return

  const tick = () => {
    if (!audioEl.value || !isPlaying.value || !isSelfActive.value) {
      stopPlaybackLoop()
      return
    }

    const curTime = audioEl.value.currentTime
    localPlayTime.value = curTime

    // Check loop / trimmed end wrap-around smoothly
    if (isTrimmed.value && curTime >= loopEnd.value) {
      if (isRepeatEnabled.value) {
        audioEl.value.currentTime = loopStart.value
        localPlayTime.value = loopStart.value
        emit('timeupdate', loopStart.value)
        emit('seek', loopStart.value)
        animationFrameId = requestAnimationFrame(tick)
        return
      } else {
        // Repeat is OFF: stop cleanly at the end handle
        audioEl.value.pause()
        audioEl.value.currentTime = loopStart.value
        localPlayTime.value = loopStart.value
        emit('timeupdate', loopStart.value)
        emit('seek', loopStart.value)
        emit('pause', { trackId: props.trackId })
        stopPlaybackLoop()
        return
      }
    }

    // Emit timeupdate throttled to roughly 4-5 times/sec or when integer second changes
    // This keeps parent shared state in sync without flooding reactive trees every frame
    const curSec = Math.floor(curTime)
    if (curSec !== lastEmittedSec) {
      lastEmittedSec = curSec
      emit('timeupdate', curTime)
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  animationFrameId = requestAnimationFrame(tick)
}

function stopPlaybackLoop() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

function handleVisibilityChange() {
  if (typeof document === 'undefined') return
  if (document.hidden) {
    // Pause RAF when backgrounded to prevent battery drain
    stopPlaybackLoop()
  } else if (isPlaying.value && isSelfActive.value) {
    // Resume RAF when returning to foreground
    startPlaybackLoop()
  }
}

function handleNativePlay() {
  isPlaying.value = true
  if (audioEl.value) {
    localPlayTime.value = audioEl.value.currentTime
  }
  emit('play', { trackId: props.trackId })
  startPlaybackLoop()
}

function handleNativePause() {
  isPlaying.value = false
  stopPlaybackLoop()
  if (audioEl.value) {
    localPlayTime.value = audioEl.value.currentTime
    emit('timeupdate', audioEl.value.currentTime)
  }
  emit('pause', { trackId: props.trackId })
}

function handleTimeUpdate() {
  if (!audioEl.value || isDraggingTrack.value || isSeekingInternal.value) return
  if (isSelfActive.value) {
    const curTime = audioEl.value.currentTime
    localPlayTime.value = curTime

    // Check loop / trimmed end wrap-around
    if (isTrimmed.value && curTime >= loopEnd.value) {
      if (isRepeatEnabled.value) {
        audioEl.value.currentTime = loopStart.value
        localPlayTime.value = loopStart.value
        emit('timeupdate', loopStart.value)
        emit('seek', loopStart.value)
        return
      } else {
        // Repeat is OFF: stop cleanly at the end handle
        audioEl.value.pause()
        audioEl.value.currentTime = loopStart.value
        localPlayTime.value = loopStart.value
        emit('timeupdate', loopStart.value)
        emit('seek', loopStart.value)
        emit('pause', { trackId: props.trackId })
        return
      }
    }

    emit('timeupdate', curTime)
  }
}

function handleEnded() {
  isPlaying.value = false
  stopPlaybackLoop()
  if (isRepeatEnabled.value) {
    // If repeat is ON, wrap to loopStart (or 0) and replay
    const targetStart = isTrimmed.value ? loopStart.value : 0
    if (audioEl.value) {
      audioEl.value.currentTime = targetStart
      localPlayTime.value = targetStart
      emit('seek', targetStart)
      audioEl.value.play().catch(() => {})
    }
  } else {
    localPlayTime.value = isTrimmed.value ? loopStart.value : 0
    emit('seek', isTrimmed.value ? loopStart.value : 0)
  }
}

function togglePlay() {
  if (!audioEl.value) return
  if (isPlaying.value && props.activeTrackId === props.trackId) {
    audioEl.value.pause()
  } else {
    // Start playback: ensure audio is synced to sharedTime and within loop bounds
    let targetTime = props.sharedTime
    if (isTrimmed.value && (targetTime >= loopEnd.value || targetTime < loopStart.value)) {
      targetTime = loopStart.value
    }
    if (Math.abs(audioEl.value.currentTime - targetTime) > 0.05) {
      audioEl.value.currentTime = targetTime
    }
    emit('update:playbackStartTime', targetTime)
    emit('play', { trackId: props.trackId })
    audioEl.value.play().catch(() => {})
  }
}

function toggleRepeat() {
  const newRepeat = !isRepeatEnabled.value
  emit('update:loopRegion', {
    start: loopStart.value,
    end: loopEnd.value,
    repeat: newRepeat
  })
}

function toggleMute() {
  const newMuted = !effectiveMuted.value
  localMuted.value = newMuted
  if (audioEl.value) {
    audioEl.value.muted = newMuted
  }
  emit('update:muted', newMuted)
}

// Coordinate to time calculation
function getTimeFromPointer(event) {
  if (!trackRef.value || !totalDuration.value) return 0
  const rect = trackRef.value.getBoundingClientRect()
  const offsetX = event.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, offsetX / rect.width))
  return ratio * totalDuration.value
}

function handleMouseLeave() {
  isHovering.value = false
  hoverPercent.value = null
}

// Waveform Track Pointer Events (Click-to-seek and switch active track with instant playback)
function handleTrackPointerDown(event) {
  if (!totalDuration.value) return
  // If pointerdown on a trim handle, do not treat as track seek
  if (event.target.closest('.trimmer-handle')) return

  trackRef.value?.setPointerCapture?.(event.pointerId)
  isDraggingTrack.value = true

  seekAndPlay(getTimeFromPointer(event))
}

// Jump to a time and mark it as the last started point. Playback continues (and switches to this
// track in an A/B comparison) only if something is already playing; when paused or stopped,
// clicking just moves the position.
function seekAndPlay(seekTime) {
  const keepPlaying = isPlaying.value || props.activeTrackId !== ''

  emit('update:playbackStartTime', seekTime)
  emit('seek', seekTime)
  if (keepPlaying) emit('play', { trackId: props.trackId })

  if (audioEl.value) {
    audioEl.value.currentTime = seekTime
    if (keepPlaying) audioEl.value.play().catch(() => {})
  }
}

function handleTrackPointerMove(event) {
  if (!trackRef.value || !totalDuration.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  hoverPercent.value = Number((ratio * 100).toFixed(1))

  if (isDraggingTrack.value) {
    const seekTime = ratio * totalDuration.value
    emit('seek', seekTime)
    if (audioEl.value && Math.abs(audioEl.value.currentTime - seekTime) > 0.1) {
      audioEl.value.currentTime = seekTime
    }
  }
}

function handleTrackPointerUp(event) {
  if (isDraggingTrack.value) {
    try {
      trackRef.value?.releasePointerCapture?.(event.pointerId)
    } catch {}
    isDraggingTrack.value = false
  }
}

function handleTrackPointerCancel() {
  isDraggingTrack.value = false
}

// Trimmer Handle Pointer Events (iOS-style loop region trimmer)
// A handle only starts dragging after a few pixels of movement. A plain tap on a handle
// seeks like a click on the track, so the handles never block clicking the very start or end.
const HANDLE_DRAG_THRESHOLD_PX = 4
let pendingHandle = null // { handle, x }

function handleHandlePointerDown(handle, event) {
  if (!totalDuration.value) return
  pendingHandle = { handle, x: event.clientX }
  event.currentTarget?.setPointerCapture?.(event.pointerId)
}

function handleHandlePointerMove(handle, event) {
  if (pendingHandle?.handle === handle && activeDragHandle.value !== handle &&
      Math.abs(event.clientX - pendingHandle.x) >= HANDLE_DRAG_THRESHOLD_PX) {
    activeDragHandle.value = handle
  }
  if (activeDragHandle.value !== handle || !trackRef.value || !totalDuration.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const newTime = ratio * totalDuration.value

  const minGap = Math.max(0.2, totalDuration.value * 0.02) // minimum 2% or 0.2s loop window

  if (handle === 'start') {
    const clampedStart = Math.max(0, Math.min(loopEnd.value - minGap, newTime))
    emit('update:loopRegion', { start: clampedStart, end: loopEnd.value, repeat: isRepeatEnabled.value })
  } else if (handle === 'end') {
    const clampedEnd = Math.min(totalDuration.value, Math.max(loopStart.value + minGap, newTime))
    emit('update:loopRegion', { start: loopStart.value, end: clampedEnd, repeat: isRepeatEnabled.value })
  }
}

function handleHandlePointerUp(handle, event) {
  const wasTap = pendingHandle?.handle === handle && activeDragHandle.value !== handle
  pendingHandle = null
  try {
    event.currentTarget?.releasePointerCapture?.(event.pointerId)
  } catch {}
  if (activeDragHandle.value === handle) {
    activeDragHandle.value = null
  } else if (wasTap) {
    seekAndPlay(getTimeFromPointer(event))
  }
}

function handleHandlePointerCancel(handle) {
  pendingHandle = null
  if (activeDragHandle.value === handle) {
    activeDragHandle.value = null
  }
}

function handleKeydown(event) {
  if (!totalDuration.value) return
  const step = 5 // 5 seconds
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    togglePlay()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    const newTime = Math.max(0, currentTime.value - step)
    emit('seek', newTime)
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    const newTime = Math.min(totalDuration.value, currentTime.value + step)
    emit('seek', newTime)
  } else if (event.key === 'Home') {
    event.preventDefault()
    emit('seek', 0)
  } else if (event.key === 'End') {
    event.preventDefault()
    emit('seek', totalDuration.value)
  }
}

// Sync muted state to native audio element
watch(effectiveMuted, (newVal) => {
  if (audioEl.value) {
    audioEl.value.muted = newVal
  }
}, { immediate: true })

// Watch sharedTime from parent: sync audio element when not actively updating itself
watch(() => props.sharedTime, (newTime) => {
  if (!audioEl.value) return
  if (!isSelfActive.value) {
    // Other inactive tracks mirror the shared playback position
    localPlayTime.value = newTime
    if (Math.abs(audioEl.value.currentTime - newTime) > 0.05) {
      audioEl.value.currentTime = newTime
    }
  } else if (isDraggingTrack.value) {
    localPlayTime.value = newTime
    audioEl.value.currentTime = newTime
  }
})

// Watch activeTrackId: if another track becomes active, pause this one
watch(() => props.activeTrackId, (newActive) => {
  if (!audioEl.value) return
  if (newActive !== props.trackId && isPlaying.value) {
    audioEl.value.pause()
  } else if (newActive === props.trackId && !isPlaying.value) {
    if (Math.abs(audioEl.value.currentTime - props.sharedTime) > 0.05) {
      audioEl.value.currentTime = props.sharedTime
    }
    audioEl.value.play().catch(() => {})
  }
})

onMounted(() => {
  if (trackRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width > 0) {
          trackPixelWidth.value = Math.round(entry.contentRect.width)
        }
      }
    })
    resizeObserver.observe(trackRef.value)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  stopPlaybackLoop()
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})

// Expose internal audio element and control methods
defineExpose({
  pause: () => audioEl.value?.pause(),
  play: () => audioEl.value?.play(),
  seek: (t) => { if (audioEl.value) audioEl.value.currentTime = t }
})
</script>

<style scoped>
.waveform-player {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 12px;
  box-sizing: border-box;
  user-select: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.waveform-player:focus-within {
  border-color: rgba(16, 185, 129, 0.45);
}

.waveform-player.is-playing {
  border-color: rgba(16, 185, 129, 0.45);
  background: rgba(15, 23, 42, 0.85);
}

.player-btn,
:deep(.player-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  cursor: pointer;
  flex-shrink: 0;
  touch-action: manipulation;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.player-btn:hover:not(:disabled),
:deep(.player-btn:hover:not(:disabled)) {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.35);
}

.player-btn:focus-visible,
:deep(.player-btn:focus-visible) {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}

.player-btn:disabled,
:deep(.player-btn:disabled) {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-pause-btn {
  width: 2.75rem;
  height: 2.75rem;
  font-size: 1.1rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.25));
  border-color: rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
}

/* Optical centering for play triangle inside circle */
.play-pause-btn .icon-play {
  transform: translateX(1.5px);
}

.is-playing .play-pause-btn {
  background: linear-gradient(135deg, #10b981, #06b6d4);
  color: #0f172a;
}

.repeat-btn {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.85rem;
  color: #64748b;
  background: rgba(255, 255, 255, 0.05);
}

.repeat-btn.is-active {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.45);
  color: #34d399;
}

.repeat-btn:hover {
  background: rgba(16, 185, 129, 0.25);
  color: #6ee7b7;
}

.mute-btn {
  width: 2.25rem;
  height: 2.25rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.mute-btn.is-muted {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}

.waveform-track {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 52px;
  background: rgba(2, 6, 23, 0.5);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  outline: none;
}

.waveform-track:focus-visible {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}

.waveform-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.player-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.waveform-bars-unplayed rect {
  fill: rgba(148, 163, 184, 0.28);
}

.waveform-player:hover .waveform-bars-unplayed rect {
  fill: rgba(148, 163, 184, 0.38);
}

/* Default non-playing played bars: neutral slate grey */
.waveform-bars-played rect {
  fill: rgba(148, 163, 184, 0.55);
}

/* Actively playing track: vibrant emerald green */
.waveform-player.is-playing .waveform-bars-played rect {
  fill: #34d399;
}

/* iOS Trimmer Dimming */
.trimmer-dim {
  position: absolute;
  top: 0;
  bottom: 0;
  background: rgba(2, 6, 23, 0.72);
  pointer-events: none;
  z-index: 2;
  transition: width 0.05s ease, left 0.05s ease;
}

.dimmer-left {
  left: 0;
}

/* Active Trimmer Frame */
.trimmer-frame {
  position: absolute;
  top: 0;
  bottom: 0;
  border-top: 2px solid #10b981;
  border-bottom: 2px solid #10b981;
  box-sizing: border-box;
  pointer-events: none;
  z-index: 3;
}

/* Trimmer Grab Handles */
.trimmer-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  margin-left: -7px;
  cursor: col-resize;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.trimmer-handle .handle-bar {
  width: 3px;
  height: 100%;
  background: #64748b;
  border-radius: 2px;
  transition: background-color 0.15s, transform 0.15s;
}

.trimmer-handle:hover .handle-bar,
.trimmer-handle.is-dragging .handle-bar,
.trimmer-handle.is-active .handle-bar {
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
}

.trimmer-handle:focus-visible {
  outline: none;
}

.trimmer-handle:focus-visible .handle-bar {
  outline: 2px solid #34d399;
  outline-offset: 2px;
}

/* Last started playback indicator (grey bar, visible on waveform hover) */
.waveform-last-started-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(148, 163, 184, 0.85);
  box-shadow: 0 0 4px rgba(148, 163, 184, 0.6);
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 4;
}

.last-started-pill {
  position: absolute;
  top: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.5);
}

/* Playhead Line */
.waveform-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #38bdf8;
  box-shadow: 0 0 6px #38bdf8;
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 4;
  transition: left 0.1s ease-out;
}

/* While actively playing, remove CSS transition to prevent fighting 60fps RAF updates */
.waveform-playhead.is-animating {
  transition: none;
}

/* Hover Guide Line */
.waveform-hover-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  transform: translateX(-50%);
  z-index: 3;
}

.player-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.current-time {
  color: #e2e8f0;
}

.time-sep {
  opacity: 0.6;
}

@media (max-width: 480px) {
  .waveform-player {
    gap: 0.45rem;
    padding: 0.4rem 0.5rem;
  }
  .player-actions {
    gap: 0.35rem;
  }
  .player-time {
    font-size: 0.75rem;
  }
  .trimmer-handle {
    width: 22px;
    margin-left: -11px;
  }
  .player-btn.repeat-btn,
  .player-btn.mute-btn,
  :deep(.player-btn) {
    width: 2rem;
    height: 2rem;
    font-size: 0.8rem;
  }
}
</style>
