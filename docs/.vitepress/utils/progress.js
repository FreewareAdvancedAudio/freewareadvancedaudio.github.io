/**
 * Generalized smooth progress controller for smooth, monotonic progress animations.
 *
 * Ensures progress updates advance smoothly using requestAnimationFrame easing,
 * eliminating rigid visual jumps across decoding and encoding stages while remaining
 * performant and responsive to completion or resets.
 */

export function createSmoothProgress(onUpdate) {
  let currentValue = 0
  let targetValue = 0
  let animationFrameId = null
  let lastTimestamp = 0

  function stopAnimation() {
    if (animationFrameId !== null) {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationFrameId)
      }
      animationFrameId = null
    }
    lastTimestamp = 0
  }

  function tick(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp
    const deltaMs = Math.min(50, Math.max(1, timestamp - lastTimestamp))
    lastTimestamp = timestamp

    if (currentValue < targetValue) {
      // Smooth dynamic approach: proportional step with minimum advancement rate
      const diff = targetValue - currentValue
      // Move at least ~15-20% of remaining diff per ~16ms frame, or min 0.4% per frame
      const step = Math.max(diff * 0.18, 0.4 * (deltaMs / 16.67))
      currentValue = Math.min(targetValue, currentValue + step)
      onUpdate(Math.round(currentValue))
    }

    if (currentValue < targetValue) {
      animationFrameId = requestAnimationFrame(tick)
    } else {
      animationFrameId = null
      lastTimestamp = 0
    }
  }

  return {
    get current() {
      return currentValue
    },
    get target() {
      return targetValue
    },
    set(target, immediate = false) {
      const clamped = Math.max(0, Math.min(100, target))
      targetValue = clamped

      if (immediate || clamped <= currentValue) {
        stopAnimation()
        currentValue = clamped
        onUpdate(Math.round(currentValue))
        return
      }

      if (typeof requestAnimationFrame !== 'function') {
        currentValue = clamped
        onUpdate(Math.round(currentValue))
        return
      }

      if (animationFrameId === null) {
        lastTimestamp = 0
        animationFrameId = requestAnimationFrame(tick)
      }
    },
    reset(val = 0) {
      stopAnimation()
      currentValue = val
      targetValue = val
      onUpdate(val)
    },
    destroy() {
      stopAnimation()
    }
  }
}
