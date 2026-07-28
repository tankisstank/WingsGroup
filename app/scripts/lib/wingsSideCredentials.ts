import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const WINGSSIDE_CREDENTIAL_LOCALES = ['en', 'vi', 'it', 'es', 'pt'] as const
export const WINGSSIDE_CREDENTIAL_SITE_CODE = 'wing-side'

export type WingsSideCredentialLocale = (typeof WINGSSIDE_CREDENTIAL_LOCALES)[number]
export type WingsSideCredentialItem = {
  alt: string
  description: string
  file: string
  id: string
  issuedOn?: string
  issuer: string
  kind: 'award' | 'cert' | 'iso' | 'member'
  label: string
  mark: string
  recognitionYear?: number
  recipient: string
  referenceCode?: string
  reviewStatus: 'needs-review' | 'verified'
  sourceFilename: string
  title: string
}
export type WingsSideCredentialManifest = {
  items: WingsSideCredentialItem[]
  siteCode: string
  sourceDirectory: string
  version: number
}

export const wingsSideCredentialAssetRoot = path.resolve(
  import.meta.dirname,
  '../../assets/wingsside-credentials',
)

const sectionCopy: Record<
  WingsSideCredentialLocale,
  { ariaLabel: string; description: string; eyebrow: string; title: string }
> = {
  en: {
    ariaLabel: 'Verified airline and travel industry credentials',
    description:
      'A documented record of airline partnerships, agency certificates and performance recognition.',
    eyebrow: 'Credentials and awards',
    title: 'Recognition earned across years of aviation partnership',
  },
  vi: {
    ariaLabel: 'Chứng nhận và giải thưởng đã được xác minh',
    description:
      'Hồ sơ được đối chiếu từ ảnh gốc về quan hệ đại lý, đối tác hàng không và thành tích kinh doanh.',
    eyebrow: 'Chứng nhận & giải thưởng',
    title: 'Dấu ấn được ghi nhận qua nhiều năm hợp tác hàng không',
  },
  it: {
    ariaLabel: 'Certificazioni e premi verificati',
    description:
      'Una raccolta documentata di partnership aeree, certificazioni di agenzia e riconoscimenti.',
    eyebrow: 'Certificazioni e premi',
    title: 'Riconoscimenti maturati in anni di partnership nel settore aereo',
  },
  es: {
    ariaLabel: 'Credenciales y premios verificados',
    description:
      'Un registro documentado de alianzas aéreas, certificados de agencia y reconocimientos.',
    eyebrow: 'Credenciales y premios',
    title: 'Reconocimientos logrados durante años de colaboración aérea',
  },
  pt: {
    ariaLabel: 'Credenciais e prémios verificados',
    description:
      'Um registo documentado de parcerias aéreas, certificados de agência e reconhecimentos.',
    eyebrow: 'Credenciais e prémios',
    title: 'Reconhecimento construído ao longo de anos de parceria aérea',
  },
}

export const loadWingsSideCredentialManifest = async (): Promise<WingsSideCredentialManifest> => {
  const manifestPath = path.join(wingsSideCredentialAssetRoot, 'manifest.json')
  const manifest = JSON.parse(
    await fs.readFile(manifestPath, 'utf8'),
  ) as WingsSideCredentialManifest
  await validateWingsSideCredentialManifest(manifest)
  return manifest
}

export const validateWingsSideCredentialManifest = async (
  manifest: WingsSideCredentialManifest,
) => {
  if (manifest.version !== 1) throw new Error(`Unsupported manifest version ${manifest.version}`)
  if (manifest.siteCode !== WINGSSIDE_CREDENTIAL_SITE_CODE) {
    throw new Error(`Credential manifest must target ${WINGSSIDE_CREDENTIAL_SITE_CODE}`)
  }
  if (manifest.items.length !== 24) {
    throw new Error(`Expected the photographed 24-item catalog; found ${manifest.items.length}`)
  }

  for (const key of ['id', 'file', 'sourceFilename'] as const) {
    const values = manifest.items.map((item) => item[key])
    if (new Set(values).size !== values.length) throw new Error(`Duplicate credential ${key}`)
  }

  for (const item of manifest.items) {
    if (!item.alt || !item.issuer || !item.recipient || !item.title || !item.description) {
      throw new Error(`Credential ${item.id} is missing required editorial metadata`)
    }
    if (item.recognitionYear && (item.recognitionYear < 1900 || item.recognitionYear > 2100)) {
      throw new Error(`Credential ${item.id} has an invalid recognition year`)
    }
    await fs.access(path.join(wingsSideCredentialAssetRoot, item.file))
  }
}

export const buildWingsSideCredentialsBlock = ({
  locale,
  manifest,
  mediaIDs,
}: {
  locale: WingsSideCredentialLocale
  manifest: WingsSideCredentialManifest
  mediaIDs: Map<string, number | string>
}) => {
  const copy = sectionCopy[locale]
  return {
    ariaLabel: copy.ariaLabel,
    autoplay: false,
    blockName: 'WingsSide credentials catalog',
    blockType: 'credentialsCarousel' as const,
    description: copy.description,
    eyebrow: copy.eyebrow,
    fullBleed: true,
    intervalMs: 6500,
    items: manifest.items.map((item) => {
      const mediaID = mediaIDs.get(item.id)
      if (mediaID === undefined) throw new Error(`Missing Media relation for ${item.id}`)
      return {
        description: item.description,
        image: mediaID,
        issuedOn: item.issuedOn,
        issuer: item.issuer,
        kind: item.kind,
        label: item.label,
        mark: item.mark,
        recognitionYear: item.recognitionYear,
        recipient: item.recipient,
        referenceCode: item.referenceCode,
        reviewStatus: item.reviewStatus,
        sourceFilename: item.sourceFilename,
        title: item.title,
      }
    }),
    title: copy.title,
  }
}

export const summarizeWingsSideCredentials = (manifest: WingsSideCredentialManifest) => ({
  issuers: [...new Set(manifest.items.map((item) => item.issuer))].sort(),
  needsReview: manifest.items.filter((item) => item.reviewStatus === 'needs-review').length,
  oldestYear: Math.min(
    ...manifest.items.flatMap((item) => (item.recognitionYear ? [item.recognitionYear] : [])),
  ),
  total: manifest.items.length,
  verified: manifest.items.filter((item) => item.reviewStatus === 'verified').length,
  newestYear: Math.max(
    ...manifest.items.flatMap((item) => (item.recognitionYear ? [item.recognitionYear] : [])),
  ),
})

const us055RehearsalCredentialSources = [
  {
    alt: 'Chứng nhận đại lý ủy quyền VietJet của Vietwings Travel năm 2022',
    description:
      'Vietwings Travel JSC được VietJet công nhận là đại lý ủy quyền, mã VJC 37410015.',
    file: 'wingsside-credential-8359.jpg',
    id: 'vietjet-vietwings-authorized-agent-2022',
    issuedOn: '2022-10-01',
    issuer: 'VietJet Air',
    kind: 'cert',
    label: 'VietJet Air · 2022',
    mark: 'VJ',
    recognitionYear: 2022,
    recipient: 'Vietwings Travel JSC',
    referenceCode: 'VJC 37410015',
    reviewStatus: 'verified',
    sourceFilename: 'IMG_8359.JPG',
    title: 'Authorized Agent of VietJet',
  },
  {
    alt: 'Kỷ niệm chương Air China ghi nhận Vietwings năm 2025',
    description:
      'Air China ghi nhận Vietwings là công ty lữ hành có đóng góp xuất sắc năm 2025.',
    file: 'wingsside-credential-8362.jpg',
    id: 'air-china-outstanding-contribution-2025',
    issuedOn: null,
    issuer: 'Air China',
    kind: 'award',
    label: 'Air China · 2025',
    mark: 'CA',
    recognitionYear: 2025,
    recipient: 'Vietwings',
    referenceCode: null,
    reviewStatus: 'verified',
    sourceFilename: 'IMG_8362.JPG',
    title: 'Outstanding Contribution Travel Agency',
  },
] as const

export const US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS =
  us055RehearsalCredentialSources.map(({ id }) => id)

export const US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_CHECKSUM =
  '5dd835e0887b5a5c7a723a89b64be4e218c8862381fe664fbc4d64907b495466'

const projectCredentialSource = (item: WingsSideCredentialItem) => ({
  alt: item.alt,
  description: item.description,
  file: item.file,
  id: item.id,
  issuedOn: item.issuedOn ?? null,
  issuer: item.issuer,
  kind: item.kind,
  label: item.label,
  mark: item.mark,
  recognitionYear: item.recognitionYear ?? null,
  recipient: item.recipient,
  referenceCode: item.referenceCode ?? null,
  reviewStatus: item.reviewStatus,
  sourceFilename: item.sourceFilename,
  title: item.title,
})

const credentialSourceChecksum = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

/**
 * Builds a local-only US-055 validation fixture from two historical Vietwings documents.
 *
 * This is not production publication approval. The single-language manifest metadata remains
 * verbatim across rehearsal locales: no unsupported localization, current partnership, or
 * WingsSide legal-identity claim is inferred.
 */
export const buildUs055RehearsalHomeCredentials = (
  manifest: WingsSideCredentialManifest,
) => {
  const byID = new Map(manifest.items.map((item) => [item.id, item]))
  const selected = US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS.map((id) => {
    const item = byID.get(id)
    if (!item) throw new Error(`US-055 credential fixture is missing source ${id}`)
    return item
  })
  const projected = selected.map(projectCredentialSource)
  if (JSON.stringify(projected) !== JSON.stringify(us055RehearsalCredentialSources)) {
    throw new Error('US-055 credential fixture approved source fields drifted')
  }
  if (
    credentialSourceChecksum(projected) !==
    US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_CHECKSUM
  ) {
    throw new Error('US-055 credential fixture approved source checksum drifted')
  }

  return selected.map((item) => ({
    body: item.description,
    kind: item.kind,
    mark: item.mark,
    micro: item.label,
    title: item.title,
  }))
}
