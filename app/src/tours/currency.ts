export const supportedTourCurrencyCodes = ['VND', 'USD'] as const

export type SupportedTourCurrencyCode = (typeof supportedTourCurrencyCodes)[number]

export const supportedTourCurrencyOptions = supportedTourCurrencyCodes.map((currency) => ({
  label: currency,
  value: currency,
}))

export const normalizeSupportedTourCurrency = (
  value: unknown,
): SupportedTourCurrencyCode | null => {
  if (typeof value !== 'string') return null

  const currency = value.trim().toUpperCase()
  return supportedTourCurrencyCodes.includes(currency as SupportedTourCurrencyCode)
    ? (currency as SupportedTourCurrencyCode)
    : null
}
