import React from 'react'

const emailPattern = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/u

const escapeHTML = (value: string) =>
  value.replace(/[&<>'"]/gu, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      "'": '&#39;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    }

    return entities[character] || character
  })

/**
 * Emits Cloudflare's documented opt-out markers in the server HTML while
 * retaining a normal mailto link for JavaScript-disabled visitors and crawlers.
 */
export const ProtectedEmailLink = ({
  className,
  email,
  label,
}: {
  className?: string
  email?: null | string
  label?: null | string
}) => {
  const normalizedEmail = email?.trim()

  if (!normalizedEmail || !emailPattern.test(normalizedEmail)) return null

  const visibleLabel = label?.trim() || normalizedEmail
  const classAttribute = className ? ` class="${escapeHTML(className)}"` : ''
  const markup = `<!--email_off--><a${classAttribute} href="mailto:${escapeHTML(normalizedEmail)}">${escapeHTML(visibleLabel)}</a><!--/email_off-->`

  return <span dangerouslySetInnerHTML={{ __html: markup }} />
}
