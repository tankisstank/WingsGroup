# US-087 — Design

## Contract

`profiles[].cta` giữ label, state, contactPath, url. UI hiển thị Về form liên hệ / Đến trang web. Giữ giá trị enum `contact-fallback` / `approved-deep-link` để tương thích dữ liệu cũ.

Năm field owner, httpEvidence, canonicalEvidence, trackingEvidence, ownerApprovalEvidence bị loại khỏi cấu hình và generated types. Không sửa migration lịch sử hoặc DROP cột nullable; runtime không đọc chúng nữa. Không thay phiên bản dữ liệu hoặc site scope.

## URL Validation

Dùng cùng một kiểm tra cho CMS và renderer: absolute HTTPS có hostname, không credentials hoặc ký tự điều khiển/backslash. URL thiếu/sai bị chặn ở CMS; dữ liệu cũ sai rơi về form liên hệ an toàn. Giữ guard slug WingsSide cũ và contactPath hiện hữu. Không kiểm HTTP/canonical/tracking bằng các ô nhập editor.

## Scope of Code

- WingsGroupEcosystem config: bỏ trường, đổi nhãn lựa chọn, giữ validate proof.
- WingsGroupV3 model: bỏ evidence gate, giữ nhãn và fallback.
- Một helper URL dùng chung giữa server và client.
- payload-types và foundation/model/component fixtures/tests đồng bộ.

## Alternatives

1. Chỉ ẩn field: không giải quyết runtime vẫn chặn link, loại.
2. Xóa cả state và đổi enum: cần migration/đổi dữ liệu, không cần cho yêu cầu này.
3. Bỏ evidence gate và giữ kiểm URL: được chọn, ít thay đổi và tương thích.

Planning consultation: `ecosystem-cta-simplification-20261026/planning-review.md`.
