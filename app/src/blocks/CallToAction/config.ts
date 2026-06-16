import type { Block } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { linkGroup } from '../../fields/linkGroup'
import { asSelectOptions, ctaPresentationDefinitions } from '@/blocks/presentations'

export const CallToAction: Block = {
  slug: 'cta',
  interfaceName: 'CallToActionBlock',
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'card',
      options: asSelectOptions(ctaPresentationDefinitions),
    },
    {
      name: 'eyebrow',
      label: 'Eyebrow',
      type: 'text',
    },
    {
      name: 'richText',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
      label: false,
    },
    linkGroup({
      appearances: ['default', 'outline'],
      overrides: {
        maxRows: 2,
      },
    }),
    {
      name: 'supportingQuote',
      label: 'Trích dẫn hỗ trợ',
      type: 'textarea',
      admin: {
        condition: (_, siblingData) => siblingData?.presentation === 'testimonial',
      },
    },
  ],
  labels: {
    plural: 'Calls to Action',
    singular: 'Call to Action',
  },
}
