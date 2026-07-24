export const tourDestinationOptions = [
  { label: 'Hà Nội', value: 'hanoi' },
  { label: 'Hạ Long', value: 'halong' },
  { label: 'Ninh Bình', value: 'ninh-binh' },
  { label: 'Sa Pa', value: 'sapa' },
  { label: 'Mai Châu', value: 'mai-chau' },
  { label: 'Huế', value: 'hue' },
  { label: 'Đà Nẵng', value: 'da-nang' },
  { label: 'Hội An', value: 'hoian' },
  { label: 'TP. Hồ Chí Minh', value: 'ho-chi-minh-city' },
  { label: 'Đồng bằng sông Cửu Long', value: 'mekong' },
  { label: 'Phú Quốc', value: 'phu-quoc' },
  { label: 'Ninh Thuận', value: 'ninh-thuan' },
  { label: 'Siem Reap', value: 'siem-reap' },
] as const

export const tourTravelStyleOptions = [
  { label: 'Sang trọng', value: 'luxury' },
  { label: 'Gia đình', value: 'family' },
  { label: 'Văn hóa', value: 'culture' },
  { label: 'Phiêu lưu', value: 'adventure' },
  { label: 'Nghỉ dưỡng', value: 'wellness' },
  { label: 'Lãng mạn', value: 'romance' },
  { label: 'Công vụ', value: 'business' },
] as const

export type TourDestinationKey = (typeof tourDestinationOptions)[number]['value']
export type TourTravelStyleKey = (typeof tourTravelStyleOptions)[number]['value']

const destinationOrder = new Map(tourDestinationOptions.map(({ value }, index) => [value, index]))
const travelStyleOrder = new Map(tourTravelStyleOptions.map(({ value }, index) => [value, index]))

const normalizeKeys = <T extends string>(values: readonly T[], order: Map<T, number>): T[] => {
  const unique = new Set(values)

  if (unique.size !== values.length) {
    throw new Error('Taxonomy keys must be unique.')
  }

  for (const value of unique) {
    if (!order.has(value)) {
      throw new Error(`Unknown taxonomy key: ${value}`)
    }
  }

  return [...unique].sort((left, right) => order.get(left)! - order.get(right)!)
}

export const normalizeTourDestinationKeys = (values: readonly TourDestinationKey[]) =>
  normalizeKeys(values, destinationOrder)

export const normalizeTourTravelStyleKeys = (values: readonly TourTravelStyleKey[]) =>
  normalizeKeys(values, travelStyleOrder)

export const buildTourTaxonomyWhere = ({
  destination,
  travelStyle,
}: {
  destination?: TourDestinationKey
  travelStyle?: TourTravelStyleKey
}) => {
  if (!destination && !travelStyle) {
    throw new Error('At least one taxonomy filter is required.')
  }

  const conditions: Array<Record<string, unknown>> = []
  if (destination) {
    normalizeTourDestinationKeys([destination])
    conditions.push({ destinationTags: { in: [destination] } })
  }
  if (travelStyle) {
    normalizeTourTravelStyleKeys([travelStyle])
    conditions.push({ travelStyles: { in: [travelStyle] } })
  }

  return conditions.length === 1 ? conditions[0] : { and: conditions }
}
