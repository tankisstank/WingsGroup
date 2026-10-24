# Design — US-085

## Decision

Phương án A đã duyệt; tham chiếu header-options-preview-20261023/so-sanh-header.html. Prototype có logic mô phỏng nên chỉ tham chiếu bố cục/interaction.

## Interface contract

Desktop: [logo] [6 nav links] [cụm vàng: link gọi chính | button mũi tên] [VI / EN]. Text Gọi ngay / Call now; số hiển thị 0948 786 775 do CMS cung cấp. Main link href tel:0948786775. Hai vùng bấm độc lập, không anchor lồng button, không đợi dropdown mới gọi.

Dropdown chứa 0915 250 101, 0915 260 101 theo CMS, Chat Zalo / Chat on Zalo, Gửi nhu cầu / Send an inquiry. Đến form trực tiếp bằng locale/site-aware route và cơ chế giữ context/focus hiện có, không bắt chọn lại trong dialog. Menu Liên hệ/Contact vẫn dẫn nội dung/trang liên hệ. Hero/FAB giữ dialog chung.

Mobile: logo, cụm vàng Gọi ngay / Call now + mũi tên, hamburger. Không bày thêm CTA/Zalo độc lập. Số đầy đủ có trong dropdown/drawer/footer; không làm mất lời gọi có nghĩa với screen reader. Khi rỗng hotline, dùng hành vi liên hệ còn khả dụng theo existing contract, không tạo tel: rỗng hoặc tự chèn lại CMS-cleared number.

Button có aria-expanded/aria-controls, tên chọn kênh rõ, vùng bấm mục tiêu 44px; Tab/Shift+Tab, Escape trả focus, click ngoài đóng; dropdown không ra ngoài viewport và không che menu đang mở. Full language labels vẫn có aria-label; giữ locale publication gating, route/query semantics.

## Data model and source

Không đổi schema. supportPhone chính xác tenant wings-group; additionalHotlines giữ nguyên. Seed/config/local data cần đổi đồng bộ từ 0912910101 thành 0948786775 ở WingsGroup. Không đổi WINGSGO_DEFAULT_HOTLINES hoặc khách/site khác chỉ vì số cũ giống nhau. Không global replace source/history/migration.

Nếu phải đổi CMS record hiện hữu: thao tác có điều kiện theo site identity đã resolve, kiểm giá trị trước/sau, no-op khi đã là số mới, fail rõ nếu là số tùy chỉnh khác. Rehearsal trên local/disposable; release production là hành động riêng. Dùng hook revalidation có sẵn, không override CMS đọc bằng hardcode UI.

## Files to inspect and likely touch

- app/src/Header/Component.tsx, Component.client.tsx, Nav/index.tsx; CSS WingsGroup v3.
- app/src/utilities/siteHotlines.ts và sharedConsultationChannels: reuse theo hợp đồng, chỉ sửa khi có root cause cụ thể.
- app/scripts/lib/wingsGroupCorporateRouteSeed.ts, WingsGroup branches của seed-subsites.ts và nguồn cấu hình liên hệ có liên quan.
- Footer, ConsultationDialog, FAB, contact route, structured data: xác nhận nhận đúng CMS source; sửa nơi có stale hardcode nếu tìm thấy, không thêm nhánh UI không cần thiết.
- Focused tests cho WingsGroup header/consultation/hotline update, và regression WingsGo/WingSide. Cập nhật fixture và public fidelity contract nếu thay đúng hành vi cũ.

## Alternatives

B (hotline + CTA riêng) không triển khai. Một nút mở dialog làm gọi chính hai bấm nên không chọn.
