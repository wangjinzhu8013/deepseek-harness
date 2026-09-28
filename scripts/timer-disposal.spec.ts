/** The vendored timer service stops scheduled callbacks once its owning fiber disposes, and keeps `noTrailing` independent of disposal. */
import { Context } from '@deepseek-ai/cordis'
import Timer from '@deepseek-ai/cordis-plugin-timer'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

async function context() {
  const ctx = new Context()
  await ctx.plugin(Timer)
  onTestFinished(() => ctx.fiber.dispose())
  return ctx
}

describe('timer disposal', () => {
  it('suppresses a throttled leading call after the owning fiber disposes', async () => {
    const ctx = await context()
    const callback = vi.fn()
    const throttled = ctx.throttle(callback, 1000)
    await ctx.fiber.dispose()
    throttled()
    expect(callback).not.toHaveBeenCalled()
  })

  it('runs the throttled leading call while the fiber is active', async () => {
    const ctx = await context()
    const callback = vi.fn()
    const throttled = ctx.throttle(callback, 1000)
    throttled()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('schedules a trailing call by default and clears it on disposal', async () => {
    vi.useFakeTimers()
    try {
      const ctx = await context()
      const callback = vi.fn()
      const throttled = ctx.throttle(callback, 1000)
      throttled()
      vi.advanceTimersByTime(100)
      throttled()
      await ctx.fiber.dispose()
      vi.advanceTimersByTime(5000)
      expect(callback).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the leading call and drops the trailing call under noTrailing', async () => {
    vi.useFakeTimers()
    try {
      const ctx = await context()
      const callback = vi.fn()
      const throttled = ctx.throttle(callback, 1000, true)
      throttled()
      vi.advanceTimersByTime(100)
      throttled()
      vi.advanceTimersByTime(5000)
      expect(callback).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('drops a debounced call after the owning fiber disposes', async () => {
    vi.useFakeTimers()
    try {
      const ctx = await context()
      const callback = vi.fn()
      const debounced = ctx.debounce(callback, 1000)
      await ctx.fiber.dispose()
      debounced()
      vi.advanceTimersByTime(5000)
      expect(callback).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
