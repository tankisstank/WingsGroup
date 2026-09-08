'use client'

import React, { useState } from 'react'

import { ProtectedEmailLink } from './ProtectedEmailLink'

type Props = { locale?: string | null; siteCode?: string | null }

export const SiteContactFab: React.FC<Props> = ({ locale, siteCode }) => {
  const [open, setOpen] = useState(false)
  if (siteCode !== 'wings-go' && siteCode !== 'wing-side') return null
  const isVi = locale === 'vi'
  const contactPath = siteCode === 'wing-side' ? '/contact-us' : '/lien-he'
  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed bottom-5 right-5 z-[80] rounded-full bg-[var(--site-brand)] px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02]"
        onClick={() => setOpen(true)}
        type="button"
      >
        {isVi ? 'Liên hệ' : 'Contact us'}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-end bg-slate-950/35 p-5 sm:items-center sm:justify-center">
          <section
            aria-labelledby="site-contact-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 text-slate-950 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {isVi ? 'Kết nối trực tiếp' : 'Direct contact'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold" id="site-contact-title">
                  {isVi ? 'Bạn cần hỗ trợ?' : 'How can we help?'}
                </h2>
              </div>
              <button
                aria-label={isVi ? 'Đóng' : 'Close'}
                className="text-2xl"
                onClick={() => setOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {isVi
                ? 'Đội ngũ WingsGroup sẽ tiếp nhận và phản hồi nhu cầu của bạn.'
                : 'The WingsGroup team will receive your request and follow up.'}
            </p>
            <div className="mt-5 grid gap-3">
              <a
                className="rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400"
                href="tel:0912910101"
              >
                0912910101
              </a>
              <ProtectedEmailLink
                className="rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400"
                email="info@wingsgroup.vn"
              />
              <ProtectedEmailLink
                className="rounded-xl border border-slate-200 px-4 py-3 font-medium hover:border-slate-400"
                email="sales@wingsgroup.vn"
              />
              <a
                className="rounded-xl bg-slate-900 px-4 py-3 text-center font-semibold text-white"
                href={contactPath}
              >
                {isVi ? 'Mở trang liên hệ' : 'Open contact page'}
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
