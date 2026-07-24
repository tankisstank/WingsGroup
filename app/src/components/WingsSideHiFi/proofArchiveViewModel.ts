import type { CredentialsCarouselBlock, Media as MediaDocument } from '@/payload-types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export type ProofRecord = {
  id: string
  category: 'appointment' | 'award'
  issuer: string
  year: string | null
  awardedEntity: string
  title: string
  summary: string
  image: string
  imageAlt: string
}

type ProofArchiveLabels = {
  missingField: string
}

type CredentialRow = CredentialsCarouselBlock['items'][number] & {
  verificationStatus?: 'verified' | 'needs-review' | null
}

const asText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const asDisplayText = (value: unknown, labels: ProofArchiveLabels): string =>
  asText(value) || labels.missingField

const asMediaDocument = (value: unknown): MediaDocument | null =>
  value && typeof value === 'object' ? (value as MediaDocument) : null

const mapCategory = (kind: CredentialRow['kind']): ProofRecord['category'] | null => {
  if (kind === 'cert') return 'appointment'
  if (kind === 'award') return 'award'
  return null
}

export const getProofTypeLabel = (
  category: ProofRecord['category'],
  labels: { appointmentType: string; awardType: string },
): string => (category === 'appointment' ? labels.appointmentType : labels.awardType)

export const buildProofImageAlt = (
  record: Pick<ProofRecord, 'awardedEntity' | 'category' | 'issuer' | 'year'>,
  labels: ProofArchiveLabels & { appointmentType: string; awardType: string },
): string => {
  const type = getProofTypeLabel(record.category, labels).toLowerCase()
  const year = record.year || labels.missingField
  return `${record.issuer} ${type} issued to ${record.awardedEntity}, ${year}`
}

export const mapCredentialsBlockToProofRecords = (
  content: CredentialsCarouselBlock | null | undefined,
  labels: ProofArchiveLabels & { appointmentType: string; awardType: string },
): ProofRecord[] => {
  if (!content?.items?.length) return []

  return content.items.flatMap((item) => {
    const row = item as CredentialRow
    const status = row.verificationStatus ?? row.reviewStatus
    const id = asText(row.id)
    const image = asMediaDocument(row.image)
    const category = mapCategory(row.kind)

    if (status !== 'verified' || !id || !image || !category) return []

    const year = row.recognitionYear ? String(row.recognitionYear) : null
    const record: ProofRecord = {
      awardedEntity: asDisplayText(row.recipient, labels),
      category,
      id,
      image: getMediaUrl(image.url, image.updatedAt),
      imageAlt: '',
      issuer: asDisplayText(row.issuer, labels),
      summary: asDisplayText(row.description, labels),
      title: asDisplayText(row.title, labels),
      year,
    }

    return [
      {
        ...record,
        imageAlt: buildProofImageAlt(record, labels),
      },
    ]
  })
}
