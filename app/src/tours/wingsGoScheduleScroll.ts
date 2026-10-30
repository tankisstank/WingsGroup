'use client'

/**
 * Smoothly scrolls to a target schedule element unless prefers-reduced-motion is active.
 * Uses window.scrollTo; never uses scrollIntoView.
 */
export const scrollToScheduleList = (
  targetId = 'wingsgo-schedule-list',
  customOffset?: number,
): void => {
  if (typeof window === 'undefined') return
  const el = document.getElementById(targetId)
  if (!el) return

  let offset = customOffset ?? 0
  if (customOffset === undefined) {
    const filterBar =
      document.querySelector<HTMLElement>('.wingsgo-schedule-filter-bar') ||
      document.querySelector<HTMLElement>('[data-od-id="schedule-filter-bar"]')
    if (filterBar) {
      offset = filterBar.getBoundingClientRect().height
    }
  }

  const rect = el.getBoundingClientRect()
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const targetTop = window.scrollY + rect.top - offset
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}
