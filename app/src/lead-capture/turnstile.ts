type TurnstileResponse = {
  action?: string
  hostname?: string
  success?: boolean
}

const normalizeHost = (value: string): string =>
  value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0]

export const verifyTurnstile = async (input: {
  expectedHosts: string[]
  ip: string
  token?: string
}): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret || !input.token) return false

  const body = new URLSearchParams({
    remoteip: input.ip,
    response: input.token,
    secret,
  })
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    body,
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) return false

  const result = (await response.json()) as TurnstileResponse
  if (!result.success) return false
  if (result.action !== 'lead-submit') return false

  if (!result.hostname || input.expectedHosts.length === 0) return false
  const verifiedHost = normalizeHost(result.hostname)
  return input.expectedHosts.some((host) => normalizeHost(host) === verifiedHost)
}
