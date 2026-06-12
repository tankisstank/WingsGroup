import type { FAQBlock as FAQBlockProps } from '@/payload-types'

import React from 'react'

export const FAQBlock: React.FC<FAQBlockProps> = ({ description, eyebrow, items, title }) => {
  return (
    <section className="container theme-section">
      <div className="mb-8 max-w-3xl">
        {eyebrow ? (
          <p className="site-brand-kicker mb-3 text-xs font-semibold uppercase tracking-[0.24em]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{title}</h2>
        {description ? <p className="mt-3 text-base leading-7 text-muted-foreground">{description}</p> : null}
      </div>

      <div className="grid gap-4">
        {items?.map((item, index) => (
          <details className="theme-card--quiet rounded-[var(--site-radius)] border p-5" key={`${item.question}-${index}`}>
            <summary className="cursor-pointer list-none text-lg font-semibold text-foreground">{item.question}</summary>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
