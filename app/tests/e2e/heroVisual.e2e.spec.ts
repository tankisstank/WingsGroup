import { expect, test } from '@playwright/test'

import { e2eBaseURL } from '../helpers/baseURL'
import { heroPresentationFixturePaths, seedPhase1LaunchSmoke } from '../helpers/seedPhase1Launch'

const freezeHeroMotion = async (page: import('@playwright/test').Page) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        scroll-behavior: auto !important;
      }
    `,
  })

  await page.locator('video').evaluateAll((videos) => {
    for (const video of videos) {
      const media = video as HTMLVideoElement
      media.pause()
      try {
        media.currentTime = 0
      } catch {
        // A poster-only or not-yet-ready video is already deterministic.
      }
    }
  })
}

test.describe('Hero visual regression', () => {
  test.beforeAll(async () => {
    if (process.env.PLAYWRIGHT_SKIP_PHASE1_SEED === 'true') return

    await seedPhase1LaunchSmoke({ destroyPayloadAfterSeed: false })
  })

  for (const target of [
    { name: 'wingsside-planner-desktop', path: '/wing-side', width: 1440, height: 900 },
    {
      name: 'wingsside-planner-mobile',
      path: '/wing-side',
      width: 390,
      height: 844,
    },
    {
      name: 'carousel-desktop',
      path: heroPresentationFixturePaths['cinematic-carousel'],
      width: 1440,
      height: 900,
    },
    {
      name: 'video-desktop',
      path: heroPresentationFixturePaths['video-background'],
      width: 1440,
      height: 900,
    },
  ]) {
    test(`matches ${target.name}`, async ({ page }) => {
      await page.setViewportSize({ height: target.height, width: target.width })
      await page.goto(`${e2eBaseURL}${target.path}`)
      await expect(page.locator('html')).toHaveAttribute('data-theme', /^(?:dark|light)$/)
      if (target.name === 'video-desktop') {
        const posterImage = page.locator('.hero-presentation__video-poster img')
        await expect(posterImage).toBeVisible()
        await expect
          .poll(() =>
            posterImage.evaluate((image) => {
              const poster = image as HTMLImageElement
              return poster.complete && poster.naturalWidth > 0
            }),
          )
          .toBe(true)
        await expect(
          page.getByRole('heading', {
            name: 'WingsGroup - hệ sinh thái du lịch nhiều line business dưới một lớp tin cậy chung',
          }),
        ).toBeVisible()
        await expect(page.getByRole('link', { name: 'Liên hệ tư vấn' })).toBeVisible()
        await page.addStyleTag({
          content: '.hero-presentation__video-media { visibility: hidden !important; }',
        })
      }
      await freezeHeroMotion(page)

      const firstSlide = page.getByRole('button', { name: 'Go to slide 1' })
      if (await firstSlide.isVisible().catch(() => false)) {
        await expect(page.locator('[aria-roledescription="carousel"][data-client-ready]')).toHaveAttribute(
          'data-client-ready',
          'true',
        )
        // Selecting a slide also pauses autoplay and gives every run the same
        // visual state regardless of seed/server timing.
        await firstSlide.focus()
        await firstSlide.press('Enter')
        await expect(page.getByRole('button', { name: 'Play carousel' })).toHaveAttribute(
          'aria-label',
          'Play carousel',
        )
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      }

      const visualSurface =
        target.name === 'video-desktop'
          ? page.locator('.hero-presentation--video')
          : page.locator('[data-hero-presentation]')

      await expect(visualSurface).toHaveScreenshot(
        `${target.name}.png`,
        {
          animations: 'disabled',
          maxDiffPixelRatio: 0.04,
        },
      )
    })
  }
})
