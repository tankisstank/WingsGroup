# Thiết kế Kỹ thuật: US-081 — Đa Hotline Liên hệ & Tư vấn WingsGo có Click-to-Call

## Hợp đồng hiện tại — follow-up 23/10/2026

- Hotline chính WingsGo là `0948786775`; fallback và seed đồng bộ. Giá trị CMS hợp lệ vẫn được ưu tiên.
- Footer chỉ giữ một link gọi ngay và một email ưu tiên; bỏ cột tư vấn lặp, các số phụ, Zalo và theme selector.
- WingsGo cố định light từ SSR và ThemeProvider; không lấy lựa chọn dark từ localStorage hay hệ điều hành. Site khác giữ hành vi hiện có.
- FAB ẩn khi footer vào viewport. Dialog đã mở vẫn hiển thị; Escape đóng và chuyển focus về link gọi footer.
- Form liên hệ lấy hotline đã resolve từ RenderBlocks thay ba literal cũ; không thay schema hay luồng submit.
- Công cụ `updateWingsGoHotline.ts` mặc định plan; chỉ đổi main cũ của đúng site, không seed lại và không chạm hotline phụ. Apply production cần shared transaction/row lock, backup và rehearsal PostgreSQL.
- Candidate độc lập dựa trên release đang chạy `d6057d4`; bằng chứng và giới hạn trong `wingsgo-footer-review-20261023/`. Chưa triển khai production cho follow-up này.

## Thiết kế lịch sử ngày 19/10/2026

Các đoạn bên dưới lưu thiết kế ban đầu. Số chính cũ và yêu cầu hiển thị cả ba số tại footer đã được thay bằng hợp đồng follow-up ở trên.

## 1. Kiến trúc Dữ liệu & Schema CMS

### 1.1. Collection `SiteSettings` (Additive Schema)
Giữ nguyên trường `supportPhone` (số chính) để tương thích tuyệt đối với PostgreSQL/SQLite migrations và các tenant khác. Bổ sung trường `additionalHotlines`:

```ts
// app/src/collections/SiteSettings.ts
{
  name: 'supportPhone',
  label: 'Số điện thoại hỗ trợ chính',
  type: 'text',
},
{
  name: 'additionalHotlines',
  label: 'Hotlines tư vấn bổ sung',
  type: 'array',
  maxRows: 5,
  admin: {
    description: 'Danh sách các đầu số hotline bổ sung (ví dụ: 0915 250 101, 0915 260 101). Hiển thị kèm link click-to-call trên di động.',
  },
  fields: [
    {
      name: 'phoneNumber',
      label: 'Số điện thoại',
      type: 'text',
      required: true,
    },
    {
      name: 'label',
      label: 'Nhãn hiển thị (tùy chọn)',
      type: 'text',
      admin: {
        placeholder: 'VD: Hotline tư vấn 2, Hỗ trợ đặt tour',
      },
    },
  ],
}
```

### 1.2. Shared Resolver & Hotline Helper
Tạo helper `app/src/utilities/siteHotlines.ts`:

```ts
export interface HotlineItem {
  raw: string
  normalized: string
  href: string
  label?: string
}

export const WINGSGO_DEFAULT_HOTLINES = [
  '0912910101',
  '0915250101',
  '0915260101',
]

export function formatHotlineDisplay(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, '')
  if (clean.length === 10 && clean.startsWith('0')) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}` // 0912 910 101
  }
  return phone
}

export function resolveSiteHotlines(settings?: SiteSetting | null, siteCode?: string): HotlineItem[]
```

Đoạn mã trên mô tả giao diện; việc chuẩn hóa thực tế phải kiểm tra ký tự trước khi bỏ dấu phân tách, từ chối chữ cái, protocol và dấu `+` sai vị trí. Không chuyển số điện thoại sang kiểu số.

Hợp đồng fallback đã chốt ngày 19/10/2026:

- Giữ `supportPhone` hợp lệ làm số đầu tiên; chỉ WingsGo dùng `0912910101` khi số chính thiếu/sai.
- WingsGo có `additionalHotlines === undefined` dùng hai số phụ mặc định; `[]` hoặc `null` không dùng fallback phụ. Danh sách truyền qua prop `hotlines={[]}` cũng phải được tôn trọng.
- Lọc trùng theo số chuẩn hóa, giữ thứ tự CMS và nhãn tùy chọn; `+84` Việt Nam quy về số `0` đầu.
- Site khác không nhận số WingsGo. Bộ helper không truy cập DB, không import mã server.

### 1.3. Migration và cache

- PostgreSQL thêm bảng array `site_settings_additional_hotlines`, đăng ký migration `20261019_100000_site_settings_hotlines`.
- Chỉ backfill hai số phụ cho SiteSettings WingsGo cũ khi bảng vừa được tạo. Chạy lại không tái thêm số đã xóa; không ghi đè `supportPhone` hoặc tenant khác.
- SQLite local bootstrap có repair tương đương; seed WingsGo và Payload types được cập nhật theo schema mới.
- Tái sử dụng hook invalidation SiteSettings hiện có. Request mới nhận cấu hình mới sau invalidation/TTL; tab đã mở cần tải lại. Không bổ sung API hay context client.

### 1.4. Luồng dữ liệu và kênh Zalo

Header server → HeaderClient → HeaderNav; Footer tự resolve từ settings; layout → FAB; cmsPage → resolver trang tour → TourDetailPage → modal mount → dialog. Trang lịch khởi hành nhận cùng danh sách cho CTA chính.

Tất cả dùng **một Zalo OA chung** từ `getSharedZaloCTA(siteCode, locale)`, URL `https://zalo.me/4142059657526524531`. Không tạo trường Zalo theo hotline. Giữ hành vi FAB WingSide và các luồng snapshot/selection/private tour hiện có.

Desktop có link gọi số chính riêng với nút mở số phụ; nút có `aria-expanded`, `aria-controls`, Escape, đóng khi click ngoài và phục hồi focus khi đóng bằng bàn phím. Không dùng hover làm cách mở duy nhất.

## 2. Điểm chạm Giao diện (UI Touchpoints)

1. **Header Nav Desktop (`app/src/Header/Nav/index.tsx`):**
   - Nút gọi số chính dạng pill: `<a href="tel:0912910101">☎ 0912 910 101</a>`.
   - Popover hoặc dropdown hiển thị 2 số bổ sung khi hover/focus/click: `0915 250 101` và `0915 260 101`, mỗi số là một thẻ `<a href="tel:..." className="hotline-dropdown-item">`.
2. **Header Nav Mobile:**
   - Trong drawer điều hướng, hiển thị khối Hotline chuyên biệt với 3 link `<a href="tel:...">` riêng biệt kèm icon điện thoại để khách tap và gọi ngay.
3. **Footer (`app/src/Footer/Component.tsx`):**
   - Khối liên hệ hiển thị danh sách hotlines: mỗi đầu số có link `<a href="tel:...">`.
4. **Floating Action Button (`app/src/components/SiteContactFab.tsx`):**
   - Popup liên hệ hiển thị 3 button/link gọi điện thoại tương ứng với 3 đầu số, bọc trong `<a href="tel:..." ...>`.
5. **Modal Tư vấn Giữ chỗ (`app/src/tours/RetailTourConsultationDialog.tsx`):**
   - Cung cấp danh sách hotline có link `tel:` trực tiếp.
