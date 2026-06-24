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
}

test.describe('Hero visual regression', () => {
  test.beforeAll(async () => {
    await seedPhase1LaunchSmoke()
  })

  for (const target of [
    { name: 'wingsside-planner-desktop', path: '/wingsside', width: 1440, height: 900 },
    {
      name: 'wingsside-planner-mobile',
      path: '/wingsside',
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
      await freezeHeroMotion(page)

      const pause = page.getByRole('button', { name: 'Pause carousel' })
      if (await pause.isVisible().catch(() => false)) {
        await pause.click()
      }

      await expect(page.locator('[data-hero-presentation]')).toHaveScreenshot(
        `${target.name}.png`,
        {
          animations: 'disabled',
          maxDiffPixelRatio: 0.04,
        },
      )
    })
  }
})
