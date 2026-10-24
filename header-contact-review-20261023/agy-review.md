# Báo cáo Đánh giá Độc lập: Hợp nhất Điểm chạm Liên hệ & Tối ưu Layout Header WingsGroup

**Dự án:** WingsTravel Workspace — Tenant `wings-group` (WingsGroup v3)  
**Ngày thực hiện:** 23/10/2026  
**Người đánh giá:** AI Assistant (Antigravity) — Đánh giá độc lập theo yêu cầu tại `header-contact-review-20261023/agy-request.md`  
**Trạng thái hành động:** Chỉ đánh giá và đề xuất kiến trúc, không sửa đổi mã nguồn (`app/`), không deploy và không can thiệp trạng thái Story/Plane.

---

## 1. Tóm tắt Đánh giá (Executive Summary)

Sau khi kiểm tra trực tiếp mã nguồn, dữ liệu đo đạc thực tế (`live-measurements.json`), ảnh chụp giao diện hiện trường (`live-vi-1280.png`, `live-en-1280.png`, `codex-clipboard-NtYVFA.png`, `codex-clipboard-ft4BVg.png`), chúng tôi xác nhận:
1. **Lỗi layout đè logo là có thật và nghiêm trọng:**
   - Tại viewport 1280px (độ phân giải laptop tiêu chuẩn), thanh điều hướng (Nav) bị tràn ngược về phía trái, đè trực tiếp lên Logo WingsGroup:
     - Giao diện Tiếng Việt (`/`): Đè lấn **60.38px** (chữ "Trang chủ" đè mép phải logo).
     - Giao diện Tiếng Anh (`/en`): Đè lấn **126.05px** (chữ "Home" bị đẩy hẳn sang mép trái màn hình tọa độ `-3.47px`, chữ "Services" đè trực diện lên biểu tượng địa cầu của Logo WingsGroup).
     - Thậm chí tại 1440px, độ chồng lấn vẫn còn **33.61px** do khung chứa bị khóa cứng `max-width: 1240px`.
2. **Nguyên nhân cốt lõi:**
   - Việc bổ sung cụm **Hotline Pill** (`☎ 0912 910 101` + nút toggle dropdown `▼`, chiếm ~156px) theo follow-up của US-081, kết hợp với CTA vàng cỡ lớn ("Speak with a specialist" ~200px), liên kết văn bản rời "Zalo OA" (~68px) và nhãn chuyển ngữ dài ("Tiếng Việt (vi)" + "ENGLISH (en)" ~225px) đã làm **tổng chiều ngang nội dung Header Nav vượt quá ngân sách khả dụng** của container (1,237px > 1,216px khả dụng).
   - Cơ chế CSS Flexbox `justify-content: flex-end` kết hợp `flex-wrap: nowrap` khiến toàn bộ khối nội dung khi tràn bị đẩy ngược về bên trái (Start edge), gây va chạm trực diện với `.site-header__brand`.
3. **Định hướng giải quyết:**
   - Cần một US chuyên biệt trong Epic E09 để **Hợp nhất 3 điểm chạm liên hệ** (CTA vàng, Hotline, Zalo OA), tinh gọn nhãn ngôn ngữ và tối ưu padding nav link. Giải pháp này giải phóng ngay **~250px - 280px**, triệt tiêu 100% độ chồng lấn (`brandNavOverlap = 0px`) trên mọi viewport từ 1200px đến 4K mà vẫn bảo toàn tính năng Click-to-call 1 chạm.

---

## 2. Nhận diện User Stories (US Chính & Phụ) có Bằng chứng

| Phân loại US | Mã Story & Tên Story | Epic | Bằng chứng Codebase & Tài liệu | Vai trò trong vấn đề hiện tại |
| :--- | :--- | :--- | :--- | :--- |
| **US Tác động Trực tiếp (Catalyst)** | **US-081**: Đa Hotline Liên hệ & Tư vấn WingsGo có Click-to-Call (`tel:`) | `E07` | - `docs/stories/epics/E07-tour-product-platform/US-081-wingsgo-multi-hotlines/overview.md`<br>- `validation.md` (mục 5 dòng 41: *"Follow-up production configuration cho `wingsgroup.vn`: giữ `0912910101`, thêm explicit `0915250101` và `0915260101`"*).<br>- `app/src/Header/Nav/index.tsx` (dòng 130-131: `isHotlineSite = isWingsGo \|\| isWingsGroup`). | US-081 ban đầu thiết kế cho WingsGo nhưng việc kích hoạt follow-up cho WingsGroup đã đưa thêm cụm pill hotline (~156px) vào Header Desktop, trực tiếp làm vỡ ngân sách chiều ngang của thanh Header. |
| **US Hợp đồng Logo & Shell** | **US-072**: Fix WingsGroup five-brand logos and section header alignment | `E09` | - `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-072-header-brand-and-section-alignment/overview.md`<br>- Yêu cầu AC: Logo hiển thị chuẩn xác ở 390, 768, 1024, 1440px *"without nav collision, clipping or horizontal overflow"*. | Quy định kích thước khung Logo WingsGroup (`site-logo-image--wingsgroup` height 68px, max-width 120px). Hiện tượng nav tràn đè lên logo vi phạm trực tiếp tiêu chí AC của US-072. |
| **US Hợp đồng Typography & Switcher** | **US-071**: WingsGroup UX Copy-edit, Layout & Social Proof | `E09` | - `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-071-wingsgroup-ux-copyedit-layout-social-proof/overview.md`<br>- `app/src/app/(frontend)/wingsgroup-v3.css` (dòng 91-100, 448-455). | Quy định font size `0.9375rem`, font weight 600, và chuẩn hóa nhãn ngôn ngữ dài `Tiếng Việt (vi)` và `ENGLISH (en)` (chiếm tới 225px diện tích thanh header). |
| **US Kiến trúc Consultation** | **US-062**: Homepage fidelity & Responsive consultation | `E09` | - `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-062-homepage-fidelity-responsive-consultation.md`<br>- `app/src/components/WingsGroupV3/ConsultationDialog.tsx`<br>- `wingsgroup-v3.css` (dòng 535-536: *"amber is reserved for the one consultation action"*). | Thiết lập nút CTA màu hổ phách/vàng (`site-header-cta`) kích hoạt `ConsultationDialog`. Bản thân modal này đã có sẵn cả 3 kênh: Zalo OA, 3 số hotline click-to-call, và Form nhu cầu. |
| **US Gây Biến động Độ dài EN** | **US-082**: Bản địa hóa Hoàn chỉnh WingsGroup English (`/en`) | `E09` | - `docs/stories/epics/E09-wingsgroup-v3-public-experience/US-082-wingsgroup-en-localization/overview.md`<br>- `app/src/Header/Component.tsx` (dòng 39: CTA label tiếng Anh là `Speak with a specialist`). | Bản dịch tiếng Anh làm CTA dài thêm 46.6px (từ 153px lên 200px) và nav links dài thêm ~40px, dẫn đến mức độ đè logo trên `/en` (126px) trầm trọng hơn gấp đôi so với tiếng Việt (60px). |

**Đề xuất Story Quản trị (Recommendation):**  
Không nên coi đây là một hotfix chắp vá cho US-081 hay US-082. Cần mở một Story riêng biệt thuộc Epic **E09**:  
👉 **`US-085-wingsgroup-header-contact-consolidation` — Hợp nhất Điểm chạm Liên hệ & Tối ưu Bố cục Header WingsGroup v3**.

---

## 3. Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 3.1. Dữ liệu Đo đạc Thực tế (Live Empirical Measurements)
Dựa trên kết quả đo đạc từ `live-measurements.json` trên production/staging:

| Viewport | Ngôn ngữ | Độ rộng Brand (Logo) | Tọa độ mép phải Brand | Tọa độ mép trái Nav Link đầu tiên | **Mức độ Đè lấn (`brandNavOverlap`)** | Hiện tượng trực quan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1280px** | Tiếng Việt (`/`) | 90.58px | 122.58px | 62.20px ("Trang chủ") | **60.38px** (LỖI) | "Trang chủ" đè mép phải logo |
| **1280px** | Tiếng Anh (`/en`) | 90.58px | 122.58px | -3.47px ("Home") | **126.05px** (NGHIÊM TRỌNG) | "Home" văng khỏi lề trái, "Services" đè giữa tâm logo |
| **1440px** | Tiếng Việt (`/`) | 90.58px | 183.08px | 149.47px ("Trang chủ") | **33.61px** (LỖI) | Vẫn bị đè do khung khóa max-width 1240px |
| **1440px** | Tiếng Anh (`/en`) | 90.58px | 183.08px | 83.47px ("Home") | **99.61px** (LỖI) | Đè lấn nặng nề |

### 3.2. Bóc tách Kích thước Chiều ngang Header (Width Breakdown)
Khung chứa `.site-header__bar` tại viewport 1280px có khoảng trống khả dụng bên trong lề padding là:  
`1280px - (32px padding trái + 32px padding phải) = 1,216px`.

Chiều rộng của các thành phần con trên Header:
1. **Logo WingsGroup (`.site-header__brand`)**: `90.58px` + gap tối thiểu `12px` = **102.58px**.
2. **Ngân sách còn lại cho toàn bộ Nav**: `1,216px - 102.58px = 1,113.42px`.
3. **Tổng chiều rộng thực tế của Nav hiện tại**:
   - **6 Nav Links**:
     - Tiếng Việt: ~450.25px.
     - Tiếng Anh: ~489.83px.
   - **CTA Button**:
     - Tiếng Việt ("Trao đổi nhu cầu"): `153.34px`.
     - Tiếng Anh ("Speak with a specialist"): `199.95px`.
   - **Cụm Hotline Pill**: `☎ 0912 910 101` (127.55px) + nút dropdown `▼` (28.45px) = `156.00px`.
   - **Liên kết Zalo OA**: `68.03px`.
   - **Language Switcher**: Icon địa cầu + `Tiếng Việt (vi)` (110.13px) + `ENGLISH (en)` (111.19px) = `225.32px`.
   - **Khoảng cách gaps (9 gaps @ ~10.88px)**: `~97.92px`.
   
   👉 **Tổng cộng chiều rộng Nav**:
   - **Tiếng Việt:** `450.25 + 153.34 + 156.00 + 68.03 + 225.32 + 97.92 = 1,150.86px` (Vượt ngân sách **37.44px**).
   - **Tiếng Anh:** `489.83 + 199.95 + 156.00 + 68.03 + 225.32 + 97.92 = 1,237.05px` (Vượt ngân sách **123.63px**).

### 3.3. Cơ chế CSS Gây Đè Lên Logo
Trong file `app/src/app/(frontend)/wingsgroup-v3.css` dòng 434-446:
```css
body[data-site-code='wings-group'][data-wingsgroup-v3='true']
  .site-header__nav
  > nav[aria-label='Primary navigation'] {
  display: flex;
  flex-wrap: nowrap !important;
  align-items: center;
  justify-content: flex-end;
  gap: clamp(0.4rem, 0.85vw, 1rem);
}
```
- Khi `flex-wrap: nowrap` và các phần tử con có `white-space: nowrap; flex-shrink: 0;`, trình duyệt không thể ngắt dòng hay co nhỏ phần tử.
- Thuộc tính `justify-content: flex-end` cố định mép phải của nav vào biên phải màn hình. Khi tổng chiều rộng vượt quá container, **phần dư thừa bị đẩy tràn ngược về phía Start (bên trái)**.
- Do `.site-header__brand` nằm bên trái, các item đầu tiên của nav ("Trang chủ" / "Home", "Services") bị đè đè thẳng lên vùng hiển thị của Logo.

---

## 4. Đánh giá So sánh Các Phương án Giải quyết

| Tiêu chí Đánh giá | Phương án 1: Hợp nhất Toàn diện vào CTA (Unified Consultation CTA Hub) | Phương án 2: Tách 2 Tầng Header (Sub-header / Top Bar) | **Phương án 3 (Khuyến nghị): Hybrid Anchor (Hotline Gọn + CTA Đa kênh + Switcher Tinh gọn)** |
| :--- | :--- | :--- | :--- |
| **Mô tả giải pháp** | Bỏ hẳn Hotline pill và Zalo link trên header bar; chỉ giữ 1 nút CTA vàng "Liên hệ tư vấn" mở `ConsultationDialog` (vốn đã có sẵn Zalo, Hotline, Form). Rút gọn switcher sang `VI \| EN`. | Thêm 1 thanh top-bar phụ phía trên header để chứa Hotline, Zalo, Switcher; thanh chính chỉ chứa Logo, Nav và CTA. | **Giữ Hotline chính gọi trực tiếp (pill tinh gọn), tích hợp Zalo vào CTA vàng (mở dialog), rút gọn copy CTA và rút gọn Switcher sang `VI \| EN`.** |
| **Bảo toàn Click-to-call** | ⚠️ Giảm (Phải mất 2 clicks để gọi: bấm CTA -> bấm hotline trong modal). | ✅ 1 click (Hotline nằm trên top-bar). | ✅ **1 click tức thì** (Bấm trực tiếp số hotline chính trên header). |
| **Hiệu quả giải phóng không gian** | ⭐⭐⭐ Rất cao (Giải phóng ~380px). | ⭐⭐ Trung bình (Tăng chiều cao header từ 76px lên ~110px). | ⭐⭐⭐ **Rất cao (Giải phóng ~250px - 280px)**. |
| **Tác động Layout & Chiều cao** | Giữ nguyên chiều cao 76px. | Phá vỡ chiều cao 76px đã chốt trong US-072; chiếm dụng màn hình first-fold. | **Bảo toàn tuyệt đối chiều cao 76px và bố cục v3**. |
| **Rủi ro hồi quy (Regression)** | Thấp, nhưng có thể gây phản ứng từ bộ phận kinh doanh do mất số hotline đập vào mắt. | Cao (Phải sửa cấu hình layout toàn trang, sửa CSS breadcrumb và sticky header). | **Thấp nhất, cân bằng hoàn hảo giữa UX, kinh doanh và mỹ thuật thương hiệu**. |

---


## 5. Phương án Khuyến nghị Chi tiết (Recommended Solution)

### 5.1. Kiến trúc Bố cục Header Desktop (>= 1200px)
Cấu trúc Header Desktop sau khi tối ưu gồm 4 khối rõ ràng từ trái sang phải:
```
[ LOGO WINGSGROUP ] -------- [ 6 NAV LINKS ] --- [ ☎ 0912 910 101 ▼ ] --- [ NHẬN TƯ VẤN ] --- [ 🌐 VI | EN ]
```

1. **Khối Logo (`.site-header__brand`)**: Giữ nguyên vị trí và kích thước đã duyệt trong US-072.
2. **Khối Điều hướng (6 Nav Links)**:
   - Giảm nhẹ padding ngang mỗi link từ `clamp(3px, 0.45vw, 8px)` xuống `6px`.
   - VI: `Trang chủ` | `Dịch vụ` | `Hệ sinh thái` | `Về WingsGroup` | `Cẩm nang` | `Liên hệ` (~420px).
   - EN: `Home` | `Services` | `Our ecosystem` | `About WingsGroup` | `Journal` | `Contact` (~450px).
3. **Khối Hotline Trực tiếp Tinh gọn (`Hotline Compact Pill`)**:
   - Giữ nguyên số chính `0912 910 101` với liên kết `tel:0912910101` để khách bấm gọi ngay (1 click).
   - Giữ nút dropdown `▼` mở 2 số hotline phụ (`0915 250 101`, `0915 260 101`).
   - Tối ưu nhẹ padding: giảm padding từ `px-3` xuống `px-2.5` và font size `0.8125rem` để cụm này chỉ chiếm **~145px** (tiết kiệm ~11px).
4. **Khối CTA Chuyển đổi Vàng (Unified Consultation CTA)**:
   - **Hấp thu liên kết "Zalo OA" vào trong modal**: Loại bỏ hoàn toàn text link `Zalo OA` đứng riêng lẻ trên header bar (tiết kiệm **68px**).
   - Click vào CTA mở `ConsultationDialog` (modal này vốn đã có sẵn nút Zalo OA ở vị trí ưu tiên số 1, danh sách 3 hotline và form nhu cầu).
   - Tối ưu Copywriting súc tích, mang tính hành động cao:
     - **Tiếng Việt:** Chuyển từ `"Trao đổi nhu cầu"` (153px) sang **`"Nhận tư vấn"`** hoặc **`"Tư vấn 24/7"`** (~112px, tiết kiệm **~41px**).
     - **Tiếng Anh:** Chuyển từ `"Speak with a specialist"` (200px) sang **`"Consultation"`** hoặc **`"Get in touch"`** (~125px, tiết kiệm **~75px**).
5. **Bộ chuyển đổi ngôn ngữ Tinh gọn (Compact Language Switcher)**:
   - Thay thế nhãn dài `Tiếng Việt (vi)` và `ENGLISH (en)` bằng định dạng chuẩn quốc tế:
     - Biểu tượng địa cầu `🌐` kết hợp `VI | EN` (như WingsGo và các site dịch vụ cao cấp).
     - Chiều rộng giảm từ **225px** xuống còn **~85px** (tiết kiệm **~140px**!).

### 5.2. Ngân sách Không gian Sau Cải tiến (Post-improvement Width Budget)

| Thành phần trên Header | Bản gốc Tiếng Việt | **Sau Cải tiến (VI)** | Bản gốc Tiếng Anh | **Sau Cải tiến (EN)** | Mức tiết kiệm |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **6 Nav Links** | 450px | 420px | 490px | 450px | Giảm ~30-40px |
| **Hotline Pill + Dropdown** | 156px | 145px | 156px | 145px | Giảm ~11px |
| **Text link Zalo OA** | 68px | **0px (Đã gộp)** | 68px | **0px (Đã gộp)** | **Giải phóng 68px** |
| **CTA Button Vàng** | 153px | 112px ("Nhận tư vấn") | 200px | 125px ("Consultation") | **Giải phóng 41px - 75px** |
| **Language Switcher** | 225px | 85px (`VI \| EN`) | 225px | 85px (`VI \| EN`) | **Giải phóng 140px** |
| **Gaps giữa các phần tử** | 98px | 65px (ít item hơn) | 98px | 65px | Giảm ~33px |
| **TỔNG CHIỀU RỘNG NAV** | **1,150px** | **~827px** | **1,237px** | **~870px** | **Tiết kiệm ~323px - 367px** |
| **Khoảng trống an toàn tới Logo** | **-34px (ĐÈ)** | **+286px (AN TOÀN)** | **-126px (ĐÈ NẶNG)** | **+243px (AN TOÀN)** | **Hết 100% chồng lấn** |

### 5.3. Bảng Kiểm soát Số Thao tác Người dùng (Action / Click Budget)

| Mục tiêu của Người dùng | Hiện trạng | Giải pháp Khuyến nghị | Đánh giá Trải nghiệm |
| :--- | :--- | :--- | :--- |
| **Gọi Hotline khẩn cấp** | 1 click (bấm vào số trên pill) | **1 click** (bấm vào số trên pill) | Bảo toàn 100% tốc độ gọi khẩn cấp |
| **Chọn Hotline phụ** | 2 clicks (bấm `▼` -> chọn số) | **2 clicks** (bấm `▼` -> chọn số) | Tiện lợi, không đổi |
| **Nhắn tin Zalo OA** | 1 click (link chữ Zalo OA trên header) | **2 clicks** (bấm CTA -> chọn Zalo OA trong modal) HOẶC **1 click** qua FAB góc phải | Loại bỏ sự lộn xộn trên header; FAB góc phải luôn hỗ trợ 1 click |
| **Để lại nhu cầu (Form)** | 2 clicks (bấm CTA -> chọn Form) | **2 clicks** (bấm CTA -> chọn Form) | Chuẩn quy trình Lead Intake của v3 |

### 5.4. Trải nghiệm trên Mobile & Tablet (< 1200px)
- **Header Mobile Bar**:
  - Chỉ hiển thị: `[ Logo WingsGroup ]` bên trái; bên phải gồm: `[ Nút gọi ☎ ]` (click gọi ngay số chính), và `[ Nút Menu ☰ ]`.
  - Ẩn text link Zalo OA và ẩn nút CTA vàng trên thanh bar mobile để tránh vỡ thanh header ở các màn hình hẹp (360px - 390px).
- **Trong Mobile Navigation Drawer (Khi mở menu `☰`)**:
  - Đặt nút CTA vàng `"Nhận tư vấn"` / `"Consultation"` ở vị trí đầu tiên hoặc cuối cùng với kích thước full-width nổi bật.
  - Hiển thị đầy đủ cả 3 Hotline với icon ☎ và số click-to-call.
  - Hiển thị nút liên kết Zalo OA to rõ, dễ bấm.
  - Đặt bộ chọn ngôn ngữ `VI | EN` ở chân menu.
- **Nút Nổi (Floating Action Button - FAB)**:
  - Nút `SiteContactFab` ở góc dưới bên phải màn hình vẫn hoạt động 24/7 trên cả desktop và mobile, cung cấp lối tắt 1-click vào Zalo OA và Hotline.

---

## 6. Ma trận Rủi ro & Phân định Đã Kiểm chứng vs. Suy luận

### 6.1. Phân định Kiểm chứng (Fact-Checking Boundary)
- **Đã kiểm chứng (Verified Facts)**:
  - Số liệu overlap 60.38px (VI) và 126.05px (EN) đo trực tiếp từ DOM production/staging tại 1280px (`live-measurements.json`).
  - Container `.site-header__bar` bị ép `max-width: 1240px; min-height: 76px;` trong `wingsgroup-v3.css`.
  - Quy tắc `justify-content: flex-end; flex-wrap: nowrap !important;` nằm tại dòng 438-440 trong `wingsgroup-v3.css`.
  - Modal `ConsultationDialog.tsx` đã tích hợp đầy đủ Zalo OA, hotlines và consultation form.
  - Tenant `wings-group` đã nhận 2 hotline phụ trong production theo US-081 validation.
- **Suy luận kỹ thuật & Đề xuất (Inferred & Recommended)**:
  - Khách quốc tế quen thuộc với nhãn `VI | EN` hơn nhãn dài `Tiếng Việt (vi) | ENGLISH (en)`.
  - Việc bỏ text link "Zalo OA" khỏi header desktop không làm suy giảm tỷ lệ liên hệ qua Zalo vì người dùng có thể tiếp cận Zalo qua CTA modal hoặc nút FAB nổi.

### 6.2. Rủi ro & Giải pháp Phòng ngừa (Risks & Mitigations)
1. **Rủi ro ảnh hưởng các Tenant khác (Multisite Bleed)**:
   - *Nguy cơ*: Sửa đổi CSS hoặc helper chung làm thay đổi giao diện WingsGo hoặc WingSide.
   - *Giải pháp*: Mọi điều chỉnh CSS bắt buộc phải bọc trong selector:  
     `body[data-site-code='wings-group'][data-wingsgroup-v3='true'] .site-header--wingsgroup-v3 ...`  
     Đảm bảo WingsGo (`siteCode === 'wings-go'`) và WingSide giữ nguyên 100% code và layout hiện hành.
2. **Rủi ro gãy Component Unit/E2E Tests**:
   - *Nguy cơ*: Các bộ test hiện tại (ví dụ `tests/component/headerHotlines.component.spec.tsx` hoặc các test kiểm tra text `Trao đổi nhu cầu`, `Zalo OA`) có thể bị fail.
   - *Giải pháp*: Khi triển khai Story mới, cập nhật test selector dựa trên thuộc tính `data-od-id` hoặc data-attributes thay vì text cố định.
3. **Rủi ro Khả năng Tiếp cận (Accessibility / A11y)**:
   - *Nguy cơ*: Khi rút gọn nhãn ngôn ngữ sang `VI | EN`, screen reader có thể đọc cụt lủn.
   - *Giải pháp*: Bổ sung thuộc tính `aria-label="Chuyển sang Tiếng Việt"` và `aria-label="Switch to English"`, đồng thời gắn `aria-current="page"` cho ngôn ngữ hiện hành.

---

## 7. Đề xuất Tiêu chí Chấp nhận (Acceptance Criteria) cho Story Mới

Khi mở Story **`US-085-wingsgroup-header-contact-consolidation`**, đề xuất bộ AC sau:

- **AC1 — Triệt tiêu Chồng lấn Header (Zero Nav-Brand Collision)**:
  Trên site `wingsgroup.vn` ở cả 2 ngôn ngữ `/` và `/en`, tại mọi viewport từ 1200px đến 1920px (đặc biệt kiểm thử tại 1200px, 1280px, 1366px, 1440px):
  - Khoảng cách giữa mép phải Logo và mép trái phần tử điều hướng đầu tiên luôn `>= 16px`.
  - Chỉ số `brandNavOverlap` bằng `0px`.
  - Không xuất hiện thanh cuộn ngang (`overflow-x: hidden`).
- **AC2 — Bảo tồn Hotline Click-to-Call 1 Chạm**:
  - Hotline chính `0912 910 101` hiển thị rõ ràng trên Header Desktop dưới dạng thẻ `<a href="tel:0912910101">`.
  - Nút toggle dropdown `▼` mở mượt mà danh sách 2 hotline phụ (`0915 250 101`, `0915 260 101`) với click-to-call tương ứng; nhấn phím `Escape` đóng dropdown.
- **AC3 — Hợp nhất CTA Tư vấn Đa kênh (Unified Consultation Action)**:
  - Nút CTA vàng hiển thị copy tối ưu: `"Nhận tư vấn"` (VI) và `"Consultation"` (EN).
  - Click vào CTA mở `ConsultationDialog` chứa đầy đủ 3 kênh: Zalo OA (kèm link chuẩn `sharedZaloOa`), 3 Hotline điện thoại, và nút mở form nhu cầu `/lien-he#contact-form`.
  - Loại bỏ liên kết text rời `Zalo OA` trên Header Desktop.
- **AC4 — Tinh gọn Bộ chuyển đổi Ngôn ngữ (Compact Switcher)**:
  - Nhãn hiển thị rút gọn thành định dạng biểu tượng + `VI | EN`.
  - Có đầy đủ thuộc tính A11y (`aria-label`, `title`).
- **AC5 — Tối ưu Responsive Mobile & Tablet (< 1200px)**:
  - Header bar mobile chỉ hiển thị Logo, nút gọi nhanh `☎` và nút Hamburger `☰`.
  - Mobile Drawer hiển thị đầy đủ CTA tư vấn, danh sách 3 hotline, Zalo OA và Language Switcher.
- **AC6 — Cách ly Đa site Tuyệt đối (Tenant Isolation)**:
  - Toàn bộ thay đổi chỉ áp dụng cho site `wings-group` có cờ `wingsGroupV3.enabled === true`.
  - Các site `wings-go`, `wing-side`, `wings-care`, `wings-pass`, `wings-plus` giữ nguyên 100% cấu trúc, tính năng và giao diện hiện hành.

---

## 8. Kết luận & Khuyến nghị Triển khai

1. **Vấn đề hoàn toàn do xung đột diện tích CSS Flexbox sau khi thêm hotline của US-081 và chữ tiếng Anh dài của US-082, không phải lỗi logic dữ liệu.**
2. **Phương án giải quyết tốt nhất là Phương án 3 (Hybrid Anchor):**
   - Giữ Hotline gọi nhanh 1 chạm.
   - Gộp Zalo OA vào nút CTA vàng (kích hoạt ConsultationDialog).
   - Rút gọn copy CTA và rút gọn nhãn ngôn ngữ sang `VI | EN`.
3. **Các bước tiếp theo:**
   - Tạo Story mới `US-085` trong Epic `E09`.
   - Áp dụng các thay đổi CSS và Nav layout trong một PR riêng biệt kèm component tests và Playwright visual regression.
   - Đồng bộ trạng thái lên Plane sau khi hoàn tất.

---
*Báo cáo được hoàn thành và bàn giao độc lập tại thư mục `header-contact-review-20261023/`.*
