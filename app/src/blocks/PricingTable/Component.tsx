import type { PricingTableBlock as PricingTableBlockProps } from '@/payload-types'

import React from 'react'

import { CMSLink } from '@/components/Link'

export const PricingTableBlock: React.FC<PricingTableBlockProps> = ({
  description,
  eyebrow,
  items,
  title,
}) => {
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

      <div className="overflow-hidden rounded-[var(--site-radius)] border bg-background/80 shadow-sm">
        <div className="hidden border-b bg-[color:var(--site-surface)] px-6 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] md:gap-4">
          <span>Chương trình</span>
          <span>Khởi hành</span>
          <span>Hãng bay</span>
          <span>Giá từ</span>
          <span>CTA</span>
        </div>

        <div className="divide-y">
          {items?.map((item, index) => (
            <article className="grid gap-3 px-6 py-5 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] md:items-center md:gap-4" key={`${item.title}-${index}`}>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                {item.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{item.subtitle}</p> : null}
                {item.note ? <p className="mt-2 text-xs font-medium text-[color:var(--site-accent)]">{item.note}</p> : null}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="md:hidden font-semibold text-foreground">Khởi hành: </span>
                {item.departure || 'Liên hệ'}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="md:hidden font-semibold text-foreground">Hãng bay: </span>
                {item.airline || 'Đang cập nhật'}
              </div>
              <div className="text-base font-semibold text-[color:var(--site-brand)]">
                <span className="md:hidden font-semibold text-foreground">Giá từ: </span>
                {item.price}
              </div>
              <div>
                {item.link?.label && (item.link.url || item.link.reference) ? (
                  <CMSLink
                    appearance="default"
                    {...item.link}
                    className="w-full rounded-full px-4 py-2 text-sm md:w-auto"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
