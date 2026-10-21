# Kế hoạch Thực thi: US-083 — Hiển thị Discount & Promotion trên Card Tour

## 1. Giai đoạn 1: Data Model & Mapping Layer
- [ ] Cập nhật DTO `WingsGoCatalogPrice` trong `app/src/tours/wingsGoCatalog.ts` để hỗ trợ `originalPrice`.
- [ ] Cập nhật mapper `toWingsGoCatalogCard` và các helper truy vấn trong `app/src/tours/queries.ts`.
- [ ] Viết unit tests kiểm tra logic mapping giá gốc & gạch ngang (chỉ map khi `originalPrice > priceFrom > 0`).

## 2. Giai đoạn 2: UI Components
- [ ] Cập nhật `app/src/tours/WingsGoHomepageSections.tsx`: Hiển thị badge `promoLabel` và giá gạch ngang `<del>`.
- [ ] Cập nhật `app/src/tours/WingsGoTourCard.tsx`: Hiển thị giá gốc gạch ngang trong phần giá từ.
- [ ] Cập nhật `app/src/tours/StructuredPages.tsx`: Đồng bộ hiển thị ưu đãi trên danh sách tour theo điểm đến.
- [ ] Cập nhật `app/src/collections/Tours/hooks/revalidateTourContent.ts`: Bổ sung revalidate cho path `/` (Trang chủ WingsGo).

## 3. Giai đoạn 3: Kiểm thử & Nghiệm thu
- [ ] Chạy unit tests: `pnpm run test:unit -- tests/unit/wingsGoCatalog.unit.spec.ts`.
- [ ] Kiểm thử hiển thị trên giao diện thực tế bằng `agent-browser`: Xác nhận giá gạch ngang và badge ưu đãi hiển thị đẹp mắt, rõ ràng.
- [ ] Đồng bộ Plane work items.
