export type SeedRichText = {
  root: {
    type: 'root'
    children: Array<Record<string, unknown> & { type: string; version: number }>
    direction: 'ltr' | 'rtl' | null
    format: '' | 'center' | 'end' | 'justify' | 'left' | 'right' | 'start'
    indent: number
    version: number
  }
}

export type RichTextSection =
  | {
      kind: 'heading'
      tag?: 'h1' | 'h2' | 'h3' | 'h4'
      text: string
    }
  | {
      kind: 'paragraph'
      text: string
    }

export type LinkAppearance = 'default' | 'outline'

export type FeatureGridItem = {
  description: string
  eyebrow?: string
  imageID?: number | string
  label?: string
  meta?: string
  title: string
  url?: string
}

type FeatureGridVariant = 'default' | 'highlight' | 'minimal'
type FeatureGridPresentation =
  | 'accordion'
  | 'alternating'
  | 'before-after'
  | 'bento'
  | 'icon-grid'
  | 'icon-wall'
  | 'sticky-reveal'
  | 'tabs'

export const richTextFromSections = (sections: readonly RichTextSection[]): SeedRichText => ({
  root: {
    type: 'root',
    children: sections.map((section) => {
      if (section.kind === 'heading') {
        return {
          type: 'heading',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: section.text,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: section.tag || 'h2',
          version: 1,
        }
      }

      return {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: section.text,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        version: 1,
      }
    }),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  },
})

export const richText = (
  heading: string,
  paragraph: string,
  tag: 'h1' | 'h2' | 'h3' = 'h2',
): SeedRichText =>
  richTextFromSections([
    {
      kind: 'heading',
      tag,
      text: heading,
    },
    {
      kind: 'paragraph',
      text: paragraph,
    },
  ])

export const linkItem = (label: string, url: string, appearance: LinkAppearance = 'default') => ({
  link: {
    type: 'custom' as const,
    appearance,
    label,
    url,
  },
})

export const contentBlock = (
  columns: Array<{
    paragraph: string
    size: 'full' | 'half' | 'oneThird' | 'twoThirds'
    title: string
  }>,
) => ({
  blockType: 'content' as const,
  columns: columns.map((column) => ({
    size: column.size,
    richText: richText(column.title, column.paragraph, column.size === 'full' ? 'h2' : 'h3'),
  })),
})

export const featureGridBlock = (
  title: string,
  description: string,
  items: FeatureGridItem[],
  variant: FeatureGridVariant = 'default',
  eyebrow?: string,
  presentation: FeatureGridPresentation = 'icon-grid',
  defaultLinkLabel = 'Xem thêm',
) => ({
  blockType: 'featureGrid' as const,
  columns: '3',
  description,
  eyebrow,
  items: items.map((item) => ({
    description: item.description,
    eyebrow: item.eyebrow,
    enableLink: Boolean(item.url),
    image: item.imageID,
    meta: item.meta,
    title: item.title,
    ...(item.url
      ? {
          link: {
            type: 'custom' as const,
            label: item.label || defaultLinkLabel,
            url: item.url,
          },
        }
      : {}),
  })),
  presentation,
  title,
  variant,
})

export const infoStripBlock = (
  title: string,
  description: string,
  items: Array<{ description?: string; label: string; value?: string }>,
  eyebrow?: string,
) => ({
  blockType: 'infoStrip' as const,
  description,
  eyebrow,
  items,
  title,
})

export const statsBlock = (
  title: string,
  description: string,
  items: Array<{
    description?: string
    label: string
    progress?: number
    value: string
  }>,
  presentation:
    | 'card-grid'
    | 'editorial'
    | 'floating'
    | 'inline-bar'
    | 'logo-proof'
    | 'progress'
    | 'split-statement' = 'inline-bar',
  eyebrow?: string,
) => ({
  blockType: 'stats' as const,
  description,
  eyebrow,
  items,
  presentation,
  title,
})

export const testimonialBlock = (
  title: string,
  description: string,
  items: Array<{
    country?: string
    name: string
    noteDate?: string
    quote: string
    rating?: number
    role?: string
  }>,
  presentation:
    | 'carousel'
    | 'featured'
    | 'logo-cloud'
    | 'marquee'
    | 'masonry'
    | 'quote-grid'
    | 'social-wall'
    | 'video' = 'quote-grid',
  eyebrow?: string,
) => ({
  blockType: 'testimonial' as const,
  description,
  eyebrow,
  // Keep an omitted rating explicit so Payload schema defaults cannot turn an
  // unsourced planning note into a customer claim.
  items: items.map((item) => ({
    ...item,
    rating: item.rating ?? null,
  })),
  presentation,
  title,
})

export const ctaBlock = (title: string, paragraph: string, links: Array<ReturnType<typeof linkItem>>) => ({
  blockType: 'cta' as const,
  links,
  richText: richText(title, paragraph),
})

export const mediaBlock = (media: number | string) => ({
  blockType: 'mediaBlock' as const,
  media,
})

export const formBlock = (form: number | string, title: string, paragraph: string) => ({
  blockType: 'formBlock' as const,
  enableIntro: true,
  form,
  introContent: richText(title, paragraph),
})

export const archiveBlock = (
  categoryIDs: Array<number | string>,
  title: string,
  paragraph: string,
  limit = 3,
) => ({
  blockType: 'archive' as const,
  categories: categoryIDs,
  introContent: richText(title, paragraph),
  limit,
  populateBy: 'collection' as const,
  relationTo: 'posts' as const,
})
