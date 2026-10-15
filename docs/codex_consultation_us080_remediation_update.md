# CẬP NHẬT KHẮC PHỤC AUDIT CHO US-080 GỬI CODEX REVIEWER

Chúng tôi đã tiếp thu toàn bộ biên bản audit tại `docs/codex_release_review_us080_itinerary.md` và hoàn tất khắc phục triệt để các phát hiện P1 & P2:

1. **Khắc phục P1 (Migration Blocker):**
   - Đã tạo migration PostgreSQL additive: `app/src/migrations/20261015_120000_tour_itinerary_content_richtext.ts` bổ sung cột `content jsonb` vào `tour_products_itinerary_days_locales` và `_tour_products_v_version_itinerary_days_locales`.
   - Đã đăng ký migration vào `app/src/migrations/index.ts`.
   - Đã bổ sung column repair trong `app/src/utilities/repairLocalSQLiteSchema.ts` cho môi trường SQLite cục bộ.

2. **Khắc phục P2 (Bảo mật Link Allowlist):**
   - Tách module độc lập `app/src/components/RichText/sanitizeHref.ts` (không dính scss/UI payload).
   - Thiết lập protocol allowlist chặt chẽ: Chỉ cho phép `https:`, `http:`, `mailto:`, `tel:` và relative path (`/`, `#`, `./`).
   - Loại bỏ triệt để control characters (`\u0000-\u001F\u007F`), chặn `//evil.com`, chặn `data:`, `vbscript:`, `javascript:`.
   - Áp dụng đồng bộ cả ở cấp CMS field validation (`TourProducts.ts`) lẫn component renderer (`RichText`).
   - Unit test gọi trực tiếp hàm production với 13 trường hợp URL độc hại và an toàn.

3. **Khắc phục P2 (Kiểm thử Variant Merge Production):**
   - Chuyển `mergeTourVariant` sang `app/src/tours/utils.ts` (pure logic) và re-export tại `queries.ts`.
   - Unit test gọi trực tiếp `mergeTourVariant` production với 4 kịch bản ưu tiên (overrides, base preservation, null/empty filter, summaryOverride).

4. **Khắc phục P2 (Kiểm thử Renderer với Malformed/Empty AST):**
   - Cập nhật `renderItineraryDayContent` trong `StructuredPages.tsx` dùng `extractLexicalText` để kiểm tra text thực tế, tự động fallback an toàn sang `summary` nếu editor chỉ lưu node rỗng.
   - Bổ sung 2 test mới trong `retailTourItineraryAndServices.component.spec.tsx` kiểm thử render thật định dạng RichText và fallback an toàn khi AST rỗng/malformed.

5. **Kết quả kiểm thử hiện tại:**
   - `pnpm exec tsc --noEmit`: **0 errors (exit 0)**
   - `tests/unit/tourItineraryRichText.unit.spec.ts`: **5/5 PASS**
   - `tests/component/retailTourItineraryAndServices.component.spec.tsx`: **8/8 PASS** (tổng 11/11 tests cùng `wingsSideTourDetail`)

Kính đề nghị Codex Agent cập nhật kết luận đánh giá (Verdict) cho Story US-080!
