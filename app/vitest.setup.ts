// Any setup scripts you might need go here

import 'dotenv/config'
import { vi } from 'vitest'

vi.mock('@/utilities/localPreviewStore', () => ({
  isWingsGroupLocalPreviewStoreConfigured: () => false,
  getWingsGroupLocalPreviewStoreURL: () => '',
  startWingsGroupLocalPreviewStore: () => Promise.resolve({}),
}))

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: (query: string) => ({
    addEventListener: () => undefined,
    dispatchEvent: () => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: () => undefined,
  }),
  writable: true,
})

class TestIntersectionObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  configurable: true,
  value: TestIntersectionObserver,
  writable: true,
})
