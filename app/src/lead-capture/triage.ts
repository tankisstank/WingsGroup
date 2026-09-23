export const SALES_NOTE_MAX_LENGTH = 2000

export const salesStatusOptions = [
  { label: 'Mới tiếp nhận', value: 'new' },
  { label: 'Đang gọi tư vấn', value: 'contacting' },
  { label: 'Đã chốt', value: 'won' },
  { label: 'Không nghe máy', value: 'no_answer' },
  { label: 'Không phù hợp', value: 'lost' },
] as const

export type SalesStatus = (typeof salesStatusOptions)[number]['value']

export const salesStatusLabels: Record<SalesStatus, string> = Object.fromEntries(
  salesStatusOptions.map((option) => [option.value, option.label]),
) as Record<SalesStatus, string>

export const isSalesStatus = (value: unknown): value is SalesStatus =>
  typeof value === 'string' && salesStatusOptions.some((option) => option.value === value)

export const getSalesStatusLabel = (value: unknown): string => {
  if (isSalesStatus(value)) return salesStatusLabels[value]
  return 'Chưa phân loại'
}
