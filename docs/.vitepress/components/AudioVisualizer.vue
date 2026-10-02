<template>
  <div class="visualizer-container">
    <div
      class="rack-bezel"
      @mousemove="handlePointerMove"
      @mouseleave="handlePointerLeave"
      @touchstart.passive="handlePointerMove"
      @touchmove.passive="handlePointerMove"
      @touchend="handlePointerLeave"
      @click="handlePointerClick"
    >
      <div class="display-window">
        <!-- 90s Hardware Stereo Equalizer Display -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="equalizer-svg">
          <defs>
            <linearGradient id="bg" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a"/>
              <stop offset="50%" stop-color="#1e1b4b"/>
              <stop offset="100%" stop-color="#311042"/>
            </linearGradient>
            <linearGradient id="bar-cyan" x1="0%" x2="0%" y1="100%" y2="0%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity=".2"/>
              <stop offset="100%" stop-color="#3b82f6" stop-opacity=".8"/>
            </linearGradient>
            <linearGradient id="bar-purple" x1="0%" x2="0%" y1="100%" y2="0%">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity=".3"/>
              <stop offset="60%" stop-color="#8b5cf6" stop-opacity=".8"/>
              <stop offset="100%" stop-color="#ec4899" stop-opacity=".9"/>
            </linearGradient>
            <linearGradient id="bar-pink" x1="0%" x2="0%" y1="100%" y2="0%">
              <stop offset="0%" stop-color="#ec4899" stop-opacity=".4"/>
              <stop offset="70%" stop-color="#f43f5e" stop-opacity=".9"/>
              <stop offset="100%" stop-color="#f59e0b"/>
            </linearGradient>
            <linearGradient id="wave" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stop-color="#06b6d4"/>
              <stop offset="50%" stop-color="#f43f5e"/>
              <stop offset="100%" stop-color="#f59e0b"/>
            </linearGradient>
            <filter id="glow" width="160%" height="160%" x="-30%" y="-30%">
              <feGaussianBlur stdDeviation="8"/>
              <feComposite in="SourceGraphic"/>
            </filter>
            <filter id="text-shadow" width="140%" height="140%" x="-20%" y="-20%">
              <feDropShadow dx="0" dy="6" flood-color="#000" flood-opacity=".8" stdDeviation="8"/>
            </filter>
          </defs>

          <!-- Background Gradient -->
          <rect fill="url(#bg)" width="512" height="512" rx="16"/>

          <!-- Grid Overlay for 90s Hardware VFD look -->
          <g opacity="0.15" stroke="#38bdf8" stroke-width="1" stroke-dasharray="2,6">
            <line x1="0" y1="100" x2="512" y2="100"/>
            <line x1="0" y1="180" x2="512" y2="180"/>
            <line x1="0" y1="260" x2="512" y2="260"/>
            <line x1="0" y1="340" x2="512" y2="340"/>
            <line x1="0" y1="420" x2="512" y2="420"/>
          </g>

          <!-- Interactive Equalizer Bars from FAA Logo -->
          <g opacity="0.85" class="eq-bars">
            <rect
              v-for="(bar, index) in barScales"
              :key="index"
              :class="['bar', `bar-${index + 1}`]"
              :fill="barGradientUrl(index)"
              width="28"
              :height="barBaseHeights[index]"
              :x="48 + index * 40"
              :y="500 - barBaseHeights[index]"
              rx="4"
              :style="{ transform: `scaleY(${bar * (animatedHeights[index] || 1)})`, transformOrigin: `${48 + index * 40 + 14}px 500px` }"
            />
          </g>

          <!-- Static Signature Sine Wave from Original SVG Logo -->
          <g class="wave-group" :style="{ transform: `scaleY(${waveYScale})`, transformOrigin: '256px 256px' }">
            <path
              fill="none"
              stroke="url(#wave)"
              stroke-linecap="round"
              :stroke-width="isInteractive ? 14 : 12"
              d="M40 256c50 0 80-186 140-186s90 372 150 372 90-186 142-186"
              filter="url(#glow)"
              :class="['sine-wave-logo', { 'wave-boost': isInteractive }]"
            />
          </g>

          <!-- Centered Overlay Brand Typography -->
          <text
            x="256"
            y="298"
            fill="#ffffff"
            filter="url(#text-shadow)"
            font-family="system-ui, -apple-system, sans-serif"
            font-size="124"
            font-weight="800"
            letter-spacing="4"
            text-anchor="middle"
            class="brand-text"
          >
            FAAC
          </text>
        </svg>

        <!-- Codec Hardware VFD Feature Indicators -->
        <div class="vfd-indicators">
          <span class="vfd-tag" :class="{ highlight: isInteractive }">
            {{ isInteractive ? 'CODEC FEATURES' : 'FAAC / FAAD2' }}
          </span>
          <span class="vfd-tag highlight">
            {{ activeFreqTag }}
          </span>
          <span class="vfd-tag">LGPL v2.1+ / GPL v2+</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const barBaseHeights = [120, 200, 260, 320, 360, 330, 280, 230, 160, 110, 70]
const barScales = ref([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
const animatedHeights = ref([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
const isInteractive = ref(false)
const activeFreqTag = ref('AAC-LC & HE-AAC')
const waveYScale = ref(1)

let animFrameId = null
let clock = 0

function barGradientUrl(index) {
  if (index < 2 || index >= 8) return 'url(#bar-cyan)'
  if (index >= 4 && index <= 5) return 'url(#bar-pink)'
  return 'url(#bar-purple)'
}

function updateSpectrumAnimation() {
  clock += 0.05

  // Smooth stereo spectrum analyzer animation on equalizer bars
  animatedHeights.value = barBaseHeights.map((_, i) => {
    const freq = 1 + (i % 3) * 0.7
    const oscillation = Math.sin(clock * freq + i * 0.8) * 0.22 + Math.cos(clock * 1.5 + i) * 0.15
    return Math.max(0.65, 1 + oscillation)
  })

  animFrameId = requestAnimationFrame(updateSpectrumAnimation)
}

onMounted(() => {
  animFrameId = requestAnimationFrame(updateSpectrumAnimation)
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
})

function handlePointerMove(e) {
  isInteractive.value = true
  const rect = e.currentTarget.getBoundingClientRect()
  const x = Math.max(0, Math.min(rect.width, (e.touches ? e.touches[0].clientX : e.clientX) - rect.left))
  const y = Math.max(0, Math.min(rect.height, (e.touches ? e.touches[0].clientY : e.clientY) - rect.top))

  const normalizedX = x / rect.width
  const normalizedY = 1 - (y / rect.height)

  waveYScale.value = 0.8 + normalizedY * 0.6

  // Highlight codec features based on interaction
  const codecFeatures = [
    'AAC-LC & HE-AAC',
    'ABR MODE (-b)',
    'LGPL v2.1+ ENCODER',
    'GPL v2+ DECODER',
    '7.1 SURROUND SOUND',
    'ISO/IEC 14496-3'
  ]
  const bandIndex = Math.floor(normalizedX * codecFeatures.length)
  activeFreqTag.value = codecFeatures[Math.min(bandIndex, codecFeatures.length - 1)]

  // Calculate interactive scale for each equalizer bar based on proximity to pointer X
  barScales.value = barBaseHeights.map((_, index) => {
    const barXRatio = index / (barBaseHeights.length - 1)
    const distance = Math.abs(normalizedX - barXRatio)
    const boost = Math.max(0, 1 - distance * 2.2) * (0.5 + normalizedY * 0.9)
    return 0.8 + boost
  })
}

function handlePointerLeave() {
  isInteractive.value = false
  activeFreqTag.value = 'AAC-LC & HE-AAC'
  waveYScale.value = 1
  barScales.value = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
}

function handlePointerClick() {
  // Fun pulse burst on click/tap
  barScales.value = barScales.value.map(s => Math.min(1.5, s * 1.4))
  waveYScale.value = 1.3
  activeFreqTag.value = '⚡ FAAC 2.2+ / FAAD2'
  setTimeout(() => {
    if (!isInteractive.value) handlePointerLeave()
  }, 1000)
}
</script>

<style scoped>
.visualizer-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.rack-bezel {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border: 2px solid #334155;
  border-radius: 16px;
  padding: 10px;
  box-shadow:
    0 15px 35px -5px rgba(0, 0, 0, 0.6),
    inset 0 1px 2px rgba(255, 255, 255, 0.1);
  width: 100%;
  max-width: 440px;
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}

.rack-bezel:hover {
  border-color: #06b6d4;
  box-shadow:
    0 20px 40px -5px rgba(6, 182, 212, 0.25),
    inset 0 1px 2px rgba(255, 255, 255, 0.2);
}

.display-window {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(6, 182, 212, 0.3);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
}

.equalizer-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* Equalizer bar transitions */
.bar {
  transition: transform 0.08s ease-out;
}

/* Wave Group and Glow Effects */
.wave-group {
  transition: transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.sine-wave-logo {
  transition: stroke-width 0.2s ease, filter 0.2s ease;
}

.sine-wave-logo.wave-boost {
  filter: drop-shadow(0 0 16px #f43f5e);
}

.brand-text {
  pointer-events: none;
  user-select: none;
}

.vfd-indicators {
  position: absolute;
  bottom: 10px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-family: monospace, monospace;
  font-size: 0.65rem;
  letter-spacing: 0.5px;
  pointer-events: none;
}

.vfd-tag {
  color: rgba(148, 163, 184, 0.6);
  background: rgba(15, 23, 42, 0.85);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .rack-bezel {
    padding: 6px;
    border-radius: 12px;
    max-width: 100%;
  }

  .vfd-indicators {
    bottom: 6px;
    left: 6px;
    right: 6px;
    font-size: 0.55rem;
    letter-spacing: 0;
  }

  .vfd-tag {
    padding: 1px 4px;
  }
}

@media (max-width: 380px) {
  .vfd-indicators {
    justify-content: center;
  }
  .vfd-tag:last-child {
    display: none;
  }
}

.vfd-tag.highlight {
  color: #22d3ee;
  border-color: rgba(6, 182, 212, 0.4);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.8);
}
</style>
