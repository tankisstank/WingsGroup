import fs from 'node:fs/promises'
import path from 'node:path'

export const WINGSGROUP_V3_FIDELITY_CONTRACT_PATH = path.resolve(
  import.meta.dirname,
  '../../../docs/product/wingsgroup-v3-fidelity-contract.json',
)

export const WINGSGROUP_V3_FIDELITY_SECTION_ORDER = [
  'hero',
  'ecosystem',
  'trust',
  'proof',
  'editorial',
  'contact',
] as const

export const WINGSGROUP_V3_VIEWPORT_MATRIX = [
  [375, 812],
  [390, 844],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
] as const

export const WINGSGROUP_V3_DIALOG_CHANNELS = ['zalo', 'whatsapp', 'messenger'] as const

type RecordValue = Record<string, unknown>

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const exactStringArray = (value: unknown, expected: readonly string[]): boolean =>
  array(value).length === expected.length &&
  array(value).every((item, index) => item === expected[index])

export const assessWingsGroupV3FidelityContract = (
  value: unknown,
): { errors: string[]; valid: boolean } => {
  const errors: string[] = []
  if (!isRecord(value)) return { errors: ['Contract must be an object.'], valid: false }
  if (value.version !== 1) errors.push('Contract version must be 1.')
  if (value.release !== 'wingsgroup-v3') errors.push('Contract release must be wingsgroup-v3.')
  if (value.siteCode !== 'wings-group') errors.push('Contract siteCode must be wings-group.')
  if (value.locale !== 'vi') errors.push('Contract locale must be vi.')
  if (!exactStringArray(value.sectionOrder, WINGSGROUP_V3_FIDELITY_SECTION_ORDER)) {
    errors.push('Contract sectionOrder must match the final six-section runtime VI order.')
  }
  if (!exactStringArray(value.runtimeSectionOrder, WINGSGROUP_V3_FIDELITY_SECTION_ORDER)) {
    errors.push('Contract runtimeSectionOrder must match the final six-section runtime VI order.')
  }

  const sections = array(value.sections).filter(isRecord)
  if (sections.length !== WINGSGROUP_V3_FIDELITY_SECTION_ORDER.length) {
    errors.push('Contract must define exactly six public runtime sections.')
  }
  if (sections.some((section) => section.key === 'service-router')) {
    errors.push('Contract must not define a standalone service-router in the public runtime.')
  }
  if (
    !exactStringArray(
      sections.map((section) => section.key),
      WINGSGROUP_V3_FIDELITY_SECTION_ORDER,
    )
  ) {
    errors.push('Contract sections must match sectionOrder exactly.')
  }
  for (const section of sections) {
    if (!text(section.selector))
      errors.push(`Section ${text(section.key) || '<unknown>'} needs a selector.`)
    if (!text(section.heading))
      errors.push(`Section ${text(section.key) || '<unknown>'} needs a heading.`)
  }

  const header = isRecord(value.header) ? value.header : null
  if (!header || !text(header.selector) || !text(header.brand)) {
    errors.push('Contract header needs selector and brand.')
  }
  if (
    !header ||
    array(header.primaryNavigation).length < 5 ||
    array(header.mobileNavigation).length < 6
  ) {
    errors.push('Contract header needs desktop and mobile navigation.')
  }

  const primaryCta = isRecord(header?.primaryCta) ? header.primaryCta : null
  if (
    !primaryCta ||
    primaryCta.label !== 'Trao đổi nhu cầu' ||
    primaryCta.target !== '[data-od-id=consultation-dialog]' ||
    primaryCta.kind !== 'dialog' ||
    primaryCta.flow !== 'specialist-consultation-dialog'
  ) {
    errors.push('Header primary CTA must use the specialist consultation dialog flow.')
  }

  const hero = sections.find((section) => section.key === 'hero')
  const heroDialogCta = array(hero?.ctas)
    .filter(isRecord)
    .find((cta) => cta.kind === 'dialog')
  if (
    !heroDialogCta ||
    heroDialogCta.label !== 'Trao đổi với chuyên viên' ||
    heroDialogCta.target !== '[data-od-id=consultation-dialog]' ||
    heroDialogCta.flow !== 'specialist-consultation-dialog'
  ) {
    errors.push('Hero secondary CTA must use the specialist consultation dialog flow.')
  }

  const dialog = isRecord(value.consultationDialog) ? value.consultationDialog : null
  if (!dialog || !text(dialog.selector) || !text(dialog.triggerSelector) || !text(dialog.title)) {
    errors.push('Contract needs a specialist consultation dialog.')
  }
  if (
    !dialog ||
    dialog.flowKey !== 'specialist-consultation-dialog' ||
    dialog.triggerLabel !== 'Trao đổi với chuyên viên' ||
    dialog.triggerFlow !== 'specialist-consultation-dialog'
  ) {
    errors.push('Floating consultation trigger must use the specialist consultation dialog flow.')
  }
  const channels = array(dialog?.channels)
    .filter(isRecord)
    .map((channel) => channel.key)
  if (!exactStringArray(channels, WINGSGROUP_V3_DIALOG_CHANNELS)) {
    errors.push('Consultation dialog must define Zalo, WhatsApp, and Messenger in order.')
  }

  const viewports = array(value.viewportMatrix).filter(isRecord)
  const actualViewports = viewports.map((viewport) => [viewport.width, viewport.height])
  if (
    viewports.length !== WINGSGROUP_V3_VIEWPORT_MATRIX.length ||
    actualViewports.some(
      (viewport, index) =>
        viewport[0] !== WINGSGROUP_V3_VIEWPORT_MATRIX[index][0] ||
        viewport[1] !== WINGSGROUP_V3_VIEWPORT_MATRIX[index][1],
    )
  ) {
    errors.push('Contract viewportMatrix must match the six governed screenshot viewports.')
  }

  const mediaExpectations = isRecord(value.mediaExpectations) ? value.mediaExpectations : null
  if (mediaExpectations?.governedAssetCount !== 13) {
    errors.push('Contract must govern exactly 13 development assets.')
  }
  if (mediaExpectations?.publicationState !== 'pending-production') {
    errors.push('Contract media publicationState must remain pending-production.')
  }

  return { errors, valid: errors.length === 0 }
}

export const assertWingsGroupV3FidelityContract = (value: unknown): void => {
  const assessment = assessWingsGroupV3FidelityContract(value)
  if (!assessment.valid) throw new Error(assessment.errors.join(' '))
}

export const loadWingsGroupV3FidelityContract = async (
  contractPath = WINGSGROUP_V3_FIDELITY_CONTRACT_PATH,
): Promise<RecordValue> => {
  const contract = JSON.parse(await fs.readFile(contractPath, 'utf8')) as unknown
  assertWingsGroupV3FidelityContract(contract)
  return contract as RecordValue
}
