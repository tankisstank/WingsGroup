export const wingsGroupLegacyContactFormFixture = {
  fields: [
    { blockType: 'text', label: 'Họ và tên', name: 'full-name', required: true },
    { blockType: 'email', label: 'Email', name: 'email', required: false },
    { blockType: 'text', label: 'Điện thoại', name: 'phone', required: false },
    { blockType: 'textarea', label: 'Thông điệp', name: 'message', required: true },
  ],
  id: 31,
  site: 1,
  title: 'Legacy WingsGroup contact',
} as const
