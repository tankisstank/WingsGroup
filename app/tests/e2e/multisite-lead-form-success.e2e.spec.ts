import { expect, test, type Locator, type Page } from '@playwright/test'

import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const e2eBaseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100').replace(/\/$/, '')
const inventory = loadMultisiteAuditInventory()
const sitesWithForms = inventory.sites.filter((site) => site.formRouteSample)

const getFieldMeta = async (locator: Locator) =>
  locator.evaluate((element) => {
    const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    return {
      name: field.getAttribute('name') || '',
      required: field.hasAttribute('required') || field.getAttribute('aria-required') === 'true',
      tagName: field.tagName.toLowerCase(),
      type: 'type' in field ? field.type : '',
      visible:
        !field.hasAttribute('hidden') &&
        field.getAttribute('aria-hidden') !== 'true' &&
        field.closest('[aria-hidden="true"]') === null,
    }
  })

const fillLeadForm = async (page: Page) => {
  const form = page
    .locator('form')
    .filter({ has: page.locator('button.site-form-submit') })
    .first()
  await expect(form).toBeVisible()

  const fields = form.locator('input, textarea, select')
  const count = await fields.count()

  for (let index = 0; index < count; index += 1) {
    const field = fields.nth(index)
    const meta = await getFieldMeta(field)

    if (!meta.visible || meta.name === '_website') continue

    if (meta.tagName === 'textarea') {
      await field.fill(
        'Tôi muốn được tư vấn thêm về thời gian, nhu cầu và hướng triển khai phù hợp.',
      )
      continue
    }

    if (meta.tagName === 'select') {
      const options = await field.locator('option').evaluateAll((nodes) =>
        nodes.map((node) => ({
          disabled: (node as HTMLOptionElement).disabled,
          value: (node as HTMLOptionElement).value,
        })),
      )
      const selected =
        options.find((option, optionIndex) => optionIndex > 0 && option.value && !option.disabled)
          ?.value || options.find((option) => option.value && !option.disabled)?.value

      if (selected) await field.selectOption(selected)
      continue
    }

    switch (meta.type) {
      case 'email':
        await field.fill('lead@example.com')
        break
      case 'tel':
        await field.fill('0903000222')
        break
      case 'number':
        await field.fill('4')
        break
      case 'date':
        await field.fill('2026-08-20')
        break
      case 'checkbox':
      case 'radio':
        if (meta.required) await field.check()
        break
      case 'hidden':
      case 'submit':
      case 'button':
        break
      default: {
        const normalizedName = meta.name.toLowerCase()
        if (normalizedName.includes('email')) {
          await field.fill('lead@example.com')
        } else if (normalizedName.includes('phone')) {
          await field.fill('0903000222')
        } else if (normalizedName.includes('group')) {
          await field.fill('4')
        } else if (normalizedName.includes('date')) {
          await field.fill('2026-08-20')
        } else {
          await field.fill('Nguyen Van A')
        }
        break
      }
    }
  }

  const requiredCheckboxes = form.locator('button[role="checkbox"][aria-required="true"]')
  const checkboxCount = await requiredCheckboxes.count()
  for (let index = 0; index < checkboxCount; index += 1) {
    const checkbox = requiredCheckboxes.nth(index)
    if ((await checkbox.getAttribute('aria-checked')) !== 'true') await checkbox.click()
  }

  const comboboxes = form.getByRole('combobox')
  const comboboxCount = await comboboxes.count()

  for (let index = 0; index < comboboxCount; index += 1) {
    const combobox = comboboxes.nth(index)
    if (!(await combobox.isVisible())) continue

    await combobox.click()
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
  }
}

test.describe('Multisite lead form accepted-path UX', () => {
  test('completes the visible accepted path across sites with public form routes', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    for (const site of sitesWithForms) {
      const routePath =
        site.defaultLocale === 'vi'
          ? `/${site.localAlias}${site.formRouteSample}`
          : `/${site.localAlias}/${site.defaultLocale}${site.formRouteSample}`

      await page.route('**/api/lead-submissions', async (route) => {
        await route.fulfill({
          body: JSON.stringify({ status: 'accepted' }),
          contentType: 'application/json',
          status: 202,
        })
      })

      await page.goto(`${e2eBaseURL}${routePath}`, {
        waitUntil: 'domcontentloaded',
      })

      const languageSwitcher = page.locator('.site-language-switcher').first()
      if (await languageSwitcher.count()) {
        await expect(languageSwitcher).toHaveAttribute('data-client-ready', 'true')
      }

      const initialURL = page.url()
      await fillLeadForm(page)

      const submitButton = page.locator('button.site-form-submit').first()
      await expect(submitButton).toBeVisible()
      await submitButton.click()

      const successState = page.locator('.site-form-state--success').first()
      await expect
        .poll(
          async () => ({
            successVisible: await successState.isVisible().catch(() => false),
            url: page.url(),
          }),
          {
            message: `${site.name} accepted path should either show success state or navigate`,
            timeout: 8000,
          },
        )
        .toEqual(
          expect.objectContaining({
            successVisible: expect.any(Boolean),
            url: expect.any(String),
          }),
        )

      const successVisible = await successState.isVisible().catch(() => false)
      const navigated = page.url() !== initialURL

      expect(
        successVisible || navigated,
        `${site.name} should show success state or redirect after accepted submission`,
      ).toBe(true)

      await expect(page.locator('.site-form-state--error')).toHaveCount(0)
      await page.unroute('**/api/lead-submissions')
    }
  })
})
