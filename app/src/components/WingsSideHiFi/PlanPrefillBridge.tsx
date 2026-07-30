'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { queryPlanFormField, setNativeInputValue } from './planFormNative'
import type { LeadSubmissionContext } from '@/lead-capture/types'

type ChipGroup = {
  label: string
  multi?: boolean
  name: string
  options: string[]
}

const preferredMonthLabelByLocale: Record<string, string> = {
  en: 'Preferred travel month/date window',
  es: 'Mes o intervalo de fechas preferido',
  it: 'Mese o intervallo di date preferito',
  pt: 'Mês ou intervalo de datas preferido',
  vi: 'Khoảng tháng/ngày dự kiến',
}

const countryResidenceLabelByLocale: Record<string, string> = {
  en: 'Country of residence',
  es: 'País de residencia',
  it: 'Paese di residenza',
  pt: 'País de residência',
  vi: 'Quốc gia cư trú',
}

const normalizeContextCode = (value?: string) => {
  const code = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return code && code.length <= 64 ? code : undefined
}

const normalizeDiscoverySearch = (value?: string) => {
  const search = String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return search ? Array.from(search).slice(0, 80).join('') : undefined
}

const normalizeDiscoveryType = (value?: string) =>
  value === 'group' || value === 'private' ? value : undefined

/**
 * Plan form chrome: URL prefill + visible month/group selectors + chips + consent.
 * Hosts reattach via MutationObserver when FormBlock rerenders.
 * Writes into real Payload fields with native value setters (controlled-compatible).
 */
export const PlanPrefillBridge = ({
  budgetLabel,
  budgetOptions,
  consentLabel,
  destLabel,
  destOptions,
  groupLabel,
  groupOptions,
  locale = 'en',
  monthLabel,
  monthOptions,
  searchParams,
  styleLabel,
  styleOptions,
}: {
  budgetLabel: string
  budgetOptions: string[]
  consentLabel: string
  destLabel: string
  destOptions: string[]
  groupLabel: string
  groupOptions: Array<{ label: string; value: string }>
  locale?: string
  monthLabel: string
  monthOptions: Array<{ label: string; value: string }>
  searchParams?: Record<string, string | string[] | undefined>
  styleLabel: string
  styleOptions: string[]
}) => {
  const [midHost, setMidHost] = useState<HTMLElement | null>(null)
  const [consentHost, setConsentHost] = useState<HTMLElement | null>(null)
  const [month, setMonth] = useState('')
  const [group, setGroup] = useState('')
  const [dest, setDest] = useState<string[]>([])
  const [style, setStyle] = useState('')
  const [budget, setBudget] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [monthRequired, setMonthRequired] = useState(false)
  const consentInputRef = React.useRef<HTMLInputElement>(null)
  const localizedMonthLabel = preferredMonthLabelByLocale[locale] || monthLabel

  const readParam = useMemo(
    () => (key: string) => {
      if (!searchParams) return undefined
      const value = searchParams[key]
      return Array.isArray(value) ? value[0] : value
    },
    [searchParams],
  )

  const setField = (name: string, value: string) => {
    setNativeInputValue(queryPlanFormField(name), value)
  }

  const hideRawFields = (root: Element) => {
    const countryControl = root.querySelector<HTMLElement>('[name="country"]')
    countryControl?.setAttribute(
      'aria-label',
      countryResidenceLabelByLocale[locale] || countryResidenceLabelByLocale.en,
    )

    const labelsByName: Record<string, string> = {
      'group-size': groupLabel,
      'travel-month': localizedMonthLabel,
    }

    for (const [name, label] of Object.entries(labelsByName)) {
      const control = root.querySelector<HTMLElement>(`[name="${name}"]`)
      control?.setAttribute('aria-label', label)
      const wrap = control
        ?.closest('.mb-6, .mb-4') as HTMLElement | null
      if (wrap) wrap.setAttribute('data-ws-plan-hide', 'true')
    }
  }

  const ensureHosts = (): { mid: HTMLElement; consent: HTMLElement } | null => {
    const root = document.querySelector('.ws-hifi-plan-form form')
    if (!root) return null

    const fieldStack =
      (root.querySelector('.mb-4') as HTMLElement | null) || (root as HTMLElement)

    let mid = fieldStack.querySelector('.ws-plan-chrome-host-mid') as HTMLElement | null
    if (!mid || !mid.isConnected || mid.parentElement !== fieldStack) {
      mid = document.createElement('div')
      mid.className = 'ws-plan-chrome-host-mid'
      fieldStack.appendChild(mid)
    }

    let consentEl = fieldStack.querySelector(
      '.ws-plan-chrome-host-consent',
    ) as HTMLElement | null
    if (!consentEl || !consentEl.isConnected || consentEl.parentElement !== fieldStack) {
      consentEl = document.createElement('div')
      consentEl.className = 'ws-plan-chrome-host-consent'
      fieldStack.appendChild(consentEl)
    }

    hideRawFields(root)
    return { mid, consent: consentEl }
  }

  // Keep hosts attached across FormBlock controlled rerenders.
  useEffect(() => {
    let observer: MutationObserver | null = null

    const sync = () => {
      const hosts = ensureHosts()
      if (!hosts) return
      setMidHost((current) => (current === hosts.mid ? current : hosts.mid))
      setConsentHost((current) => (current === hosts.consent ? current : hosts.consent))
    }

    sync()
    const poll = window.setInterval(() => {
      const hosts = ensureHosts()
      if (!hosts) return
      if (!hosts.mid.isConnected || !hosts.consent.isConnected) sync()
      else hideRawFields(document.querySelector('.ws-hifi-plan-form form')!)
    }, 200)

    const planRoot = document.querySelector('.ws-hifi-plan-form')
    if (planRoot) {
      observer = new MutationObserver(() => {
        const hosts = ensureHosts()
        if (!hosts) return
        if (!hosts.mid.isConnected || hosts.mid !== midHost || hosts.consent !== consentHost) {
          sync()
        } else {
          hideRawFields(document.querySelector('.ws-hifi-plan-form form')!)
        }
      })
      observer.observe(planRoot, { childList: true, subtree: true })
    }

    return () => {
      if (poll) window.clearInterval(poll)
      observer?.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- attach lifecycle only
  }, [])

  // URL prefill once hosts are ready.
  useEffect(() => {
    if (!midHost?.isConnected) return

    const destination = readParam('destination')
    const monthParam = readParam('month')
    const styleParam = readParam('style')

    if (monthParam) {
      const match =
        monthOptions.find((option) => option.value === monthParam) ||
        monthOptions.find((option) =>
          option.label.toLowerCase().includes(monthParam.toLowerCase()),
        )
      if (match) {
        setMonth(match.value)
        setField('travel-month', match.label)
      } else {
        setField('travel-month', monthParam)
      }
    }

    if (destination) {
      const label =
        destOptions.find((item) =>
          item.toLowerCase().includes(destination.replace(/-/g, ' ')),
        ) || destination
      setDest((current) => (current.includes(label) ? current : [...current, label]))
    }

    if (styleParam) {
      const label =
        styleOptions.find((item) =>
          item.toLowerCase().includes(styleParam.replace(/-/g, ' ')),
        ) || styleParam
      setStyle(label)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midHost, readParam])

  useEffect(() => {
    if (!midHost?.isConnected) return
    setMonthRequired(Boolean(queryPlanFormField('travel-month')?.hasAttribute('required')))
  }, [midHost])

  useEffect(() => {
    if (!month) return
    const label = monthOptions.find((option) => option.value === month)?.label || month
    setField('travel-month', label)
  }, [month, monthOptions])

  useEffect(() => {
    if (!group) return
    const digits = group.replace(/[^\d].*$/, '') || group
    setField('group-size', digits)
  }, [group])

  useEffect(() => {
    const form = document.querySelector('.ws-hifi-plan-form form') as HTMLFormElement | null
    if (!form) return

    const destination =
      normalizeContextCode(readParam('destination')) ||
      (dest.length === 1 ? normalizeContextCode(dest[0]) : undefined)
    const styleCode = normalizeContextCode(readParam('style')) || normalizeContextCode(style)
    const context: LeadSubmissionContext = {
      discovery: {
        destination,
        duration: normalizeContextCode(readParam('duration')),
        q: normalizeDiscoverySearch(readParam('q')),
        style: styleCode,
        type: normalizeDiscoveryType(readParam('type')),
      },
      source: normalizeContextCode(readParam('source')) || 'plan',
      tourId: readParam('tourId'),
      tourSlug: normalizeContextCode(readParam('tour')),
    }
    form.dataset.wsEnquiryContext = JSON.stringify(context)
  }, [dest, midHost, readParam, style])

  useEffect(() => {
    const form = document.querySelector('.ws-hifi-plan-form form') as HTMLFormElement | null
    if (!form) return

    const onValidate = (event: Event) => {
      if (!consent) {
        event.preventDefault()
        event.stopPropagation()
        setConsentError(true)
        window.requestAnimationFrame(() => consentInputRef.current?.focus())
      }
    }

    form.addEventListener('ws-plan-validate', onValidate)
    return () => form.removeEventListener('ws-plan-validate', onValidate)
  }, [consent, consentHost])

  const groups: ChipGroup[] = [
    { label: destLabel, multi: true, name: 'dest', options: destOptions },
    { label: styleLabel, name: 'style', options: styleOptions },
    { label: budgetLabel, name: 'budget', options: budgetOptions },
  ]

  const midChrome = (
    <>
      <div className="field ws-plan-visual-field" data-order="month">
        <label className="field-label" htmlFor="ws-plan-travel-month">
          {localizedMonthLabel}
        </label>
        <select
          aria-required={monthRequired || undefined}
          className="input"
          id="ws-plan-travel-month"
          onChange={(event) => setMonth(event.target.value)}
          required={monthRequired}
          value={month}
        >
          <option value="">
            {localizedMonthLabel}
          </option>
          {monthOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field ws-plan-visual-field" data-order="group">
        <label className="field-label" htmlFor="ws-plan-group-size">
          {groupLabel}
        </label>
        <select
          className="input"
          id="ws-plan-group-size"
          onChange={(event) => setGroup(event.target.value)}
          value={group}
        >
          <option value="">{groupLabel}</option>
          {groupOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="ws-hifi-plan-chips" data-testid="plan-brief-chips">
        {groups.map((groupItem) => (
          <div className="field" key={groupItem.name}>
            <span className="field-label" id={`ws-plan-${groupItem.name}-label`}>
              {groupItem.label}
            </span>
            <div
              aria-labelledby={`ws-plan-${groupItem.name}-label`}
              className="chips"
              role="group"
            >
              {groupItem.options.map((option) => {
                const on = groupItem.multi
                  ? dest.includes(option)
                  : groupItem.name === 'style'
                    ? style === option
                    : budget === option
                return (
                  <button
                    aria-pressed={on}
                    className={on ? 'chip is-on' : 'chip'}
                    key={`${groupItem.name}-${option}`}
                    onClick={() => {
                      if (groupItem.multi) {
                        setDest((current) =>
                          current.includes(option)
                            ? current.filter((item) => item !== option)
                            : [...current, option],
                        )
                        return
                      }
                      if (groupItem.name === 'style') {
                        setStyle((current) => (current === option ? '' : option))
                        return
                      }
                      setBudget((current) => (current === option ? '' : option))
                    }}
                    type="button"
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  const consentChrome = (
    <>
      <label className="ws-plan-consent" data-invalid={consentError ? 'true' : 'false'}>
        <input
          aria-describedby={consentError ? 'ws-plan-consent-error' : undefined}
          aria-invalid={consentError || undefined}
          checked={consent}
          onChange={(event) => {
            setConsent(event.target.checked)
            if (event.target.checked) setConsentError(false)
          }}
          ref={consentInputRef}
          type="checkbox"
        />
        <span>{consentLabel}</span>
      </label>
      {consentError ? (
        <p className="ws-plan-consent-error" id="ws-plan-consent-error" role="alert">
          {consentLabel}
        </p>
      ) : null}
    </>
  )

  return (
    <>
      {midHost?.isConnected ? createPortal(midChrome, midHost) : null}
      {consentHost?.isConnected ? createPortal(consentChrome, consentHost) : null}
    </>
  )
}
