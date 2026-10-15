/**
 * Admin labels are intentionally plain strings. Payload accepts localized
 * records here, but several native admin paths interpolate collection labels
 * before resolving them and render a record as `[object Object]`. The admin
 * contract for this US is Vietnamese UI; content locale remains explicit in
 * data/API calls and never comes from `document.documentElement.lang`.
 */
const vietnameseAdminCopy: Record<string, string> = {
  Advanced: 'Nâng cao',
  Categories: 'Danh mục',
  Content: 'Nội dung',
  Data: 'Dữ liệu',
  DepartureVariant: 'Biến thể khởi hành',
  'Departure Variants': 'Biến thể khởi hành',
  'Hero presentations': 'Bản trình bày Hero',
  Import: 'Nhập dữ liệu',
  Imports: 'Nhập dữ liệu',
  Lead: 'Lead',
  Leads: 'Lead gửi về',
  Media: 'Thư viện media',
  Redirect: 'Chuyển hướng',
  Redirects: 'Chuyển hướng',
  'Search Result': 'Kết quả tìm kiếm',
  'Search Results': 'Kết quả tìm kiếm',
  'Site setting': 'Cấu hình site',
  'Site settings': 'Cấu hình site',
  Sites: 'Các site',
  'Theme preset': 'Preset giao diện',
  'Theme presets': 'Preset giao diện',
  'Tour Campaign': 'Chiến dịch tour',
  'Tour Campaigns': 'Chiến dịch tour',
  'Tour Curation': 'Bộ tour nổi bật',
  'Tour Curations': 'Bộ tour nổi bật',
  'Tour Departure': 'Lịch khởi hành tour',
  'Tour Departures': 'Lịch khởi hành tour',
  'Tour Product': 'Sản phẩm tour',
  'Tour Products': 'Sản phẩm tour',
  User: 'Người dùng',
  Users: 'Người dùng',
}

export const adminLabel = (vi: string, _en: string): string => vietnameseAdminCopy[vi] ?? vi

export const adminGroups = {
  advanced: adminLabel('Nâng cao', 'Advanced'),
  content: adminLabel('Nội dung', 'Content'),
  data: adminLabel('Dữ liệu', 'Data'),
  lead: adminLabel('Lead', 'Leads'),
  media: adminLabel('Media', 'Media'),
  siteSettings: adminLabel('Cấu hình site', 'Site settings'),
}
