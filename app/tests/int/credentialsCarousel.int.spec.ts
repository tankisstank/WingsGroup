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

  it('supports governed media and one to twelve editable records', () => {
    const items = CredentialsCarousel.fields.find(
      (field) => 'name' in field && field.name === 'items',
    )
    const image =
      items && 'fields' in items
        ? items.fields.find((field) => 'name' in field && field.name === 'image')
        : undefined

    expect(items && 'minRows' in items ? items.minRows : undefined).toBe(1)
    expect(items && 'maxRows' in items ? items.maxRows : undefined).toBe(12)
    expect(image && 'type' in image ? image.type : undefined).toBe('upload')
    expect(image && 'relationTo' in image ? image.relationTo : undefined).toBe('media')
  })
})
