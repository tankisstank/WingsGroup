import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')
const cssPath = path.join(repoRoot, 'app/src/components/WingsSideHiFi/hifi-sections.css')
const evidenceDir = path.join(
  repoRoot,
  'docs/stories/epics/E08-wingsside-inbound-upgrade/US-052-wingsside-proof-archive/evidence',
)
const breakpoints = [360, 390, 430, 600, 768, 820, 1024, 1366, 1440, 1920]

const certificateSvg = (index: number) =>
  `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <rect width="900" height="1200" fill="#fffdfa"/>
  <rect x="80" y="80" width="740" height="1040" fill="none" stroke="#005090" stroke-width="10"/>
  <text x="450" y="250" text-anchor="middle" font-family="Arial" font-size="58" font-weight="700" fill="#10233f">WingSide Proof</text>
  <text x="450" y="410" text-anchor="middle" font-family="Arial" font-size="44" fill="#10233f">Verified Record ${index}</text>
  <text x="450" y="530" text-anchor="middle" font-family="Arial" font-size="34" fill="#627086">Original document image</text>
  <circle cx="450" cy="760" r="120" fill="none" stroke="#b87a14" stroke-width="16"/>
</svg>`)}`

test.describe('WingSide Proof Archive fixed-frame evidence', () => {
  test('keeps exact stage height for every record and breakpoint', async ({ page }) => {
    const css = await fs.readFile(cssPath, 'utf8')
    await fs.mkdir(evidenceDir, { recursive: true })
    const records = Array.from({ length: 21 }, (_, index) => ({
      category: index % 3 === 0 ? 'appointment' : 'award',
      image: certificateSvg(index + 1),
      issuer: `Issuer ${index + 1}`,
      title: `Verified Record ${index + 1}`,
    }))

    await page.setContent(`
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            html, body { margin: 0; overflow-x: hidden; font-family: Arial, sans-serif; }
            body { --site-background: #f7f9fb; --site-surface: #fff; --site-foreground: #10233f; --site-brand: #005090; --site-border: #d9e2ec; --site-muted: #627086; --site-gold: #b87a14; --site-cta-fg: #111827; }
            ${css}
          </style>
        </head>
        <body data-site-code="wing-side">
          <section class="ws-hifi-creds ws-hifi-creds--full-bleed" data-od-id="home-creds">
            <div class="ws-hifi-creds__inner">
              <header class="ws-hifi-creds__head">
                <div>
                  <p class="ws-hifi-creds__kicker">Credentials and awards</p>
                  <h2 class="ws-hifi-creds__title">Proof you can inspect</h2>
                  <p class="ws-hifi-creds__lede">A documented record from original certificates.</p>
                </div>
                <a class="ws-hifi-creds__cta" href="/plan-your-trip">Plan a private journey</a>
              </header>
              <div class="ws-hifi-creds__archive-bar">
                <div class="ws-hifi-creds__filters">
                  <button class="ws-hifi-creds__filter" aria-pressed="true">All proof</button>
                  <button class="ws-hifi-creds__filter" aria-pressed="false">Airline appointments</button>
                  <button class="ws-hifi-creds__filter" aria-pressed="false">Performance awards</button>
                </div>
                <output class="ws-hifi-creds__count">Verified archive · 21 records</output>
              </div>
              <div class="ws-hifi-creds__proof-stage" data-testid="stage">
                <div class="ws-hifi-creds__document-pane">
                  <button class="ws-hifi-creds__document-button" type="button">
                    <span class="ws-hifi-creds__document-media">
                      <img class="ws-hifi-creds__document-image" id="active-image" alt="" />
                    </span>
                  </button>
                  <span class="ws-hifi-creds__zoom-note">Inspect original</span>
                </div>
                <article class="ws-hifi-creds__copy-pane">
                  <p class="ws-hifi-creds__record-type" id="record-type"></p>
                  <h3 id="record-title"></h3>
                  <p class="ws-hifi-creds__summary">Published from original certificate media through the CMS media pipeline.</p>
                  <dl class="ws-hifi-creds__meta"><div><dt>Issued by</dt><dd id="record-issuer"></dd></div><div><dt>Proof type</dt><dd id="record-kind"></dd></div></dl>
                  <div class="ws-hifi-creds__actions"><span class="ws-hifi-creds__counter" id="counter"></span><div class="ws-hifi-creds__nav-pair"><button class="ws-hifi-creds__nav" type="button">Prev</button><button class="ws-hifi-creds__nav" type="button">Next</button></div></div>
                </article>
              </div>
              <div class="ws-hifi-creds__rail" id="rail"></div>
            </div>
            <dialog class="ws-hifi-creds__dialog" id="dialog"><div class="ws-hifi-creds__dialog-inner"><span class="ws-hifi-creds__dialog-media"><img class="ws-hifi-creds__dialog-image" id="dialog-image" alt="" /></span><button class="ws-hifi-creds__dialog-close">Close</button></div></dialog>
          </section>
          <script>
            const records = ${JSON.stringify(records)};
            let active = 0;
            const img = document.getElementById('active-image');
            const dialog = document.getElementById('dialog');
            function render(index) {
              active = index;
              const record = records[index];
              img.src = record.image;
              img.alt = record.title;
              document.getElementById('dialog-image').src = record.image;
              document.getElementById('record-title').textContent = record.title;
              document.getElementById('record-issuer').textContent = record.issuer;
              document.getElementById('record-kind').textContent = record.category;
              document.getElementById('record-type').textContent = record.issuer + ' · ' + record.category;
              document.getElementById('counter').textContent = String(index + 1).padStart(2, '0') + ' / 21';
              document.querySelectorAll('.ws-hifi-creds__thumb').forEach((button, buttonIndex) => button.setAttribute('aria-current', String(buttonIndex === active)));
            }
            document.getElementById('rail').innerHTML = records.map((record, index) => '<button class="ws-hifi-creds__thumb" type="button" data-index="' + index + '"><span class="ws-hifi-creds__thumb-media"><img class="ws-hifi-creds__thumb-image" src="' + record.image + '" alt=""></span><span class="ws-hifi-creds__thumb-copy"><strong>' + record.issuer + '</strong><span>' + record.category + '</span></span></button>').join('');
            document.getElementById('rail').addEventListener('click', event => {
              const button = event.target.closest('.ws-hifi-creds__thumb');
              if (button) render(Number(button.dataset.index));
            });
            document.querySelector('.ws-hifi-creds__document-button').addEventListener('click', () => dialog.showModal());
            document.querySelector('.ws-hifi-creds__dialog-close').addEventListener('click', () => dialog.close());
            render(0);
          </script>
        </body>
      </html>
    `)

    const results: Array<{
      breakpoint: number
      expected: number
      record: number
      heightAfterImage: number
      heightImmediate: number
      objectFit: string
      overflowX: number
    }> = []

    for (const width of breakpoints) {
      const expected = width <= 760 ? 990 : 570
      await page.setViewportSize({ height: width <= 760 ? 844 : 1000, width })
      for (let index = 0; index < 21; index += 1) {
        await page.locator('.ws-hifi-creds__thumb').nth(index).click()
        const immediate = await page.locator('[data-testid="stage"]').evaluate((element) => {
          const stage = element as HTMLElement
          const image = document.querySelector('.ws-hifi-creds__document-image') as HTMLElement
          return {
            height: stage.getBoundingClientRect().height,
            objectFit: window.getComputedStyle(image).objectFit,
            overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          }
        })
        await page.locator('.ws-hifi-creds__document-image').evaluate((image: HTMLImageElement) => {
          if (image.complete) return Promise.resolve()
          return new Promise((resolve) => image.addEventListener('load', resolve, { once: true }))
        })
        const heightAfterImage = await page
          .locator('[data-testid="stage"]')
          .evaluate((element) => element.getBoundingClientRect().height)

        expect(immediate.height).toBe(expected)
        expect(heightAfterImage).toBe(expected)
        expect(immediate.objectFit).toBe('contain')
        expect(immediate.overflowX).toBe(0)
        results.push({
          breakpoint: width,
          expected,
          heightAfterImage,
          heightImmediate: immediate.height,
          objectFit: immediate.objectFit,
          overflowX: immediate.overflowX,
          record: index + 1,
        })
      }
    }

    await fs.writeFile(
      path.join(evidenceDir, 'us052-bounding-box-results.json'),
      `${JSON.stringify(results, null, 2)}\n`,
    )

    await page.setViewportSize({ height: 1000, width: 1440 })
    await page.screenshot({ fullPage: true, path: path.join(evidenceDir, 'us052-desktop-1440.png') })
    await page.setViewportSize({ height: 844, width: 390 })
    await page.screenshot({ fullPage: true, path: path.join(evidenceDir, 'us052-mobile-390.png') })
    await page.locator('.ws-hifi-creds__document-button').click()
    await page.screenshot({ fullPage: true, path: path.join(evidenceDir, 'us052-dialog-390.png') })
  })
})
