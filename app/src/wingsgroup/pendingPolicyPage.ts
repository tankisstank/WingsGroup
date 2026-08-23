import type { Page } from '@/payload-types'

import {
  getWingsGroupRouteDefinition,
  WINGSGROUP_CONTENT_VALIDATION_MARKER,
  WINGSGROUP_LEGAL_IDENTITY,
  WINGSGROUP_SITE_CODE,
} from './corporateRoutes'

type PendingPolicyPageArgs = {
  path: string
  siteID: number
}

type PendingPolicyPage = Pick<
  Page,
  | '_status'
  | 'hero'
  | 'id'
  | 'layout'
  | 'meta'
  | 'pathname'
  | 'site'
  | 'slug'
  | 'title'
  | 'wingsGroupRoute'
> & {
  __wingsGroupPendingPolicy: true
  __wingsGroupSiteCode: typeof WINGSGROUP_SITE_CODE
}

type ContentBlock = Extract<Page['layout'][number], { blockType: 'content' }>
type RichText = NonNullable<NonNullable<ContentBlock['columns']>[number]['richText']>

const policyLabels: Record<string, string> = {
  '/chinh-sach-bao-mat': 'Chính sách bảo mật',
  '/dieu-khoan-su-dung': 'Điều khoản sử dụng',
  '/chinh-sach-thanh-toan': 'Chính sách thanh toán',
}

const lexical = (heading: string, paragraphs: string[]): RichText => ({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: heading,
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        tag: 'h1',
        type: 'heading',
        version: 1,
      },
      ...paragraphs.map((text) => ({
        children: [
          { detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        type: 'paragraph',
        version: 1,
      })),
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

/**
 * Safe public fallback for the three policy URLs while legal publication is
 * pending. It contains no policy terms and is never used for English routes.
 */
export const buildWingsGroupPendingPolicyPage = ({
  path,
  siteID,
}: PendingPolicyPageArgs): PendingPolicyPage | null => {
  const title = policyLabels[path]
  const definition = getWingsGroupRouteDefinition(path)

  if (!title || !definition?.policy) return null

  const layout: Page['layout'] = [
    {
      blockType: 'content',
      columns: [
        {
          richText: lexical('Chờ phê duyệt pháp lý để công bố', [
            'Trang này ghi nhận đường dẫn dự kiến nhưng chưa phải chính sách công khai.',
            `Pháp nhân quản lý dự kiến là ${WINGSGROUP_LEGAL_IDENTITY.legalEntityName}; các điều khoản, phạm vi, ngày hiệu lực và phiên bản chỉ được công bố sau khi có phê duyệt pháp lý phù hợp.`,
          ]),
          size: 'full',
        },
      ],
      presentation: 'reading',
    },
  ]

  return {
    _status: 'published' as const,
    __wingsGroupPendingPolicy: true,
    __wingsGroupSiteCode: WINGSGROUP_SITE_CODE,
    hero: { type: 'none', richText: null },
    id: 0,
    layout,
    meta: {
      breadcrumbLabel: title,
      description: 'Nội dung chính sách đang chờ phê duyệt pháp lý để công bố.',
      title,
    },
    pathname: path,
    site: siteID,
    slug: path.slice(1),
    title,
    wingsGroupRoute: {
      archetype: definition.archetype,
      contentApproval: { en: null, vi: WINGSGROUP_CONTENT_VALIDATION_MARKER },
      managedBy: 'wingsgroup-v3',
      policy: {
        approvalState: 'pending',
        legalEntity: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
        validationMarker: null,
      },
      publication: { en: 'hidden', vi: 'pending' },
    },
  }
}
