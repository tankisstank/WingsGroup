# US-085 — Hợp nhất liên hệ header WingsGroup và cập nhật hotline

## Status

`implemented` — footer WingsGroup v3 đã phát hành theo ủy quyền rõ của người dùng ngày 2026-10-23 lúc 21:29:13+07, release `d6057d4`. Cạnh form còn một link gọi; footer còn một hotline/một email. Không ghi CMS hay đổi schema. Plane: Đã bàn giao / Full theo bằng chứng triển khai; chưa phải nghiệm thu của khách hàng.

Header A và hotline WingsGroup0948786775 đã phát hành production ngày 2026-10-23 lúc15:12+07 theo ủy quyền trước đó, release6a0dac0. Bằng chứng phát hành header giữ nguyên trong validation.md và production-release/release-report.md; không phải bằng chứng phát hành footer mới.

## Lane

`high-risk`: đổi hành vi public desktop/mobile và luồng liên hệ hiện có; cần kiểm isolation khi dùng shared HeaderNav, cập nhật dữ liệu hotline theo site. Không thay schema.

## Quyết định đã duyệt

- Chọn phương án A trong `header-options-preview-20261023/so-sanh-header.html`.
- Đổi hotline chính WingsGroup từ `0912910101` thành `0948786775`; hiển thị **0948 786 775**, liên kết **tel:0948786775**.
- Hai hotline phụ giữ `0915250101`, `0915260101` theo dữ liệu CMS; Zalo vẫn OA chung hiện hữu.
- Phạm vi hotline là tenant `wings-group` của yêu cầu header này. Không áp thay số toàn hệ hoặc sửa số của WingsGo/WingSide.

## Current Behavior

Header có CTA tư vấn, pill hotline và Zalo độc lập; nav VI/EN đè logo ở 1200/1280/1440px. Bằng chứng 1280px: vùng menu lấn logo 60.38px VI, 126.05px EN; document không tràn ngang. US-081 ghi follow-up thêm hotline WingsGroup; US-072, US-071, US-062 là hợp đồng liên quan.

## Target Behavior

Một cụm vàng với link gọi chính riêng và nút mũi tên riêng. Desktop hiển thị số mới; mũi tên mở hotline phụ, Chat Zalo và Gửi nhu cầu. Bỏ CTA tư vấn và Zalo độc lập khỏi header WingsGroup. VI/EN dùng Gọi ngay / Call now; locale switcher VI | EN có tên accessible đầy đủ. Mobile giữ cụm gọi ngắn + mũi tên + hamburger. Menu Liên hệ vẫn là đích điều hướng riêng. Hero/FAB tiếp tục đi qua dialog hiện hữu.

Hotline mới đến từ CMS/source WingsGroup, nhất quán header, footer, dialog/FAB và trang liên hệ; không hardcode riêng trong header. Production apply/revalidation đã hoàn tất ngày2026-10-23; hai hotline phụ và dữ liệu các tenant khác giữ nguyên.

## Ownership and dates

- Người thực hiện code: agy, pane Herdr hiện hữu trong workspace WingsTravel.
- Người lập kế hoạch, review, quản lý story/Plane: Codex; owner Plane theo workspace: c0508g.
- Bắt đầu: 2026-10-23.
- Mục tiêu review kỹ thuật: 2026-10-26, là kế hoạch engineering, không phải cam kết ngày production.

## Footer follow-up — 2026-10-23

Người dùng phản ánh vùng cuối trang lặp ba hotline, hai email và Zalo. Giữ form làm hành động chính; cạnh form chỉ có link gọi hotline đầu tiên từ CMS, nhãn Gọi ngay / Call now. Footer V3 chỉ giữ một hotline và một email (supportEmail ưu tiên, salesEmail khi thiếu). Bỏ hotline phụ, Zalo và CTA tư vấn lặp ở footer; menu Liên hệ, pháp lý và địa chỉ vẫn có. Các kênh phụ còn trong header disclosure, không xóa dữ liệu CMS. WingsGo/WingSide và WingsGroup non-V3 giữ hành vi cũ.

Codex sở hữu contact section/CSS/test hiện hữu; agy sở hữu Footer và footerHotlines component tests. Codex review độc lập và kiểm trình duyệt. Footer đã phát hành bằng release riêng `d6057d4`, không đổi schema/dependency hoặc dữ liệu CMS. Báo cáo: footer-contact-review-20261023/production-release/release-report.md. Bằng chứng local trước phát hành giữ tại footer-contact-review-20261023/review.md.

## Affected Product Docs

- `docs/product/wingsgroup-v3-public-experience.md`
- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/multisite-platform.md`
- Story liên quan: US-081/E07, US-072/E09, US-071/E09, US-062/E09, US-082/E09.

## Acceptance Criteria

- Hợp nhất header VI/EN theo A trên desktop và mobile.
- Đổi hotline WingsGroup qua CMS, giữ isolation giữa các site.
- Giữ Zalo, form context và accessibility của luồng liên hệ.
- Kiểm chứng header/footer và đồng bộ bằng chứng.

## Non-Goals

Không làm phương án B; không đổi công nghệ/schema; không sửa branding hoặc navigation destinations; không gọi điện hay gửi lead thử ra ngoài; không push. Deploy và ghi production CMS được người dùng ủy quyền rõ sau lượt local review, đã thực hiện trong release riêng.
