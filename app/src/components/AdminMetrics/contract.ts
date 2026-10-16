export type RequestState<T> =
  | { state: 'loading' }
  | { state: 'ready'; value: T }
  | { state: 'empty' }
  | { state: 'no-access' }
  | { state: 'error' }
  | { state: 'unavailable' }

export type AdminMetricKey =
  | 'pages'
  | 'pageDrafts'
  | 'posts'
  | 'postDrafts'
  | 'tours'
  | 'tourDrafts'
  | 'media'
  | 'leads'

type AdminMetricCollection = 'form-submissions' | 'media' | 'pages' | 'posts' | 'tour-products'

type AdminMetricFilter = {
  _status: {
    equals: 'draft'
  }
}

export type AdminMetricDescriptor = {
  href: string
  key: AdminMetricKey
  label: string
  payloadCollection: AdminMetricCollection
  payloadFilter?: AdminMetricFilter
  restQuery: string
}

export const adminMetricDescriptors: readonly AdminMetricDescriptor[] = [
  {
    href: '/admin/collections/pages',
    key: 'pages',
    label: 'Trang',
    payloadCollection: 'pages',
    restQuery: '/api/pages?depth=0&limit=0',
  },
  {
    href: '/admin/collections/pages?where[_status][equals]=draft',
    key: 'pageDrafts',
    label: 'Trang nháp',
    payloadCollection: 'pages',
    payloadFilter: {
      _status: {
        equals: 'draft',
      },
    },
    restQuery: '/api/pages?depth=0&limit=0&where[_status][equals]=draft',
  },
  {
    href: '/admin/collections/posts',
    key: 'posts',
    label: 'Bài viết',
    payloadCollection: 'posts',
    restQuery: '/api/posts?depth=0&limit=0',
  },
  {
    href: '/admin/collections/posts?where[_status][equals]=draft',
    key: 'postDrafts',
    label: 'Bài viết nháp',
    payloadCollection: 'posts',
    payloadFilter: {
      _status: {
        equals: 'draft',
      },
    },
    restQuery: '/api/posts?depth=0&limit=0&where[_status][equals]=draft',
  },
  {
    href: '/admin/collections/tour-products',
    key: 'tours',
    label: 'Tour',
    payloadCollection: 'tour-products',
    restQuery: '/api/tour-products?depth=0&limit=0',
  },
  {
    href: '/admin/collections/tour-products?where[_status][equals]=draft',
    key: 'tourDrafts',
    label: 'Tour nháp',
    payloadCollection: 'tour-products',
    payloadFilter: {
      _status: {
        equals: 'draft',
      },
    },
    restQuery: '/api/tour-products?depth=0&limit=0&where[_status][equals]=draft',
  },
  {
    href: '/admin/collections/media',
    key: 'media',
    label: 'Media',
    payloadCollection: 'media',
    restQuery: '/api/media?depth=0&limit=0',
  },
  {
    href: '/admin/collections/form-submissions',
    key: 'leads',
    label: 'Tổng lead',
    payloadCollection: 'form-submissions',
    restQuery: '/api/form-submissions?depth=0&limit=0',
  },
]
