# US-083 — ưu đãi từng đợt ngay trong CMS Tour

Yêu cầu ngày20/10/2026: truy cập departure từ màn hình Tour, xem ngày/giá và tick ưu đãi để sửa tại chỗ. Người dùng xác nhận **ưu đãi riêng từng đợt**, không bulk. Đây là phần bổ sung sau release production19:18:29; chưa triển khai phần CMS này lên production.

## Contract

Tái sử dụng mục Ngày khởi hành & giá trong TourProduct authoring. Mỗi dòng có Sửa và Mở đầy đủ. Form có Giá (giá bán), checkbox Áp dụng ưu đãi, Giá gốc và Nhãn promotion. Giá gốc nếu nhập phải hợp lệ, lớn hơn giá bán dương; cho phép chỉ nhãn không có giá gốc. Tắt ưu đãi gửi originalPrice:null và promoLabel:null cho locale đang sửa. Không thêm schema hay field boolean vào collection.

Thay đổi thông tin thương mại bỏ xác minh cũ; người sửa xác nhận lại và chọn hạn trong tương lai. Lưu tạo draft của đúng departure/site/tour, không tự publish. Nhãn theo locale query tường minh; đọc draft với fallback-locale=none. Sau lưu/xóa, parent tải lại readiness để bước chọn departure và publish dùng revision mới. Editor được đóng khi locale/site/tour thay đổi; generation tăng dần chặn response cũ cả vòng VI→EN→VI.

## Phạm vi code

- TourDepartureForm.tsx tách từ component manager để không làm file lớn; giữ named export cũ qua TourDepartureManager cho caller/test.
- TourDepartureManager.tsx: hydrate/hiển thị/lưu giá gốc và nhãn, localized draft read/write, async guards, local timezone expiry, link departure đầy đủ.
- index.tsx và TourAuthoringReadiness.tsx: refresh readiness sau departure mutation.
- Existing authoring tests giữ contract; new promotion component suite do agy wP:p1 sở hữu, root kiểm lại. Không sửa collection/API access/schema/currency policy hoặc mã giá public.

## Review độc lập

Codex tìm P2 fallback nhãn bị xóa xuất hiện lại và P2 response save cũ sau locale roundtrip đóng editor mới; đã sửa fallback-locale=none + generation guard, regression đạt. Follow-up chấp nhận hai sửa này, tìm thiếu recheck generation sau delete reload; root thêm cùng guard, giao regression riêng. Draft=true được reviewer kiểm bằng installed Payload: không ghi đè published document khi lưu draft.

## Trạng thái kiểm chứng

Đang hoàn tất browser trên standalone PostgreSQL55432/Redis56379; dữ liệu/tài khoản task-only. Không dùng production data writes hoặc devserver3000 của người dùng. Root dừng server rehearsal của mình để tránh EBUSY standalone khi build; sẽ ghi phiên bản/log/ảnh cuối sau khi hoàn tất.
## Kết quả cuối — 20/10/2026 21:29 +07

- `pnpm run test:component`: exit0, 47 files /247 tests trên source cuối. `pnpm exec vitest run --config vitest.component.config.mts tests/component/tourDeparturePromotion.component.spec.tsx tests/component/tourAuthoring.component.spec.tsx tests/component/tourAuthoringReadiness.component.spec.tsx`:17/17, trong đó promotion suite10 cases (một case kiểm nhiều giá biên).
- `pnpm run test:unit -- tourAuthoring.unit.spec.ts tourAuthoringRoute.unit.spec.ts`: exit0,18/18. Không nhận là đã chạy lại toàn bộ unit/integration/E2E repository cho phần bổ sung.
- TypeScript, scoped ESLint, diff check và `pnpm run build` gồm postbuild: exit0. Final BUILD_ID `GHux1OjjppK42suiKM04m`. Lỗi EBUSY ban đầu do server rehearsal của root đã xử lý bằng dừng đúng process root, không dừng server3000 của người dùng.
- Browser thực tế: CMS TourProduct3 → mục Ngày khởi hành & giá → Sửa departure2. Giá gốc12M thấp hơn sale12.9M bị chặn. Nhập original15.9M/promo, xác minh+hạn tương lai rồi lưu; PostgreSQL latest draft chứa đúng giá/nhãn/site2/product3, main record không đổi. Mở lại hydrate đúng giá và expiry theo local time.
- Bản build cuối desktop1440x900/mobile390x844 đọc lại draft; root xem cả hai ảnh. Mobile documentWidth375<390, không tràn ngang; bảng có thanh cuộn riêng. Bỏ tick promotion và lưu từ mobile: PG latest draft originalPrice/promoLabel/verifiedAt/expiresAt đều null, sale12.9M giữ nguyên. Link Mở đầy đủ trỏ đúng departure2 với localevi. Browser page errors0.
- Agent-browser fill datetime-local không điền được native input trong phiên này; root dùng native value setter + input/change events trên chính input để kiểm luồng xác minh. Đây là workaround của browser driver, không sửa code sản phẩm vì lỗi driver. Native date UI hiển thị đúng sau nhập/mở lại. Rehearsal có CSP warnings từ instrumentation cdn.jsdelivr.net bị chặn và translation-key warnings sẵn có; không gọi console hoàn toàn sạch.
- Codex follow-up tìm thiếu generation recheck sau delete reload: đã thêm guard và test deferred delete xác nhận callback cũ không chạy. Không còn finding P1/P2/P3 chưa xử lý trong phạm vi code này.
- Task fixture user4, product3, departure2 đã xóa; SQL mới xác nhận count0/0/0. Browser root-cms-promo đã đóng. Setup/cleanup processes được dừng sau SQL verification vì Redis connection giữ process sống sau payload.destroy; không báo cleanup script exit0. Rehearsal standalone root PID8420/port3102 được giữ để review local; proxy/pane/server3000 hiện hữu giữ nguyên.

Bằng chứng bền vững: `docs/reviews/us083-cms-promotion-20261020/`, gồm logs, full review, PostgreSQL save/clear JSON và ảnh desktop/mobile. Intake144. Phần public US083 production19:18:29 giữ nguyên; **CMS extension này chưa đóng gói/triển khai production**, không migration và không production CMS writes.

Harness trace302 (partial): local implementation complete, production gate pending for this CMS extension. US-083 changed/high_risk, proof unit/integration/e2e=1, platform=0. Plane preview maps US-083 to Chờ xác nhận; original public release remains available.

## Production release — 20/10/2026 22:40 +07

- Candidate elease-us083-cms-promotion-20261020-150000 built from BUILD_ID GHux1OjjppK42suiKM04m; archive contained 17,209 entries, no .env or public/media. Existing production current/image, PostgreSQL backup and rollback image were verified before activation. Backup SHA256 4fd0c527e3e78a226e61e0948d0a1f595f518aeb6a0b8ce4ec99580a5eea1881, 4,585,853 bytes, pg_restore exit0.
- ARM64 candidate passed readiness, libsql memory write/read, sharp/libvips PNG90 bytes, and read-only consent/tenant/catalog smoke. Candidate stayed on loopback 3104; after activation it was removed. Production current is now elease-us083-cms-promotion-20261020-150000, image sha256:8756cce56b9bf7978f2586d382e0039a16075962463248bbc39f7beeb3d3541f; /api/health/ready remains ready.
- Live read-only browser smoke passed WingsGo /, /tour, /thi-truong/han-quoc, /thi-truong/nhat-ban and WingsGroup /en at 1440x900 and 390x844. All measured document width <= viewport and page errors=0. CMS compiled asset hash matched local verified build and contained the three promotion controls; no production CMS write was performed.
- Rollback image remains wingstravel-app:rollback-release-us083-cms-promotion-20261020-150000. No migration, DB/Redis restart, global cache flush, or business data mutation.


**Trạng thái cập nhật sau activation:** CMS extension đã live production tại elease-us083-cms-promotion-20261020-150000; câu mô tả local-only ở phần trước là trạng thái trước release và được supersede bởi mục Production release ở trên. Plane/Harness đã chuyển US-083 sang Đã bàn giao/implemented với platform proof=1.
