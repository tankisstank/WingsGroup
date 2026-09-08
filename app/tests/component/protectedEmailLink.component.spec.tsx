import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ProtectedEmailLink } from '@/components/ProtectedEmailLink'

describe('ProtectedEmailLink', () => {
  it('emits Cloudflare opt-out comments around a normal mailto link', () => {
    const html = renderToStaticMarkup(
      <ProtectedEmailLink className="contact-link" email="info@wingsgroup.vn" />,
    )

    expect(html).toContain('<!--email_off-->')
    expect(html).toContain('<!--/email_off-->')
    expect(html).toContain('class="contact-link"')
    expect(html).toContain('href="mailto:info@wingsgroup.vn"')
  })

  it('does not render malformed email input into HTML', () => {
    expect(renderToStaticMarkup(<ProtectedEmailLink email={'bad@example.com"><script>'} />)).toBe('')
  })
})
