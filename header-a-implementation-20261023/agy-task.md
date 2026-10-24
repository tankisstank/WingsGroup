# Giao agy triển khai US-085 — phương án A đã duyệt

## Yêu cầu người dùng và phạm vi

Người dùng đã chốt **phương án A**, yêu cầu cập nhật kế hoạch, giao agy thực hiện và đổi số `0912910101` thành `0948786775`. Thực hiện code local ngay, không chỉ đề xuất thêm. Không push, deploy, ghi CMS production hoặc gửi lead/gọi điện thật.

- Workspace: `E:\repo\WingsTravel`.
- Prototype chuẩn: `E:\repo\WingsTravel\header-options-preview-20261023\so-sanh-header.html` (A; đã đổi số thành `0948 786 775`).
- Story: `E:\repo\WingsTravel\docs\stories\epics\E09-wingsgroup-v3-public-experience\US-085-wingsgroup-header-contact-consolidation\`.
- Đọc `overview.md`, `execplan.md`, `design.md`, `validation.md` trong story trước khi sửa, cùng các tài liệu bắt buộc của AGENTS.md.
- Nhận xét trước của bạn: `E:\repo\WingsTravel\header-contact-review-20261023\agy-review.md`. Người dùng chọn A; triển khai A.
- Bắt đầu 2026-10-23, mục tiêu sẵn sàng review kỹ thuật 2026-10-26; chưa có ngày production.

## Hợp đồng chức năng

1. WingsGroup desktop: một cụm vàng, link gọi chính `tel:0948786775` và nút mũi tên riêng, không nested interactive. Nhãn VI/EN `Gọi ngay` / `Call now`, số `0948 786 775`. Loại CTA tư vấn và Zalo độc lập trong header WingsGroup. Dropdown chứa hai hotline phụ, Zalo OA, Gửi nhu cầu. Giữ menu Liên hệ là navigation.
2. Mobile: cụm gọi ngắn + mũi tên + hamburger. VI | EN có accessible labels đầy đủ, giữ published locale/query behavior. Không đè logo, clipping hoặc horizontal overflow ở breakpoint/zoom, keyboard/Escape/focus đúng.
3. Gửi nhu cầu mở form hiện hữu với locale/context; không mở thêm bộ chọn kênh lần hai. Hero/FAB và các tenant khác không bị đổi hành vi.
4. Hotline phải từ CMS của `wings-group`, đồng bộ header/footer/dialog/FAB/contact. Hai số phụ giữ `0915250101`, `0915260101` theo CMS. Không thay toàn hệ; **không sửa WINGSGO_DEFAULT_HOTLINES**. Không thêm schema/dependency không cần thiết.
5. Chuẩn bị cập nhật dữ liệu hiện hữu theo site: idempotent old→new, new→no-op, giá trị tùy chỉnh bất ngờ→báo lỗi và không ghi. Chỉ áp dụng local/disposable khi kiểm thử. Production apply/revalidate để bước release sau. Sử dụng hook/cache invalidation hiện hữu, không flush Redis toàn hệ.

## Điểm code cần kiểm tra

- `app/src/Header/Component.tsx`, `app/src/Header/Nav/index.tsx` và các client wrapper/style/locale switcher liên quan.
- `app/src/utilities/siteHotlines.ts`: dùng lại normalize/format/resolve; fallback trong file là riêng WingsGo, không đổi số đó.
- Các caller Header/Footer/FAB/ConsultationDialog/cmsPage và cấu hình consultation context.
- `app/scripts/lib/wingsGroupCorporateRouteSeed.ts`: supportPhone hiện ở gần dòng 722, 744.
- `app/scripts/seed-subsites.ts`: các nhánh có số cũ gần dòng 1485, 4110, 6976; kiểm identity từng site trước khi sửa.
- `app/scripts/wingsgroup-v3-release-gates.test.mjs` và fixtures/assertions liên quan.
- Đây là danh sách discovery ban đầu; kiểm callers bằng CodeGraph trước, sau đó rg khi cần. Không sửa historical migrations/SQL hay tenant khác bằng replace toàn repo.

## Quyền sở hữu file và kỷ luật

- Agy phụ trách app implementation, test, data-update script cần thiết trong `app/` và báo cáo/evidence riêng dưới `E:\repo\WingsTravel\header-a-implementation-20261023\`.
- Codex đang cập nhật story packet, Harness, `docs/plane/manifest.json`, Plane và prototype. **Không sửa các file này**, gửi đề xuất chỉnh doc qua báo cáo để tránh đè nhau.
- Working tree có thay đổi khác: `app/scripts/lib/postgresCrudSmokeLifecycle.mjs`, `app/artifacts/`, nhiều artifact deploy và review US081/082/083. Không reset, xóa hay sửa chúng.
- Mỗi lệnh ghi đúng một file, tối đa khoảng 15KB. File lớn dùng patch nhỏ hoặc append tại section hoàn chỉnh. Không Delete+Add cùng file. Code rõ ràng, không minify.
- Không spawn subagent con, không quét ổ ngoài project, không theo dõi pane Codex. Làm xong tự kiểm và gửi một báo cáo cuối.
- Ưu tiên reuse existing component/helper. Kiểm validation, accessibility và tenant isolation đầy đủ.

## Kiểm chứng và bàn giao

- Chạy focused tests hotline/data-script/component và các gate verify/tsc/lint/build phù hợp repo; đọc lỗi thật, không coi grep/HTTP 200 là proof.
- Browser thật dùng `agent-browser`: VI/EN homepage và một trang con; kiểm 320, 375, 390, 768, 1024, 1199, 1200, 1279, 1280, 1440, 1536px. Kiểm bounding boxes logo/nav/contact/locale, không chỉ document scrollWidth; mở dropdown, drawer, form, keyboard, Escape/focus, 200% zoom.
- Data checks: old/new/custom, thiếu/empty phone, hai số phụ, WingsGo/WingSide không thay đổi. Không gửi contact thực.
- Lưu command, exit code, timestamp và screenshot mới sau lần sửa cuối. Nếu gate bị baseline blocker, ghi rõ lỗi và phạm vi, không khai PASS.
- Viết `E:\repo\WingsTravel\header-a-implementation-20261023\agy-implementation.md`: files changed, decisions, data before/after local, commands/results, evidence, chưa kiểm, risk và hướng dẫn apply/rollback release sau.
- Không đóng Story hay tự đánh dấu production complete. Codex cần audit trước khi đóng/release.

Hãy phản hồi ngắn `AGY_US085_ACCEPTED` khi bắt đầu, sau đó tiếp tục triển khai ngay. Khi đủ local proof, ghi `AGY_US085_READY_FOR_REVIEW` và đường dẫn báo cáo. Nếu blocker thật, báo cụ thể và tiếp tục phần độc lập còn làm được.
