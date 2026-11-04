import { describe, expect, it } from 'vitest'
import { richText } from '../../scripts/lib/payloadSeedBuilders'
import {
  NEW_CAMPAIGN_H1,
  OLD_CAMPAIGN_H1,
  transformCampaignHero,
} from '../../scripts/updateWingsGoCampaignHeading'

const hero = (heading = OLD_CAMPAIGN_H1) => ({
  type: 'mediumImpact',
  media: 123,
  links: [{ link: { label: 'Tư vấn', url: '/lien-he' } }],
  richText: richText(heading, 'Nội dung không thay đổi', 'h1'),
})

describe('Guarded campaign H1 content transform', () => {
  it('changes exactly the approved H1 and preserves the remaining hero and H2', () => {
    const before = hero()
    const secondary = richText('H2 giữ nguyên ' + OLD_CAMPAIGN_H1, '', 'h2').root.children[0]
    before.richText.root.children.push(secondary)
    const original = structuredClone(before)
    const result = transformCampaignHero(before)
    expect(result.changed).toBe(true)
    const expected = structuredClone(before)
    expected.richText.root.children[0].children = [{ ...(expected.richText.root.children[0].children as object[])[0], text: NEW_CAMPAIGN_H1 }]
    expect(result.updatedHero).toEqual(expected)
    expect(before).toEqual(original)
  })

  it('returns noop only for the exact approved current H1', () => {
    expect(transformCampaignHero(hero(NEW_CAMPAIGN_H1))).toMatchObject({ changed: false })
  })

  it.each(['Unreviewed heading', 'Prefix ' + OLD_CAMPAIGN_H1, OLD_CAMPAIGN_H1 + ' suffix'])('rejects unapproved text: %s', heading => {
    expect(() => transformCampaignHero(hero(heading))).toThrow(/H1|heading|unexpected/i)
  })

  it('rejects missing or multiple H1 headings', () => {
    expect(() => transformCampaignHero({ richText: richText('Only H2', 'Text') })).toThrow(/H1|heading/i)
    const before = hero()
    before.richText.root.children.push(structuredClone(before.richText.root.children[0]))
    expect(() => transformCampaignHero(before)).toThrow(/H1|heading/i)
  })

  it('stops on split formatting rather than changing or dropping editor nodes', () => {
    const before = hero()
    before.richText.root.children[0].children = [
      { type: 'text', text: 'Tour theo mùa: ', version: 1, format: 0 },
      { type: 'text', text: OLD_CAMPAIGN_H1.slice('Tour theo mùa: '.length), version: 1, format: 1 },
    ]
    const original = structuredClone(before)
    expect(() => transformCampaignHero(before)).toThrow(/split|formatting/i)
    expect(before).toEqual(original)
  })
})
