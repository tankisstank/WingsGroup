import crypto from 'node:crypto'

export const TARGET_SITE_CODE = 'wings-go'
export const OLD_PRIMARY_HOTLINE_NORMALIZED = '0912910101'
export const NEW_PRIMARY_HOTLINE_NORMALIZED = '0948786775'
export const NEW_PRIMARY_HOTLINE_DISPLAY = '0948 786 775'
export const NEW_PRIMARY_HOTLINE_HREF = 'tel:0948786775'

export const PRESERVED_SECONDARY_HOTLINES: readonly string[] = [
  '0915250101',
  '0915260101',
] as const

/**
 * Regex matching Vietnamese formats of the old primary hotline 0912910101.
 * Uses negative lookbehind (?<![\d+]) and lookahead (?!\d) to ensure boundary safety
 * and avoid matching embedded numbers.
 */
export const OLD_HOTLINE_PATTERN = /(?<![\d+])(?:\(?\+84\)?[\s.-]*|0)912[\s.-]*910[\s.-]*101(?!\d)/g

export function normalizePhoneDigits(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null
  let clean = phone.trim()
  if (clean.toLowerCase().startsWith('tel:')) {
    clean = clean.slice(4)
  }
  clean = clean.replace(/[\s.\-()]/g, '')
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3)
  } else if (clean.startsWith('84') && clean.length === 11) {
    clean = '0' + clean.slice(2)
  }
  return /^0\d{9}$/.test(clean) ? clean : null
}

export function isOldPrimaryHotline(phone: string | null | undefined): boolean {
  return normalizePhoneDigits(phone) === OLD_PRIMARY_HOTLINE_NORMALIZED
}

export function isPreservedSecondaryHotline(phone: string | null | undefined): boolean {
  const normalized = normalizePhoneDigits(phone)
  return normalized !== null && PRESERVED_SECONDARY_HOTLINES.includes(normalized)
}

export interface CtaChangeDetail {
  field: string
  oldValue: unknown
  newValue: unknown
}

export interface TransformCtaResult {
  updatedBlock: Record<string, unknown>
  changed: boolean
  changes: CtaChangeDetail[]
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']'
  }
  const obj = value as Record<string, unknown>
  const sortedKeys = Object.keys(obj).sort()
  const entries = sortedKeys.map((key) => `${JSON.stringify(key)}:${canonicalJson(obj[key])}`)
  return '{' + entries.join(',') + '}'
}

export function hashContent(data: unknown): string {
  const json = canonicalJson(data)
  return crypto.createHash('sha256').update(json).digest('hex')
}

/**
 * Immutably transforms a Lexical AST node to replace old primary hotline
 * occurrences in text and link URLs.
 */
export function transformLexicalNode(node: unknown): { node: unknown; changed: boolean; changes: CtaChangeDetail[] } {
  if (!node || typeof node !== 'object') {
    return { node, changed: false, changes: [] }
  }

  const raw = node as Record<string, unknown>
  let changed = false
  const changes: CtaChangeDetail[] = []
  let updated = { ...raw }

  // 1. Transform text node
  if (typeof raw.text === 'string' && raw.text.length > 0) {
    OLD_HOTLINE_PATTERN.lastIndex = 0
    if (OLD_HOTLINE_PATTERN.test(raw.text)) {
      OLD_HOTLINE_PATTERN.lastIndex = 0
      const newText = raw.text.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)
      if (newText !== raw.text) {
        changes.push({ field: 'text', oldValue: raw.text, newValue: newText })
        updated.text = newText
        changed = true
      }
    }
  }

  // 2. Transform link node (Lexical link element)
  if (raw.type === 'link' || raw.type === 'autolink') {
    const fields = (raw.fields || {}) as Record<string, unknown>
    if (typeof fields.url === 'string' && isOldPrimaryHotline(fields.url)) {
      changes.push({ field: 'link.url', oldValue: fields.url, newValue: NEW_PRIMARY_HOTLINE_HREF })
      updated = {
        ...updated,
        fields: {
          ...fields,
          url: NEW_PRIMARY_HOTLINE_HREF,
        },
      }
      changed = true
    }
  }

  // 3. Transform children recursively
  if (Array.isArray(raw.children)) {
    let anyChildChanged = false
    const newChildren = raw.children.map((child) => {
      const result = transformLexicalNode(child)
      if (result.changed) {
        anyChildChanged = true
        changes.push(...result.changes)
      }
      return result.node
    })
    if (anyChildChanged) {
      updated.children = newChildren
      changed = true
    }
  }

  return { node: changed ? updated : raw, changed, changes }
}

/**
 * Transforms a CallToAction block:
 * - Updates richText (headings, paragraphs, text nodes, inline links)
 * - Updates links array: tel: URLs and labels
 * - Updates eyebrow and supportingQuote if present
 * - Preserves secondary hotlines (0915250101, 0915260101), valid custom numbers, and form URLs
 */
export function transformCtaBlock(block: Record<string, unknown>): TransformCtaResult {
  if (block.blockType !== 'cta') {
    return { updatedBlock: block, changed: false, changes: [] }
  }

  let changed = false
  const changes: CtaChangeDetail[] = []
  const updatedBlock: Record<string, unknown> = { ...block }

  // 1. Transform richText
  if (block.richText && typeof block.richText === 'object') {
    const rt = block.richText as Record<string, unknown>
    if (rt.root && typeof rt.root === 'object') {
      const rootResult = transformLexicalNode(rt.root)
      if (rootResult.changed) {
        updatedBlock.richText = { ...rt, root: rootResult.node }
        changed = true
        changes.push(...rootResult.changes)
      }
    }
  }

  // 2. Transform links
  if (Array.isArray(block.links)) {
    let linksChanged = false
    const newLinks = block.links.map((item, index) => {
      if (!item || typeof item !== 'object') return item
      const itemRecord = item as Record<string, unknown>
      const link = (itemRecord.link || {}) as Record<string, unknown>
      let linkModified = false
      const updatedLink = { ...link }

      // Check url
      if (typeof link.url === 'string') {
        if (isOldPrimaryHotline(link.url)) {
          changes.push({
            field: `links[${index}].url`,
            oldValue: link.url,
            newValue: NEW_PRIMARY_HOTLINE_HREF,
          })
          updatedLink.url = NEW_PRIMARY_HOTLINE_HREF
          linkModified = true
        }
      }

      // Check label
      if (typeof link.label === 'string') {
        OLD_HOTLINE_PATTERN.lastIndex = 0
        if (OLD_HOTLINE_PATTERN.test(link.label)) {
          OLD_HOTLINE_PATTERN.lastIndex = 0
          const newLabel = link.label.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)
          if (newLabel !== link.label) {
            changes.push({
              field: `links[${index}].label`,
              oldValue: link.label,
              newValue: newLabel,
            })
            updatedLink.label = newLabel
            linkModified = true
          }
        }
      }

      if (linkModified) {
        linksChanged = true
        return { ...itemRecord, link: updatedLink }
      }
      return item
    })

    if (linksChanged) {
      updatedBlock.links = newLinks
      changed = true
    }
  }

  // 3. Transform eyebrow
  if (typeof block.eyebrow === 'string') {
    OLD_HOTLINE_PATTERN.lastIndex = 0
    if (OLD_HOTLINE_PATTERN.test(block.eyebrow)) {
      OLD_HOTLINE_PATTERN.lastIndex = 0
      const newEyebrow = block.eyebrow.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)
      if (newEyebrow !== block.eyebrow) {
        changes.push({ field: 'eyebrow', oldValue: block.eyebrow, newValue: newEyebrow })
        updatedBlock.eyebrow = newEyebrow
        changed = true
      }
    }
  }

  // 4. Transform supportingQuote
  if (typeof block.supportingQuote === 'string') {
    OLD_HOTLINE_PATTERN.lastIndex = 0
    if (OLD_HOTLINE_PATTERN.test(block.supportingQuote)) {
      OLD_HOTLINE_PATTERN.lastIndex = 0
      const newQuote = block.supportingQuote.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)
      if (newQuote !== block.supportingQuote) {
        changes.push({ field: 'supportingQuote', oldValue: block.supportingQuote, newValue: newQuote })
        updatedBlock.supportingQuote = newQuote
        changed = true
      }
    }
  }

  return { updatedBlock: changed ? updatedBlock : block, changed, changes }
}

/**
 * Validates that all changes in the delta are strictly allowed hotline updates.
 * Throws if any unexpected field or value change is present.
 */
export function validateAllowedDelta(changes: CtaChangeDetail[]): void {
  for (const change of changes) {
    if (change.field === 'link.url' || change.field.endsWith('.url')) {
      if (!isOldPrimaryHotline(change.oldValue as string) || change.newValue !== NEW_PRIMARY_HOTLINE_HREF) {
        throw new Error(`Forbidden URL delta: '${change.oldValue}' -> '${change.newValue}'`)
      }
    } else {
      // Text or label field
      const oldStr = String(change.oldValue || '')
      const newStr = String(change.newValue || '')
      OLD_HOTLINE_PATTERN.lastIndex = 0
      if (!OLD_HOTLINE_PATTERN.test(oldStr)) {
        throw new Error(`Forbidden text delta: old value does not contain old hotline: '${oldStr}'`)
      }
      OLD_HOTLINE_PATTERN.lastIndex = 0
      const expected = oldStr.replace(OLD_HOTLINE_PATTERN, NEW_PRIMARY_HOTLINE_DISPLAY)
      if (newStr !== expected) {
        throw new Error(`Forbidden text delta: expected '${expected}', got '${newStr}'`)
      }
    }
  }
}
