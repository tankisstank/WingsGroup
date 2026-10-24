# Báo cáo Đánh giá Phát hành (Release Review) — US-083 CMS Departure Promotion

- **Mã gói đánh giá:** `WP-CMS-RELEASE-REVIEW`
- **Thời gian đánh giá:** 2026-10-20T22:00:00+07:00
- **Workspace:** `E:\repo\WingsTravel`
- **Phạm vi sở hữu:** Độc quyền [`artifacts/tmp/us083-cms-departure-promotion-20261020/agy-release-review.md`](file:///E:/repo/WingsTravel/artifacts/tmp/us083-cms-departure-promotion-20261020/agy-release-review.md)
- **Tình trạng mã nguồn:** Đã đóng băng (Frozen). Kiểm toán ở chế độ chia sẻ chỉ đọc (Shared-Readonly).

---

## 1. Tóm tắt Đánh giá (Executive Summary)

- **Kết luận chung:** **PASS — KHÔNG CÓ PHÁT HIỆN LỖI (NO UNRESOLVED FINDINGS: 0 P1 / 0 P2 / 0 P3)**.
- **Đối chiếu Build & Manifest:**
  - `BUILD_ID`: `GHux1OjjppK42suiKM04m` (khớp hoàn toàn giữa `.next/BUILD_ID` và `manifest.json`).
  - Toàn bộ 6 tệp mã nguồn và kiểm thử trong phạm vi đánh giá khớp 100% mã băm SHA256 với `docs/reviews/us083-cms-promotion-20261020/manifest.json`.
- **Đánh giá rủi ro Codex:** Cả 3 phát hiện P2 từ các phiên review trước của Codex đều đã được xử lý triệt để, có ca kiểm thử hồi quy bảo vệ và xác nhận thực tế trên PostgreSQL standalone.

---

## 2. Đối chiếu Tệp tin & Mã Băm SHA256 (Built Source Correspondence)

| Đường dẫn tệp tin | SHA256 thực tế trên đĩa | SHA256 trong `manifest.json` | Kết quả |
| :--- | :--- | :--- | :--- |
| [`TourDepartureForm.tsx`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/TourDepartureForm.tsx) | `4461C2FABD09925BE10F3B511A2A77E34EB3C96FCC77256F67DCE4757DB1807D` | `4461C2FABD09925BE10F3B511A2A77E34EB3C96FCC77256F67DCE4757DB1807D` | Khớp 100% |
| [`TourDepartureManager.tsx`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/TourDepartureManager.tsx) | `904282A002553BA7B0E633C70D744C4485BDF8F2EE7B2F66D1BA625331759FD7` | `904282A002553BA7B0E633C70D744C4485BDF8F2EE7B2F66D1BA625331759FD7` | Khớp 100% |
| [`TourAuthoringReadiness.tsx`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/TourAuthoringReadiness.tsx) | `3E17E305BE525DA63C8DBCFBB52E74C932BE3106ECC7860D2E603B0AD71E905D` | `3E17E305BE525DA63C8DBCFBB52E74C932BE3106ECC7860D2E603B0AD71E905D` | Khớp 100% |
| [`index.tsx`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/index.tsx) | `9B5970677DF0F1901014C99605CAAC30F2ECDF2F202BD1135CC813F2F7DF863B` | `9B5970677DF0F1901014C99605CAAC30F2ECDF2F202BD1135CC813F2F7DF863B` | Khớp 100% |
| [`tourDeparturePromotion.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/tourDeparturePromotion.component.spec.tsx) | `AED29293922F7F151A2E5CF1D4E27AA4B235B62F3B1721C6787E061874768748` | `AED29293922F7F151A2E5CF1D4E27AA4B235B62F3B1721C6787E061874768748` | Khớp 100% |
| [`tourAuthoring.component.spec.tsx`](file:///E:/repo/WingsTravel/app/tests/component/tourAuthoring.component.spec.tsx) | `B94AA6B62B12182BE89260BDBE41CDCE9B708D2516AE9F443C2C3DFC3D82A626` | `B94AA6B62B12182BE89260BDBE41CDCE9B708D2516AE9F443C2C3DFC3D82A626` | Khớp 100% |

- **Standalone Artifacts:** `.next/BUILD_ID` ghi nhận `GHux1OjjppK42suiKM04m`, khớp với tệp build standalone trong `app/.next/standalone`.

---

## 3. Kiểm toán Chi tiết 5 Trọng tâm Kỹ thuật (Technical Audit)

### 3.1. Dọn sạch Ưu đãi & Đọc Ngôn ngữ (Promotion Clear / Read Locale)
- **Cơ chế đọc draft theo locale:** Trong `TourDepartureManager.tsx:76`, query đọc danh sách khởi hành gửi kèm tham số `fallback-locale=none&draft=true` cùng header `Accept-Language: locale`. Điều này ngăn ngừa triệt để lỗi Payload CMS tự động fallback về tiếng Việt khi đọc một bản ghi chưa có ưu đãi hoặc đã xóa ưu đãi ở ngôn ngữ tiếng Anh.
- **Cơ chế xóa ưu đãi:** Khi checkbox `"Áp dụng ưu đãi"` tắt (`promotionEnabled: false`), `TourDepartureForm.tsx` trả về `originalPrice: '', promoLabel: ''`. Tại tầng Manager (`TourDepartureManager.tsx:114-116`), các trường này được chuyển hóa tường minh thành `originalPrice: null, promoLabel: null` trong request `PATCH`/`POST`.
- **Bằng chứng cơ sở dữ liệu:** File `postgres-clear-proof.json` xác nhận bản ghi revision draft trong PostgreSQL có `version_original_price: null` và `version_promo_label: null`, trong khi `price_from: 12900000` được giữ nguyên vẹn.

### 3.2. Ràng buộc Nghiệp vụ & Xác thực Dữ liệu (Validation)
- **Kiểm tra biên giá:** `TourDepartureForm.tsx:69-72` sử dụng `parseTourAuthoringPrice`, yêu cầu giá bán dương (`price > 0`) và giá gốc hợp lệ strictly lớn hơn giá bán (`originalPrice > price`). Trường hợp giá gốc nhỏ hơn hoặc bằng giá bán đều bị chặn ở client với thông báo lỗi rõ ràng.
- **Ưu đãi chỉ có nhãn (Label-only):** Được hỗ trợ trọn vẹn tại dòng 73 (`if (promotionEnabled && !originalInput && !promoLabel)`), cho phép người dùng chỉ nhập nhãn quảng bá mà không bắt buộc phải nhập giá gốc.
- **Hủy xác minh khi sửa đổi thương mại:** Tại `TourDepartureForm.tsx:55`, hàm `set` tự động reset `{ expiresAt: '', verified: false }` khi có bất kỳ thay đổi nào đối với giá bán, giá gốc, nhãn promotion, hoặc toggle ưu đãi. Người dùng buộc phải chủ động xác nhận lại và chọn hạn trong tương lai (`Date.parse(expiresAt) > Date.now()`).

### 3.3. Hợp đồng Bản nháp & Xuất bản (Draft / Published Contract)
- **Bảo toàn dữ liệu xuất bản:** Mọi thao tác lưu từ `TourDepartureManager` đều truyền `_status: 'draft'` và tham số URL `draft=true`. Dữ liệu chỉ cập nhật vào bảng version / draft của Payload, không ghi đè trực tiếp lên tài liệu đang xuất bản (`published`).
- **Phân tách trách nhiệm:** Việc đưa lịch khởi hành lên môi trường public được chuyển giao toàn quyền cho quy trình xuất bản tại `TourAuthoringReadiness.tsx`. Chỉ khi tour đủ điều kiện kỹ thuật và người dùng tích chọn lịch trong mục `"Lịch bay & xuất bản"`, các lịch được chọn mới chuyển trạng thái `published`.

### 3.4. Cơ chế Bảo vệ Tranh chấp Ngữ cảnh (Race Guards)
- **Monotonic Context Version:** `TourDepartureManager.tsx:65-70` sử dụng `useRef` theo dõi bộ ba định danh `productID:siteID:locale`. Bất kỳ sự thay đổi nào về site, tour, hoặc ngôn ngữ đều kích hoạt tăng đơn điệu `contextVersion.current`.
- **Bảo vệ luồng Lưu (Save):** Request lưu ghi nhận `requestContext = generation`. Sau khi lưu và sau khi reload lại dữ liệu, hệ thống đều kiểm tra `if (contextVersion.current !== requestContext) return`. Nếu người dùng đổi ngôn ngữ trong lúc request đang gửi, phản hồi trễ sẽ bị hủy bỏ, ngăn ngừa đóng nhầm form hoặc ghi đè nháp sai ngôn ngữ.
- **Bảo vệ luồng Xóa (Delete):** Tại dòng 158 và dòng 160, luồng `deleteDeparture` kiểm tra thế hệ trước và sau khi `await load()`. Nếu locale thay đổi khi đang tải lại, hàm sẽ return ngay lập tức mà không gọi callback `onSaved?.()`.

### 3.5. Đồng bộ Trạng thái Sẵn sàng Xuất bản (Readiness Refresh)
- **Liên kết phản ứng:** `TourProductAuthoring` trong [`index.tsx:45`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/index.tsx#L45) truyền `onSaved={() => setDepartureRevision((r) => r + 1)}` vào `TourDepartureManager`.
- **Tải lại tức thì:** Giá trị `departureRevision` nằm trong dependency array của `useEffect` trong [`TourAuthoringReadiness.tsx:256`](file:///E:/repo/WingsTravel/app/src/components/TourAuthoring/TourAuthoringReadiness.tsx#L256). Ngay khi có mutation (lưu hoặc xóa departure thành công), readiness lập tức reload danh sách departure candidates và đánh giá lại điều kiện xuất bản mà không cần người dùng reload toàn trang.

---

## 4. Tình trạng Xử lý 3 Phát hiện Codex P2 (Codex Review Resolution)

1. **P2 - Ngôn ngữ fallback ghi đè ưu đãi đã xóa:**
   - *Nguyên nhân:* GET departures không có `fallback-locale=none`, dẫn tới locale tiếng Anh tự động đọc fallback từ tiếng Việt.
   - *Biện pháp:* Đã thêm `&fallback-locale=none` vào query GET của `TourDepartureManager.tsx:76`.
   - *Đánh giá:* **Đã giải quyết triệt để**.
2. **P2 - Phản hồi lưu trễ đóng form mới sau vòng roundtrip VI-EN-VI:**
   - *Nguyên nhân:* So sánh chuỗi context đơn thuần bị trùng lặp khi người dùng chuyển `vi` $\to$ `en` $\to$ `vi`.
   - *Biện pháp:* Chuyển sang dùng `contextVersion.current` số nguyên tăng đơn điệu.
   - *Đánh giá:* **Đã giải quyết triệt để**, có test hồi quy test 9 kiểm chứng.
3. **P2 - Phản hồi xóa trễ kích hoạt `onSaved` sau khi đổi locale:**
   - *Nguyên nhân:* `deleteDeparture` thiếu kiểm tra thế hệ sau `await load()`.
   - *Biện pháp:* Đã thêm `if (contextVersion.current !== generation) return` ngay trước `onSaved?.()`.
   - *Đánh giá:* **Đã giải quyết triệt để**, có test hồi quy test 10 kiểm chứng.

---

## 5. Tổng kết Kiểm thử & Bằng chứng Lưu trữ (Verification Evidence)

- **Component Tests:**
  - `pnpm run test:component`: 47 tệp / 247 tests **PASS 100%**, exit code 0.
  - Targeted authoring tests: 17/17 tests **PASS 100%**, exit code 0 (gồm 10 ca kiểm thử promotion độc quyền).
- **Unit Tests:** `tourAuthoring.unit.spec.ts` & `tourAuthoringRoute.unit.spec.ts`: 18/18 tests **PASS 100%**.
- **Kiểm tra Biên dịch & Type Checking:** TypeScript compilation (`tsc`) và scoped ESLint đạt **0 lỗi**.
- **PostgreSQL Proofs:** `postgres-save-proof.json` và `postgres-clear-proof.json` xác thực chính xác các trường lưu và xóa ưu đãi trong database.
- **Dọn dẹp Môi trường:** Đã dọn dẹp toàn bộ dữ liệu mẫu (0 users, 0 products, 0 departures còn sót lại) theo `cleanup.log`.

---

## 6. Đề xuất & Kết luận Cuối cùng

Gói mã nguồn mở rộng CMS Tour Departure Promotion cho US-083 đã hoàn thiện đạt chuẩn chất lượng cao nhất:
- Không còn bất kỳ rủi ro tiềm ẩn P1/P2/P3.
- Bảo đảm tính cô lập dữ liệu đa trang (multisite isolation), an toàn ngôn ngữ và bất biến trạng thái xuất bản.
- **Khuyến nghị:** Đủ điều kiện kỹ thuật để tiến hành đóng gói và triển khai lên môi trường Production VPS ARM64 theo quy trình chuẩn.
