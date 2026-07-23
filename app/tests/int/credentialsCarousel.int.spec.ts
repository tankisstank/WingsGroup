import { CredentialsCarousel } from '@/blocks/CredentialsCarousel/config'
import { Pages } from '@/collections/Pages'
import { describe, expect, it } from 'vitest'

describe('credentials carousel CMS contract', () => {
  it('registers the reusable block in the Pages layout', () => {
    const tabs = Pages.fields.find((field) => field.type === 'tabs')
    const layout =
      tabs && 'tabs' in tabs
        ? tabs.tabs
            .flatMap((tab) => ('fields' in tab ? tab.fields : []))
            .find((field) => 'name' in field && field.name === 'layout')
        : undefined
    const blocks = layout && 'blocks' in layout ? layout.blocks : []

    expect(blocks).toContain(CredentialsCarousel)
    expect(CredentialsCarousel.slug).toBe('credentialsCarousel')
  })

  it('supports governed media, review metadata and up to 36 editable records', () => {
    const items = CredentialsCarousel.fields.find(
      (field) => 'name' in field && field.name === 'items',
    )
    const image =
      items && 'fields' in items
        ? items.fields.find((field) => 'name' in field && field.name === 'image')
        : undefined
    const reviewStatus =
      items && 'fields' in items
        ? items.fields.find((field) => 'name' in field && field.name === 'reviewStatus')
        : undefined
    const metadataFields =
      items && 'fields' in items
        ? items.fields
            .filter((field) => 'name' in field)
            .map((field) => ('name' in field ? field.name : ''))
        : []

    expect(items && 'minRows' in items ? items.minRows : undefined).toBe(1)
    expect(items && 'maxRows' in items ? items.maxRows : undefined).toBe(36)
    expect(image && 'type' in image ? image.type : undefined).toBe('upload')
    expect(image && 'relationTo' in image ? image.relationTo : undefined).toBe('media')
    expect(reviewStatus && 'type' in reviewStatus ? reviewStatus.type : undefined).toBe('select')
    expect(metadataFields).toEqual(
      expect.arrayContaining([
        'issuer',
        'recipient',
        'recognitionYear',
        'issuedOn',
        'referenceCode',
        'sourceFilename',
      ]),
    )
  })
})
