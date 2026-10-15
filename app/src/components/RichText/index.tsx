import { MediaBlock } from '@/blocks/MediaBlock/Component'
import {
  DefaultNodeTypes,
  SerializedBlockNode,
  SerializedLinkNode,
  type DefaultTypedEditorState,
} from '@payloadcms/richtext-lexical'
import {
  JSXConvertersFunction,
  RichText as ConvertRichText,
} from '@payloadcms/richtext-lexical/react'

import { CodeBlock, CodeBlockProps } from '@/blocks/Code/Component'
import { ProtectedEmailLink } from '@/components/ProtectedEmailLink'

import type {
  BannerBlock as BannerBlockProps,
  CallToActionBlock as CTABlockProps,
  MediaBlock as MediaBlockProps,
} from '@/payload-types'
import { BannerBlock } from '@/blocks/Banner/Component'
import { CallToActionBlock } from '@/blocks/CallToAction/Component'
import { cn } from '@/utilities/ui'

type NodeTypes =
  | DefaultNodeTypes
  | SerializedBlockNode<CTABlockProps | MediaBlockProps | BannerBlockProps | CodeBlockProps>

const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
  const { value, relationTo } = linkNode.fields.doc!
  if (typeof value !== 'object') {
    throw new Error('Expected value to be an object')
  }
  const slug = value.slug
  return relationTo === 'posts' ? `/posts/${slug}` : `/${slug}`
}

const getSerializedText = (value: unknown): string => {
  if (!value || typeof value !== 'object') return ''
  if ('text' in value && typeof value.text === 'string') return value.text
  if ('children' in value && Array.isArray(value.children)) {
    return value.children.map(getSerializedText).join('')
  }
  return ''
}

const getMailtoAddress = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.toLowerCase().startsWith('mailto:')) return null

  const address = value.slice('mailto:'.length).split('?', 1)[0]
  try {
    return decodeURIComponent(address)
  } catch {
    return address
  }
}

const emailTextPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu

const protectEmailText = (text: string) => {
  const matches = [...text.matchAll(emailTextPattern)]
  if (!matches.length) return null

  const parts: React.ReactNode[] = []
  let cursor = 0

  for (const [index, match] of matches.entries()) {
    const email = match[0]
    const start = match.index ?? 0
    parts.push(text.slice(cursor, start))
    parts.push(<ProtectedEmailLink key={`${email}-${index}`} email={email} label={email} />)
    cursor = start + email.length
  }

  parts.push(text.slice(cursor))
  return <>{parts}</>
}

import { sanitizeHref } from './sanitizeHref'
export { sanitizeHref }

const renderLink = ({
  children,
  href,
  newTab,
}: {
  children: React.ReactNode
  href: string
  newTab?: boolean
}) => (
  <a
    href={sanitizeHref(href)}
    rel={newTab ? 'noopener noreferrer' : undefined}
    target={newTab ? '_blank' : undefined}
  >
    {children}
  </a>
)

const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  text: (args) => {
    const protectedText = protectEmailText(args.node.text)
    if (protectedText) return protectedText

    const defaultTextConverter = defaultConverters.text
    return typeof defaultTextConverter === 'function'
      ? defaultTextConverter(args)
      : defaultTextConverter
  },
  autolink: ({ node, nodesToJSX }) => {
    const email = getMailtoAddress(node.fields.url)
    if (email) {
      return (
        <ProtectedEmailLink
          email={email}
          label={getSerializedText(node.children).trim() || email}
        />
      )
    }

    return renderLink({
      children: nodesToJSX({ nodes: node.children }),
      href: node.fields.url ?? '',
      newTab: node.fields.newTab,
    })
  },
  link: ({ node, nodesToJSX }) => {
    const email = getMailtoAddress(node.fields.url)
    if (email) {
      return (
        <ProtectedEmailLink
          email={email}
          label={getSerializedText(node.children).trim() || email}
        />
      )
    }

    const href =
      node.fields.linkType === 'internal'
        ? internalDocToHref({ linkNode: node })
        : (node.fields.url ?? '')

    return renderLink({
      children: nodesToJSX({ nodes: node.children }),
      href,
      newTab: node.fields.newTab,
    })
  },
  blocks: {
    banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
    mediaBlock: ({ node }) => (
      <MediaBlock
        className="col-start-1 col-span-3"
        imgClassName="m-0"
        {...node.fields}
        captionClassName="mx-auto max-w-[48rem]"
        enableGutter={false}
        disableInnerContainer={true}
      />
    ),
    code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
    cta: ({ node }) => <CallToActionBlock {...node.fields} />,
  },
})

type Props = {
  data: DefaultTypedEditorState
  enableGutter?: boolean
  enableProse?: boolean
} & React.HTMLAttributes<HTMLDivElement>

export default function RichText(props: Props) {
  const { className, enableProse = true, enableGutter = true, ...rest } = props
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext',
        {
          container: enableGutter,
          'max-w-none': !enableGutter,
          'mx-auto prose md:prose-md dark:prose-invert': enableProse,
        },
        className,
      )}
      {...rest}
    />
  )
}
