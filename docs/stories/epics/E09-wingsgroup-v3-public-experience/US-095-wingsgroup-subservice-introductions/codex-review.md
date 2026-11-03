## Kết luận

**Chấp thuận hướng kiến trúc cho US-095; chưa đủ bằng chứng để duyệt phát hành production.** Không phát hiện P1 trong phần mã đã kiểm tra. Có hai rủi ro P2 cần đóng trước phát hành.

### 1. Tương thích ngược và multisite isolation

- **Tương thích ngược được giữ:** 10 corporate routes không đổi; `/gioi-thieu-wingsplus` vẫn được nhận diện, export cũ vẫn tồn tại. Thay đổi chỉ bổ sung danh mục giới thiệu. [Mã route governance](E:/repo/WingsTravel/app/src/wingsgroup/corporateRoutes.ts:25).
- **Không thấy thay đổi làm mở quyền đọc tenant khác:** truy vấn frontend vẫn ghép `site.id`, lọc `published`, dùng `overrideAccess: false` khi đọc public và từ chối bản ghi có pathname khác route yêu cầu. [Luồng truy vấn](E:/repo/WingsTravel/app/src/utilities/cmsPageQuery.ts:51).
- Nhánh `otherTenants` trong access predicate **không tự cung cấp tenant isolation**; nó giữ hành vi tenant khác. An toàn phụ thuộc việc kết hợp với access control và site constraint hiện có. Không được tái sử dụng predicate này như bộ lọc tenant độc lập. [Access predicate](E:/repo/WingsTravel/app/src/wingsgroup/corporateRoutes.ts:412).
- Hook hiện kiểm tra quan hệ page/form/media cùng site và từ chối gắn governance WingsGroup sang tenant khác. [Hook governance](E:/repo/WingsTravel/app/src/collections/Pages/hooks/validateWingsGroupV3Governance.ts:107).

### 2. Finding và phân loại rủi ro

| Mức | Finding | Điều kiện cần đóng |
|---|---|---|
| **P2 — Major** | **Chưa xác minh transaction và chống ghi đè đồng thời.** Trong `app/scripts` và hồ sơ US-095 đã đọc, chưa thấy script tương ứng với mô tả khóa/rollback. Transaction của từng API operation không chứng minh hai trang được cập nhật nguyên tử. | Cùng một transaction cho toàn bộ cập nhật VI/EN của 191 và 181; truyền cùng `req.transactionID`; kiểm tra site/pathname; khóa hoặc kiểm soát phiên bản trước khi đọc/sửa layout. Test cố tình làm trang thứ hai lỗi và test editor lưu đồng thời. |
| **P2 — Major** | **`published` và `publication: approved` chưa đủ bảo đảm public VI/EN hoạt động.** Fixture WingsGo chưa có `contentApproval`; marker được hook quyết định theo quyền và thay đổi nội dung. Cổng tiếng Anh của site vẫn có thể khiến EN trả 404. | Chạy script với danh tính được phép; chuẩn bị đủ hai locale trước khi mở CTA; đọc lại từng locale với `fallbackLocale: false`, kiểm tra marker và render public thực tế. Không tự điền marker để bỏ qua duyệt. |
| **P3 — Minor** | **Alias WingSide mới chỉ là route được phép.** Thêm `/gioi-thieu-wing-side` vào allowlist không tạo redirect tới `/gioi-thieu-wingside`. Bộ kiểm tra pathname còn từ chối trả trang canonical thay cho alias. | Nếu giữ alias, bổ sung redirect 301/308 có scope WingsGroup và kiểm tra canonical; nếu alias không cần thiết, bỏ khỏi danh mục. |
| **P3 — Minor** | **Coverage mới chưa chứng minh đầy đủ bốn trang.** Test bổ sung kiểm tra nhận diện route và chuỗi query; kiểm tra public/runtime vẫn chủ yếu dùng WingsPlus. | Bổ sung matrix từng route mới × VI/EN, thiếu marker, route con, sai tenant và alias. |

Payload yêu cầu truyền transaction context để các Local API operation tham gia cùng transaction; Local API cũng có tùy chọn bỏ qua document lock. Vì vậy cần kiểm tra cấu hình thực tế, không suy ra tính an toàn từ việc “dùng Payload API”. ([payloadcms.com](https://payloadcms.com/docs/database/transactions))

**Preflight dữ liệu:** xác nhận site `1` thực sự có code `wings-group`; 191/181 đúng site và pathname; bốn media ID đúng site, file và trạng thái governance. Khi đồng bộ, chỉ sửa khối ecosystem tương ứng, giữ các block khác và ID cấu trúc của từng trang.

### 3. Rollback và trình tự phát hành

1. **Trước ghi:** lưu snapshot VI/EN, governance, versions và dấu phiên bản của 191/181; ghi lại ID bốn trang mới. Có backup PostgreSQL mã hóa và bằng chứng restore.
2. **Phát hành:** đưa code nhận diện route lên trước → chuẩn bị/duyệt đủ bốn trang → xác minh public → cập nhật hai khối ecosystem trong transaction.
3. **Sau commit:** invalidation cache/revalidation cho hai trang nguồn, năm trang đích, các locale và sitemap; kiểm tra nội dung thực tế, không chỉ HTTP 200. Hook hiện có revalidation, nhưng script chạy ngoài Next cần chứng minh cách xử lý. [Hook cache](E:/repo/WingsTravel/app/src/collections/Pages/hooks/revalidatePage.ts:46).
4. **Rollback:** khôi phục CTA và mô tả cũ trước; kiểm tra không ghi đè chỉnh sửa mới của editor; sau đó ẩn các trang do đợt này tạo. Không xóa media dùng chung hoặc trang WingsPlus. Khi rollback code cũ, bốn route mới sẽ bị chặn nên không để CTA tiếp tục trỏ tới chúng.

**ARM64:** tuân thủ [runbook Oracle](E:/repo/WingsTravel/docs/runbooks/oracle-vps-arm64-deployment.md): package sạch không chứa `public/media`, tái tạo symlink/native binaries, kiểm tra sharp/libvips/libsql trong container ARM64, pin app/operations image đúng candidate và giữ image rollback. Delta route này không cho thấy nhu cầu migration schema mới.

### 4. Kiểm chứng đã chạy lại ngày 03/11/2026

Từ `app/`:

| Lệnh | Kết quả |
|---|---|
| `pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts tests/unit/cmsPageQuery.unit.spec.ts` | **29/29**, exit 0 |
| `pnpm exec vitest run --config ./vitest.component.config.mts tests/component/wingsGroupV3Homepage.component.spec.tsx` | **27/27**, exit 0 |
| `pnpm exec tsc --noEmit --incremental false` | exit 0 |
| `pnpm exec eslint src/wingsgroup/corporateRoutes.ts tests/unit/wingsGroupCorporateRoutes.unit.spec.ts` | exit 0 |

Chưa kiểm chứng script dữ liệu, concurrency/rollback PostgreSQL, trình duyệt hoặc production ARM64; chưa sửa code, CMS hay trạng thái Plane.  
Rủi ro còn mở: cập nhật dở dang, ghi đè nội dung editor và CTA dẫn tới trang chưa vượt đủ publication gate.