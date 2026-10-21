# US-084 — Execution plan

## Phase 1 — Contract

1. Chốt architecture decision về `editorialBadges` và label/góc sticker.
2. Bổ sung schema typed trên `TourProducts`, giữ tương thích với badge legacy.
3. Bổ sung mapper/DTO và validate duplicate, limit, locale, site scope.

## Phase 2 — UI

1. Render badge editorial trong `WingsGoHomepageSections`, `WingsGoTourCard` và `StructuredPages` từ cùng DTO.
2. Thêm hot 2px rainbow border và sticker cho specialized/VIP.
3. Kiểm tra collision với `promoLabel`, giá, ảnh, tiêu đề và CTA ở desktop/mobile.

## Phase 3 — Runtime

1. Mở rộng revalidation cho thay đổi Tour Product.
2. Xác nhận route/cache key theo tenant `wings-go`.
3. Không migration hoặc Redis flush nếu không có schema/data decision bổ sung.

## Phase 4 — Verification

- Unit: schema validation và mapper.
- Component: mọi tổ hợp badge, không badge, label dài, reduced motion.
- Integration: CMS save/read và route cache invalidation.
- Browser: homepage, `/tour`, ít nhất hai market route, desktop/mobile, `/en`.
- Root review: multisite isolation, no price inference, no stale public card.

## Definition of done

Story chỉ chuyển sang hoàn tất khi AC1–AC8 có bằng chứng mới, Plane/Harness đã đồng bộ và Codex release review không còn finding P1/P2 chưa xử lý.
