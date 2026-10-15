# Validation — US-079: WingSide Visual Tour Curation Console & Live Inbound Simulator

## Story Info

- **ID:** `US-079`
- **Title:** WingSide Visual Tour Curation Console & Live Inbound Simulator
- **Status:** planned
- **Lane:** normal
- **Epic:** `E10 - Nền tảng biên tập & Curation Tour Inbound WingSide`
- **Project:** `wingsside`

---

## 1. Ma trận Kiểm định Dự kiến (Verification Matrix)

| Lớp kiểm thử | Mục tiêu / Test Suite | Kỳ vọng chấp nhận | Trạng thái |
|---|---|---|---|
| **Unit** | `app/tests/unit/wingsSideTourCuration.unit.spec.ts` | 100% pass logic reorder array, giới hạn 6 slots, lọc tour Inbound hợp lệ, kiểm tra bản dịch tiếng Anh & giá USD. | Planned |
| **Component** | `app/tests/component/wingsSideTourCuration.component.spec.tsx` | Render đúng trạng thái slots, split-screen layout, quick reorder, remove, và live simulator desktop/tablet/mobile đa ngôn ngữ. | Planned |
| **Home Baseline** | `app/tests/unit/wingsSideHomeCuration.unit.spec.ts` | Không gây xung đột với hook kiểm định `validateWingsSideHomeCuration.ts`. | Planned |
| **Typecheck** | `pnpm exec tsc --noEmit` | 0 errors TypeScript across all files. | Planned |
| **Admin Import Map** | `app/src/app/(payload)/admin/importMap.js` | Component đăng ký thành công trong Payload import map. | Planned |

---

## 2. Tiêu chí Chấp nhận (Acceptance Criteria Checklist)

- [ ] **AC-1 (Visual Inbound Board):** Khung biên tập hiển thị tối đa 6 hành trình Inbound dạng card có thumbnail, tên tiếng Anh, số ngày/đêm, giá từ (USD/VND) và thẻ travelStyle.
- [ ] **AC-2 (Slot Hierarchy):** Phân chia rõ ràng Top 2 hành trình chủ đạo (Primary Showcase) và 4 hành trình tiếp nối (Secondary Showcase).
- [ ] **AC-3 (Drag & Drop Reordering):** Kéo thả hoán đổi thứ tự giữa các card mượt mà bằng `@dnd-kit`, cập nhật đúng thứ tự vào `wingsSideHiFi.home.featuredJourneySelections`.
- [ ] **AC-4 (Live Inbound Simulator 1:1):** Khung mô phỏng hiển thị đúng diện mạo khối Featured Journeys của WingSide theo thời gian thực, hỗ trợ chuyển đổi Desktop/Tablet/Mobile và ngôn ngữ xem trước.
- [ ] **AC-5 (Inbound Tour Picker):** Modal tìm kiếm phân trang server-side với bộ lọc Điểm đến (Destination) và Phong cách (Travel Style), chỉ liệt kê tour thuộc site WingSide.
- [ ] **AC-6 (Pre-validation & Warning):** Cảnh báo trực tiếp trên card nếu tour thiếu bản dịch ngôn ngữ chính (`en`) hoặc thiếu lịch bay tương lai.
- [ ] **AC-7 (Data Integrity & Backward Compatibility):** Dữ liệu lưu giữ nguyên cấu trúc schema hiện tại, vượt qua toàn bộ kiểm tra trong `validateWingsSideHomeCuration.ts`.
