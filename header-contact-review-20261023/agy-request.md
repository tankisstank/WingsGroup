# Yêu cầu đánh giá độc lập: hợp nhất liên hệ header WingsGroup

Người dùng yêu cầu Codex xác định US liên quan, đề xuất cải thiện header VI/EN bị tràn/lệch sau thêm hotline, và lấy nhận xét từ agy qua pane herdr hiện hữu. Chỉ đánh giá/đề xuất, chưa sửa app, chưa deploy/push và chưa thay đổi trạng thái Story/Plane.

Ảnh đầu vào (đường dẫn tuyệt đối):
- C:\Users\VIETD\AppData\Local\Temp\codex-clipboard-NtYVFA.png
- C:\Users\VIETD\AppData\Local\Temp\codex-clipboard-ft4BVg.png

Hiện header có logo, 6 nav links, CTA vàng Trao đổi nhu cầu / Speak with a specialist, pill hotline chính + dropdown, Zalo OA, hai nhãn ngôn ngữ dài. Người dùng muốn hợp nhất ba điểm liên hệ, nổi bật và khuyến khích gọi/click.

Hãy đánh giá độc lập và ghi một báo cáo duy nhất vào E:\repo\WingsTravel\header-contact-review-20261023\agy-review.md, kết thúc in AGY_HEADER_REVIEW_DONE. Có thể đọc source/docs liên quan dưới E:\repo\WingsTravel phục vụ yêu cầu này; không sửa các file hiện hữu. Cần: US chính/phụ có bằng chứng; nguyên nhân layout; ít nhất 2 phương án; phương án khuyến nghị với copy VI/EN, hành vi desktop/mobile, số thao tác để gọi/Zalo/form; rủi ro và AC/QA; chỉ rõ phần đã kiểm chứng và phần suy luận. Đừng chỉ đồng ý đề xuất Codex; tự đưa hướng phù hợp.

Các nơi gợi ý để đọc:
- docs/stories/epics/E07-tour-product-platform/US-081-wingsgo-multi-hotlines/overview.md và validation.md (production follow-up thêm hotline wingsgroup.vn)
- docs/stories/epics/E09-wingsgroup-v3-public-experience/US-072-header-brand-and-section-alignment/overview.md và validation.md
- US-071-wingsgroup-ux-copyedit-layout-social-proof; US-061/US-062 contract consultation/header trong E09
- app/src/Header/Nav/index.tsx; app/src/Header/Component.tsx; app/src/app/(frontend)/wingsgroup-v3.css
- app/src/components/WingsGroupV3/ConsultationDialog.tsx

Quy tắc: không spawn agent; không quét ổ đĩa ngoài thư mục dự án; chỉ ghi file agy-review.md; mỗi lệnh chỉ ghi 1 file, tối đa khoảng 15KB; nếu >15KB nối tại section hoàn chỉnh; không Delete+Add; giữ code/text rõ ràng. Không theo dõi pane Codex. Trả một báo cáo rồi kết thúc.
