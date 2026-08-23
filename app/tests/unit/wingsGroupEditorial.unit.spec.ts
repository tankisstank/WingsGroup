import { describe, expect, it } from 'vitest'

import type { Post } from '@/payload-types'
import {
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialPostPath,
  isGovernedWingsGroupEditorialPost,
} from '@/utilities/wingsGroupEditorial'

type TestPost = Pick<Post, '_status' | 'content' | 'site' | 'slug' | 'title' | 'populatedAuthors'>

const post = (overrides: Partial<TestPost> = {}): TestPost => ({
  _status: 'published',
  content: {
    root: {
      children: [],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  },
  populatedAuthors: [{ id: 'author-1', name: 'Editorial team' }],
  site: 9,
  slug: 'governed-article',
  title: 'Governed article',
  ...overrides,
})

describe('WingsGroup v3 editorial eligibility', () => {
  it('uses the canonical Vietnamese archive path for article links', () => {
    expect(getWingsGroupEditorialPostPath()).toBe('/tin-tuc')
    expect(getWingsGroupEditorialPostPath('governed-article')).toBe('/tin-tuc/governed-article')
  })

  it('accepts only published, complete, same-site posts', () => {
    expect(isGovernedWingsGroupEditorialPost(post(), 9)).toBe(true)
    expect(isGovernedWingsGroupEditorialPost(post({ _status: 'draft' }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ site: 10 }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ content: null as never }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ title: '' }), 9)).toBe(false)
  })

  it('exposes author names only from the governed populated author projection', () => {
    expect(getGovernedEditorialAuthorNames(post())).toEqual(['Editorial team'])
    expect(getGovernedEditorialAuthorNames({ populatedAuthors: [] })).toEqual([])
    expect(
      getGovernedEditorialAuthorNames({ populatedAuthors: [{ id: '1', name: '  ' }] }),
    ).toEqual([])
  })
})
