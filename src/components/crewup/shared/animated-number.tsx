'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  /** Target value to count up to */
  value: number
  /** Duration of the count-up animation in ms (default 900) */
  duration?: number
  /** Number of decimal places to display (default 0) */
  decimals?: number
  /** Optional formatter applied to the displayed value (overrides decimals) */
  format?: (n: number) => string
  /** Disable animation — render the final value immediately */
  disabled?: boolean
  className?: string
}

/**
 * Counts up to `value` once the element scrolls into view (or immediately on
 * mount if already in view). Respects prefers-reduced-motion via the global
 * CSS rule that drops animation-duration to ~0ms.
 *
 * When `disabled` is true, the component renders the final value directly
 * without any state or effect — useful for SSR or static contexts.
 */
export function AnimatedNumber({
  value,
  duration = 900,
  decimals = 0,
  format,
  disabled = false,
  className,
}: AnimatedNumberProps) {
  // When disabled, skip animation entirely — render the formatted value directly.
  if (disabled) {
    const formatted = format ? format(value) : value.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return <span className={cn('tabular-nums animate-count-pop', className)}>{formatted}</span>
  }

  return (
    <AnimatedNumberInner
      value={value}
      duration={duration}
      decimals={decimals}
      format={format}
      className={className}
    />
  )
}

function AnimatedNumberInner({
  value,
  duration,
  decimals,
  format,
  className,
}: Required<Pick<AnimatedNumberProps, 'value' | 'duration' | 'decimals'>> & {
  format?: (n: number) => string
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const startAnim = () => {
      if (startedRef.current) return
      startedRef.current = true
      const start = performance.now()
      const from = 0
      const to = value
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        // easeOutCubic
        const eased = 1 - Math.pow(1 - t, 3)
        setDisplay(from + (to - from) * eased)
        if (t < 1) requestAnimationFrame(tick)
        else setDisplay(to)
      }
      requestAnimationFrame(tick)
    }

    // Use IntersectionObserver to trigger when scrolled into view
    if (typeof IntersectionObserver === 'undefined') {
      startAnim()
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            startAnim()
            io.disconnect()
            break
          }
        }
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [value, duration])

  const formatted = format ? format(display) : display.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span ref={ref} className={cn('tabular-nums animate-count-pop', className)}>
      {formatted}
    </span>
  )
}
