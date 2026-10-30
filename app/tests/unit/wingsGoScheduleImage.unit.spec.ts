import { describe, expect, it, vi } from 'vitest'
import { detectFailedImage } from '@/tours/wingsGoScheduleImage'

const fakeImage = (props: Partial<HTMLImageElement>) => props as HTMLImageElement

describe('detectFailedImage', () => {
  it('reports an image that settled without pixels before hydration', () => {
    const onFailed = vi.fn()
    detectFailedImage(onFailed)(
      fakeImage({ complete: true, currentSrc: 'https://wingsgo.vn/media/a.jpg', naturalWidth: 0 }),
    )
    expect(onFailed).toHaveBeenCalledTimes(1)
  })

  it('ignores loaded, still-loading, unmounted and jsdom images', () => {
    const onFailed = vi.fn()
    const check = detectFailedImage(onFailed)
    check(fakeImage({ complete: true, currentSrc: '/media/a.jpg', naturalWidth: 640 }))
    check(fakeImage({ complete: false, currentSrc: '/media/a.jpg', naturalWidth: 0 }))
    check(fakeImage({ complete: true, currentSrc: '', naturalWidth: 0 }))
    check(null)
    expect(onFailed).not.toHaveBeenCalled()
  })
})
