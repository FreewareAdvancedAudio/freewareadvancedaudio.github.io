import { describe, it, expect, vi } from 'vitest'
import { createSmoothProgress } from './progress.js'

describe('createSmoothProgress', () => {
  it('initializes and reports initial reset value', () => {
    const updates = []
    const sp = createSmoothProgress((val) => updates.push(val))
    expect(sp.current).toBe(0)
    sp.reset(10)
    expect(sp.current).toBe(10)
    expect(updates).toContain(10)
  })

  it('clamps values between 0 and 100', () => {
    const updates = []
    const sp = createSmoothProgress((val) => updates.push(val))
    sp.set(150, true)
    expect(sp.current).toBe(100)
    sp.set(-50, true)
    expect(sp.current).toBe(0)
  })

  it('supports immediate mode without rAF', () => {
    const updates = []
    const sp = createSmoothProgress((val) => updates.push(val))
    sp.set(50, true)
    expect(sp.current).toBe(50)
    expect(updates[updates.length - 1]).toBe(50)
  })

  it('smoothly advances towards target value when requestAnimationFrame is available', async () => {
    let current = 0
    let rafCallbacks = []
    const originalRaf = globalThis.requestAnimationFrame
    const originalCancel = globalThis.cancelAnimationFrame

    globalThis.requestAnimationFrame = (cb) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    }
    globalThis.cancelAnimationFrame = () => {}

    try {
      const sp = createSmoothProgress((val) => {
        current = val
      })

      sp.set(50)
      expect(sp.target).toBe(50)
      expect(rafCallbacks.length).toBeGreaterThan(0)

      // Step frames
      let time = 100
      while (rafCallbacks.length > 0 && current < 50) {
        const cbs = [...rafCallbacks]
        rafCallbacks = []
        time += 16.67
        for (const cb of cbs) {
          cb(time)
        }
      }

      expect(current).toBe(50)
      sp.destroy()
    } finally {
      globalThis.requestAnimationFrame = originalRaf
      globalThis.cancelAnimationFrame = originalCancel
    }
  })
})
