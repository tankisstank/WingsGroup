import type { Block } from 'payload'

export const MediaBlock: Block = {
  slug: 'mediaBlock',
  interfaceName: 'MediaBlock',
  fields: [
    {
      name: 'presentation',
      label: 'Kiểu hiển thị',
      type: 'select',
      defaultValue: 'contained',
      options: [
        { label: 'Contained', value: 'contained' },
        { label: 'Full bleed', value: 'full-bleed' },
        { label: 'Editorial offset', value: 'editorial-offset' },
        { label: 'Framed', value: 'framed' },
      ],
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
  ],
}
