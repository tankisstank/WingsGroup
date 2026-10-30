# Phase 0 — Baseline US-093 (2026-10-30)

Mọi phép đo ở đây đều chỉ đọc. Không ghi DB, không gửi lead.

## 1. Production công khai (GET `https://wingsgo.vn`, khoảng 09:00 ICT)

| Trang | HTTP | HTML (byte) | Flight payload trong HTML (byte) | Link `/tour/<slug>` duy nhất |
|---|---|---|---|---|
| `/lich-khoi-hanh` | 200 | 779.519 | 381.106 | 44 |
| `/en/lich-khoi-hanh` | 200 | 690.261 | (chưa tách) | 44 |

Dữ liệu đợt trích từ Flight payload của `/lich-khoi-hanh`:

- 180 lần xuất hiện `departureDate`, **100% dạng `T00:00:00.000Z`**. Kết quả này khớp audit production 323/323 của US-092.
- Currency: **100% VND**. Quy tắc sắp giá theo VND trước, USD sau vẫn giữ để phòng dữ liệu sau này.
- 21 cách viết `airline` (giữ nguyên khoảng trắng). Đây là **fixture bắt buộc** cho test `normalizeScheduleAirline`:

| Chuỗi gốc | Số lần | Kỳ vọng chuẩn hoá |
|---|---|---|
| `'VIETNAM AIRLINES (VN)'` | 68 | VN — Vietnam Airlines |
| `' Emirates 5*'` | 21 | EK — Emirates |
| `'VIETNAM AIRLINES (VNA)'` | 15 | VN |
| `'AIR CHINA (CA)'` | 10 | CA — Air China |
| `'Parata Air (WE)'` | 8 | WE — Parata Air |
| `'Vietjet'` | 7 | VJ — Vietjet Air |
| `'VIETJET AIR (VJ) '` | 7 | VJ |
| `'VIETJET AIR (VJ)'` | 6 | VJ |
| `'AIR CHINA '` | 6 | CA |
| `'Vietnam Airlines'` | 5 | VN |
| `'VIETTRAVEL AIRLINES (VU)'` | 4 | VU — Vietravel Airlines (viết sai "VIETTRAVEL", nhận diện được nhờ mã `(VU)`) |
| `'VIETNAM AIRLINES '` | 4 | VN |
| `'Vietjet (về chuyến 06h25)'` | 4 | VJ |
| `'Vietnam Airline'` | 4 | VN (thiếu "s") |
| `'SUN PHUQUOC AIRWAYS (9G)'` | 3 | 9G — Sun PhuQuoc Airways |
| `'Vietnam Airlines '` | 2 | VN |
| `'"'` (chỉ một dấu nháy kép) | 2 | Rỗng sau khi bỏ dấu nháy → `null`, không hiện hãng |
| `'Jeju Air'` | 1 | 7C — Jeju Air |
| `'ALL NIPPON AIRWAYS (NH)'` | 1 | NH — All Nippon Airways |
| `'Turkish Airlines (TK)'` | 1 | TK — Turkish Airlines |
| `'THAI AIRASIA (FD)'` | 1 | FD — Thai AirAsia |

Kết quả mong đợi là 11 hãng: VN, VJ, CA, EK, WE, VU, 9G, 7C, NH, TK, FD.

Hai tham chiếu từ dữ liệu public nhúng trong prototype (177 đợt, 43 tour), **chỉ dùng để thiết kế/test**:

- Các tên tour dùng làm fixture cho `getTourRouteTitle`: `Thái Lan 5N4Đ`, `Đài Loan 5N4Đ`, `Nagoya – Kyoto – Làng Cổ Shirakawa-go – Matsumoto – Fuji Mt. – Tokyo`, `BTS World Tour ‘Arirang’ In Kaohsiung, Taiwan`, `Bắc Kinh – Vạn Lý Trường Thành – Cố Cung · No Shop`, `Đón Tết Đinh Mùi Tại Nhật Bản 2027: Nagoya – … – Ngắm Hoa Anh Đào Nở Sớm`, `Hongkong – Disneyland – Cửu Long Thành Trại`.
- Có 126/177 đợt không có giá (giá 0). Đây là nguồn gốc dòng "giá từ Liên hệ" ở hero cũ.

## 2. DB local (`app/payload-tourplatform.db`, bản copy ngày 2026-10-23, `mode=ro`)

DB local là tập dữ liệu nhỏ, **không đại diện cho production**:

- **Số đợt:**
  - `wings-go`: 39 đợt published, đều trong tương lai (2027-05-20 → 2027-12-17).
  - `wing-side`: 125 đợt, đều là draft.
- **Dạng dữ liệu của 39 đợt WingsGo:** 100% `T00:00:00.000Z`, 100% VND. Không đợt nào có giá 0 hoặc null.
- **Tình trạng chỗ:** 28 `open`, 11 `limited`, 0 `sold-out`.
- **Ngày về và xác minh:** 17/39 đợt có `return_date`; 0/39 đợt có `verified_at`. Vì vậy dòng "Cập nhật" sẽ ẩn trên local.
- **Hãng bay (locale vi):** `Vietnam Airlines`, `Air China`, `Vietjet Air`, `Vietjet`, `Jeju Air`, và 5 đợt không có hãng. Locale `en` toàn null.
- **Nơi đi (locale vi):** `TP.HCM / Hà Nội` (11), `TP.HCM` (4), `Hà Nội` (2), null (22). Như vậy thành phố **không** đồng nhất giữa các đợt, nên câu mô tả ở hero không nêu thành phố.
- **Nhãn tuỳ chỉnh:** 17 bản ghi locale có promo, urgency, `availabilityBadge` hoặc `ctaLabelOverride`.

**Hệ quả cho test:**

- Không thể tái hiện >200 đợt, đợt sold-out hay dữ liệu thiếu giá trên DB local. Các trường hợp này phải có fixture riêng ở unit và integration test.
- Muốn thử trên trình duyệt (Phase 5) cần seed thêm dữ liệu local bằng script **chỉ chạy trên DB copy của worktree**, ví dụ đổi một đợt sang sold-out hoặc xoá giá. Không động vào DB của repo chính hay production.

## 3. Môi trường worktree

- `pnpm install --frozen-lockfile` chạy xong trong 1 phút 15 giây (pnpm 10.34.7).
- `.env` và `payload-tourplatform.db` được copy từ `E:\repo\WingsTravel\app`. Cả hai file đều nằm trong gitignore.

## 4. Baseline test

Đã chạy trong worktree tại HEAD `58cbd24`:

| Lệnh | Kết quả |
|---|---|
| `pnpm run test:unit` | Exit 1, **1375/1376** pass. Lỗi duy nhất là `wingsGroupV3Shell.unit.spec.ts` ("keeps public WingsGroup routes free of the theme selector…"), đã có từ US-092 |
| `pnpm run test:component` | Exit 0, **422/422** pass (63 file) |
| `pnpm run lint` | Exit 0 |

Sau khi chạy, 4 file snapshot và `app/src/payload-types.ts` bị ghi lại, chỉ khác line-ending. Đã hoàn tác bằng `git checkout`.
