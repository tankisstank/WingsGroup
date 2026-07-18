import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { Media } from '@/components/Media'

describe('Media', () => {
  it('does not render an empty image when no resource is available', () => {
    const { container } = render(<Media resource={null} />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).toBe('')
  })
})
