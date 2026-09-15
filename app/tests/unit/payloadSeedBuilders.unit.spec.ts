import { describe, expect, it } from 'vitest'

import {
  featureGridBlock,
  richText,
  testimonialBlock,
} from '../../scripts/lib/payloadSeedBuilders'

describe('payload seed builders', () => {
  it('keeps the shared Lexical and feature-grid Payload shapes', () => {
    expect(richText('Heading', 'Paragraph')).toEqual({
      root: {
        type: 'root',
        children: [
          {
            type: 'heading',
            children: [
              {
                type: 'text',
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Heading',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            tag: 'h2',
            version: 1,
          },
          {
            type: 'paragraph',
            children: [
              {
                type: 'text',
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: 'Paragraph',
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            textFormat: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    })

    expect(
      featureGridBlock('Services', 'Choose a service', [
        { description: 'Tailor-made', title: 'Private travel', url: '/private' },
        { description: 'No link', title: 'Inspiration' },
      ]),
    ).toMatchObject({
      blockType: 'featureGrid',
      items: [
        {
          enableLink: true,
          link: { label: 'Xem thêm', type: 'custom', url: '/private' },
        },
        { enableLink: false },
      ],
    })
  })

  it('keeps omitted testimonial ratings explicit', () => {
    expect(
      testimonialBlock('Voices', 'Real feedback', [
        { name: 'Guest', quote: 'A clear and thoughtful journey.' },
      ]).items,
    ).toEqual([
      { name: 'Guest', quote: 'A clear and thoughtful journey.', rating: null },
    ])
  })
})
