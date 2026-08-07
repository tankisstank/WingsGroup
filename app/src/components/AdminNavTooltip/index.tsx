'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const tooltipClass = 'wings-admin-nav-tooltip'

export default function AdminNavTooltip() {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [label, setLabel] = useState('Mở điều hướng')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const syncTooltip = () => {
      const nextTarget = document.querySelector<HTMLElement>('.nav-toggler')
      const nextLabel = nextTarget?.getAttribute('aria-label') || 'Mở điều hướng'
      const nextIsOpen = nextTarget?.classList.contains('nav-toggler--is-open') || false

      setTarget((currentTarget) => (currentTarget === nextTarget ? currentTarget : nextTarget))
      setLabel((currentLabel) => (currentLabel === nextLabel ? currentLabel : nextLabel))
      setIsOpen((currentIsOpen) => (currentIsOpen === nextIsOpen ? currentIsOpen : nextIsOpen))
    }

    syncTooltip()

    const observer = new MutationObserver(syncTooltip)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['aria-label', 'class'],
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (target) target.setAttribute('aria-describedby', 'wings-admin-nav-tooltip')
  }, [target])

  if (!target) return null

  const tooltipID = 'wings-admin-nav-tooltip'

  return createPortal(
    <span
      className={tooltipClass}
      data-state={isOpen ? 'open' : 'closed'}
      id={tooltipID}
      role="tooltip"
    >
      {label}
    </span>,
    target,
  )
}
