import nodemailer from 'nodemailer'

import type { LeadDeliveryMessage } from './types'

export type LeadDelivery = (message: LeadDeliveryMessage) => Promise<void>

const escapeHTML = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] || character)

const smtpPort = (): number => {
  const value = Number.parseInt(process.env.SMTP_PORT || '587', 10)
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.')
  }
  return value
}

export const createSMTPDelivery = (): LeadDelivery => {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM_EMAIL
  const fromName = process.env.SMTP_FROM_NAME || 'WingsTravel Website'
  const to = process.env.LEAD_NOTIFICATION_TO
  if (!host || !user || !password || !from || !to) {
    throw new Error('SMTP lead delivery is not configured.')
  }

  const client = nodemailer.createTransport({
    auth: { pass: password, user },
    host,
    port: smtpPort(),
    secure: process.env.SMTP_SECURE === 'true',
  })
  return async (message) => {
    const rows = message.fields
      .map(({ label, value }) => `<tr><th align="left">${escapeHTML(label)}</th><td>${escapeHTML(value)}</td></tr>`)
      .join('')
    await client.sendMail({
      from: `${fromName} <${from}>`,
      html: `<h1>New website lead</h1><p>Site: ${escapeHTML(message.siteCode)}</p><p>Form: ${escapeHTML(message.formTitle)}</p><table>${rows}</table>`,
      // SMTP has no provider-level idempotency. A stable Message-ID lets
      // capable relays and inboxes collapse task retries.
      messageId: `<wingstravel-lead-${message.submissionId}@${host}>`,
      subject: `[${message.siteCode}] New lead from ${message.formTitle}`,
      to: to.split(',').map((address) => address.trim()).filter(Boolean),
    })
  }
}

export const deliverWithRetry = async (
  delivery: LeadDelivery,
  message: LeadDeliveryMessage,
  options: {
    attempts?: number
    delay?: (milliseconds: number) => Promise<void>
    onDeadLetter?: (metadata: Pick<LeadDeliveryMessage, 'siteCode' | 'submissionId'>) => void
  } = {},
): Promise<boolean> => {
  const attempts = options.attempts || 3
  const delay = options.delay || ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await delivery(message)
      return true
    } catch {
      if (attempt < attempts) await delay(250 * 2 ** (attempt - 1))
    }
  }

  options.onDeadLetter?.({ siteCode: message.siteCode, submissionId: message.submissionId })
  return false
}
