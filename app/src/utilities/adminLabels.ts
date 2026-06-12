import type { StaticLabel } from 'payload'

export const adminLabel = (vi: string, en: string): StaticLabel => ({
  en,
  vi,
})

export const adminGroups = {
  advanced: adminLabel('Nâng cao', 'Advanced'),
  content: adminLabel('Nội dung', 'Content'),
  data: adminLabel('Dữ liệu', 'Data'),
  lead: adminLabel('Lead', 'Leads'),
  media: adminLabel('Media', 'Media'),
  siteSettings: adminLabel('Cấu hình site', 'Site settings'),
}
