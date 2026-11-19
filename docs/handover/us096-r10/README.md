# US-096 — bàn giao R10

Hiện trạng production được chấp nhận ngày 19/11/2026. Nếu cần tối ưu thêm, mở lại US-096.

| Mốc | Commit |
| --- | --- |
| Bản đã bàn giao | `0fc02f521bd25eff633f4509716c1f9586d97046` |
| Bản rollback R7 | `a719756f28f4cf2f867c1aa2af9c3ee1627c08cd` |
| Mã nền trước chuỗi commit US-096 | `f0c1c34d471b9a5e5968fb422cb1c10659ae233c` |

## Kiểm chứng đã thực hiện

Tại 14:01 (UTC+7) ngày 19/11/2026, nguồn của image phục vụ khớp SHA R10; readiness đạt và container không restart trong lượt kiểm. Catalog WingsGo, trang chủ WingsGroup, chi tiết tour, lịch khởi hành, campaign và trang chủ WingsGo cũ đều trả 200, đúng nội dung và không có trang 404 giả. Nội dung nghiệp vụ ở origin và public khớp với mốc trước cutover; có giá và lịch ở các tuyến cần có. Không chạy Lighthouse B và không công bố mức cải thiện hiệu năng. Harness ghi nhận bàn giao ở trace #414; trạng thái US trên Plane là **Đã bàn giao**.

## Khôi phục mã

`us096-r10.bundle` là Git bundle tăng dần: chứa đúng 11 commit của US-096 sau commit nền nêu trên, giữ nguyên SHA, không chứa lịch sử khác trước mốc nền. Đây không phải bản clone độc lập hay image triển khai. Checkout của nhánh tài liệu này không phải source tree production.

Từ clone **đã có commit nền**, chạy:

```sh
git cat-file -e 'f0c1c34d471b9a5e5968fb422cb1c10659ae233c^{commit}'
git bundle verify docs/handover/us096-r10/us096-r10.bundle
git fetch docs/handover/us096-r10/us096-r10.bundle refs/heads/handoff/us096-r10-source
git rev-parse FETCH_HEAD
```

Kết quả cuối phải là SHA R10 trong bảng. Nếu clone thiếu nền, cần lấy commit nền từ kho nội bộ trước; không áp patch lên một nền khác rồi coi đó là bản đã bàn giao.

SHA-256 của bundle: `47f5317bf8abe006d8b88405af15e56e5a70b68d95a14d4a4bf119ab04d7a9b0`. Không đưa archive image, backup, dữ liệu CMS, file cấu hình riêng, log production hoặc cache lên nhánh này.
