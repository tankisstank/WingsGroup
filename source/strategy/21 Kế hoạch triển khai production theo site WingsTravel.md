# Kế hoạch triển khai production theo site WingsTravel

## 1. Mục đích tài liệu

Tài liệu này chuyển các kết luận chiến lược và research vòng 2 thành một kế hoạch triển khai production cụ thể theo thứ tự đã chốt:

1. `wingsgo.vn`
2. `wingside.vn`
3. `wingspass.wingsgroup.vn`
4. `wingsplus.vn`

Kế hoạch này bao gồm luôn:

- data migration từ Google Sheet/Docs
- content entry và UAT
- triển khai staging và production
- handover vận hành

Mục tiêu không phải chỉ là build kỹ thuật. Mục tiêu là từng site đủ nội dung thật để public launch độc lập ngay khi hoàn thành.

## 2. Nguồn chốt để lập kế hoạch

Kế hoạch này bám theo:

- `source/strategy/16 Phạm vi chức năng release giai đoạn 1 WingsTravel.md`
- `source/strategy/17 Bản chức năng gửi khách hàng WingsTravel.md`
- `source/strategy/18 Áp dụng Payload vào dự án WingsTravel.md`
- `source/strategy/19 Kiến trúc đề xuất nội bộ WingsTravel Payload.md`
- `source/strategy/20 Kiến trúc đề xuất gửi khách hàng WingsTravel.md`
- `source/notes/07 Research vong 2 VietWings/90-tong-hop-nhu-cau-va-huong-trien-khai.md`
- `source/notes/07 Research vong 2 VietWings/91-de-xuat-cac-trang-noi-dung-can-co.md`
- `source/notes/07 Research vong 2 VietWings/92-research-doi-thu-chuyen-sau-cong-nghe-seo-giao-dien.md`
- `source/notes/07 Research vong 2 VietWings/93-ui-principles-va-wireframe-dinh-huong-theo-site.md`

## 3. Quyết định đã chốt

### 3.1. Thứ tự triển khai

Thứ tự thực hiện production:

1. `wingsgo.vn`
2. `wingside.vn`
3. `wingspass.wingsgroup.vn`
4. `wingsplus.vn`

### 3.2. Production scope

Mỗi site phải đi hết vòng:

- feature implementation
- data migration / import-assisted setup
- content entry
- QA nội bộ
- UAT với đội vận hành
- staging deploy
- production deploy
- handover vận hành

### 3.3. Launch strategy

Mỗi site go-live độc lập ngay khi xong, không chờ đủ cả 4 site.

### 3.4. SEO host rule

Mỗi child site chạy domain riêng.

Điều đó kéo theo:

- `robots.txt` phải đúng theo host public của site đó
- `sitemap.xml` phải là sitemap index của chính host đó
- `pages-sitemap.xml` và `posts-sitemap.xml` phải xuất URL theo đúng domain của site
- không dùng một file robots/sitemap tĩnh mang host dùng chung cho toàn hệ ở production

### 3.5. Team vận hành thực tế

Các nhóm sử dụng thật:

- `Marketing`
- `Quản trị viên`
- `Content Manager`

### 3.6. Definition of done

Một site chỉ được coi là hoàn thành khi:

- đủ feature cần dùng
- đủ nội dung thật để public launch
- qua staging/UAT
- deploy production
- bàn giao được cho team vận hành

## 4. Giả định cần xác nhận thêm nhưng không chặn kế hoạch

Hiện mới chốt rõ:

- `wingsplus`: `vi`, `en`

Các site còn lại chưa được chốt tuyệt đối trong đầu vào hiện tại, nên kế hoạch tạm dùng giả định:

- `wingsgo`: `vi` trước, mở `en` ở phase kế tiếp hoặc khi đủ content
- `wingsside`: `en` trước, có thể thêm `vi` nếu cần lớp corporate/local support
- `wingspass`: `vi` trước

Nếu giả định này thay đổi, plan vẫn giữ nguyên cấu trúc, chỉ thay đổi effort của content entry, localization QA và routing.

## 5. Nguyên tắc triển khai production

### 5.1. Dùng một codebase, nhiều product packet

Không triển khai từng site như 4 dự án công nghệ hoàn toàn tách rời.

Triển khai đúng hơn là:

- một multisite platform dùng chung
- một nhóm foundation features
- sau đó các feature packet theo site

### 5.2. Ưu tiên reusable model trước, site-specific implementation sau

Ví dụ:

- `tourProducts`
- `tourDepartures`
- `tourCampaigns`
- `fastTrackPriceTables`
- `destinations`
- `markets`

phải được thiết kế đủ tốt để tái sử dụng, không hardcode cho một site duy nhất.

### 5.3. Nội dung thật là một phần của implementation

Với dự án này, content entry không phải việc hậu kỳ. Nó là một phần của release.

Nếu chỉ xong schema + UI mà chưa nhập đủ nội dung thật, site chưa được coi là hoàn thành.

### 5.4. Import-assisted ngay từ đầu

Không nên chờ đến cuối mới nghĩ tới import.

Ngay từ site đầu tiên cần có plan import-assisted cho:

- Google Sheets lịch khởi hành
- Google Docs chương trình tour
- poster/rate card làm visual hoặc reference entry

## 6. Kiến trúc feature theo chương trình triển khai

## 6.1. Nhóm foundation dùng chung cho toàn nền

Đây là các feature phải hoàn thành sớm vì 4 site cùng phụ thuộc.

### F0. Multisite production foundation

Mục tiêu:

- chốt `site registry`
- domain mapping thật
- môi trường staging/prod ổn định

Bao gồm:

- `sites`
- `siteSettings`
- domain mapping
- locale routing
- production env config
- staging/prod database plan
- Redis/cache strategy tối thiểu

Done khi:

- tạo được site record thật cho `wingsgo`, `wingside`, `wingspass.wingsgroup.vn`, `wingsplus`
- staging và production topology rõ
- local, staging, prod không dùng data model lệch nhau

### F1. Editorial governance and workflow

Mục tiêu:

- team `Marketing`, `Quản trị viên`, `Content Manager` dùng được CMS thật

Bao gồm:

- roles
- site scope
- draft / preview / publish
- audit of editorial flow
- page/tour ownership

Done khi:

- đúng role chỉ thấy đúng site
- content manager làm được entry + preview + publish trong scope

### F2. Shared content schema

Mục tiêu:

- mở rộng từ page CMS thành productized content platform

Bao gồm:

- `pages`
- `tourProducts`
- `tourDepartures`
- `tourCampaigns`
- `destinations`
- `markets`
- `airlines`
- `forms / inquiries`
- `media`

Done khi:

- schema đủ để nhập data thật cho `wingsgo` và `wingsside`
- schema không cần sửa cấu trúc lớn khi qua `wingspass` và `wingsplus`

### F3. Import-assisted tooling

Mục tiêu:

- giảm nhập tay
- giữ nhất quán dữ liệu từ nguồn hiện tại

Bao gồm:

- parser/import cho Google Sheet
- parser/import cho Google Docs
- import mapping rules
- import QA checklist

Done khi:

- import được ít nhất một đợt dữ liệu thực vào staging
- editor chỉ cần hiệu chỉnh thay vì nhập lại từ đầu

### F4. Production operations pack

Mục tiêu:

- mỗi site có đường đi từ staging đến production rõ ràng

Bao gồm:

- deploy checklist
- smoke test checklist
- monitoring/log basics
- backup/restore notes
- handover runbook

Done khi:

- mỗi site có checklist launch và rollback tối thiểu

## 7. Kế hoạch theo site

## 7.1. Site 1: `wingsgo.vn`

### Vai trò business

- site outbound retail
- site có doanh thu gần nhất
- site cần giá và lịch khởi hành rõ

### Objective

Ra mắt site outbound public đầu tiên với dữ liệu thật, đủ để user:

- duyệt thị trường
- xem chùm tour
- xem lịch khởi hành / giá
- mở tour detail
- gửi yêu cầu / giữ chỗ

### Feature packet

#### WG-01. IA và routing cho outbound

- homepage `wingsgo`
- market pages: `Hàn Quốc`, `Nhật Bản`, `Trung Quốc`
- campaign pages theo mùa
- tour detail pages
- lịch khởi hành / bảng giá
- contact / inquiry

#### WG-02. Tour product model

- `tourProducts`
- `tourDepartures`
- `departureVariants`
- airline mapping
- seasonal campaign relation

#### WG-03. Price-first UI components

- card tour có giá
- departure table
- market tabs
- campaign cards
- CTA giữ chỗ / tư vấn

#### WG-04. Import-assisted data migration

- import Google Sheet tour 2026
- map line tour Hàn/Nhật/Trung
- import hoặc bán tự động trích xuất từ Google Docs và poster vào draft records

#### WG-05. Content entry và editorial QA

- nhập đủ homepage content
- nhập đủ market page content
- nhập đủ tour detail content cho line chủ lực
- kiểm tra giá, ngày, hãng bay, title, CTA

#### WG-06. Launch readiness

- SEO cơ bản
- sitemap
- redirect / canonical
- mobile QA
- staging UAT
- production deploy
- handover

### Nội dung thật tối thiểu để launch

- 1 homepage hoàn chỉnh
- 3 market pages: Hàn, Nhật, Trung
- 2-4 campaign pages theo mùa
- 8-15 tour detail pages ưu tiên
- 1 trang lịch khởi hành / bảng giá
- 1 trang liên hệ

### Definition of done cho `wingsgo`

- public site chạy production
- có dữ liệu thật từ nguồn hiện tại
- giá/lịch khởi hành hiển thị được
- team nội bộ cập nhật được ít nhất 1 đợt dữ liệu sau launch

## 7.2. Site 2: `wingside.vn`

### Vai trò business

- site inbound
- thiên về trust, planning, inquiry
- khác interaction model hoàn toàn với outbound

### Objective

Ra mắt site inbound đủ tốt để:

- kể được offer của VietWings cho khách quốc tế
- cho user khám phá destination/travel style
- gửi inquiry tùy chỉnh

### Feature packet

#### WS-01. Inbound IA

- homepage inbound
- destination hub
- travel styles
- packages
- about/trust
- plan-your-trip
- contact
- travel guide

#### WS-02. Inbound content schema

- `destinations`
- `styles`
- `packages`
- inquiry form
- testimonial/trust blocks

#### WS-03. Consultative UI

- destination-led hero
- trust sections
- style cards
- curated sample packages
- plan-your-trip CTA

#### WS-04. Localization

- chuẩn bị `en` production first
- nếu có `vi`, chỉ rõ page nào có song ngữ
- QA route và locale fallback

#### WS-05. Content entry

- destination pages thật
- style pages thật
- about/trust thật
- contact/inquiry thật
- tối thiểu một batch guide content

#### WS-06. Launch and handover

- UAT với team vận hành
- test form inquiry
- staging/prod deploy
- handover content flow

### Nội dung thật tối thiểu để launch

- 1 homepage
- 4-6 destination pages
- 3-5 travel style pages
- 4-8 package/sample itinerary pages
- 1 plan-your-trip page
- 1 about page
- 1 contact page

### Definition of done cho `wingsside`

- site public đủ trust để nhận inquiry thật
- navigation và content không mang cảm giác outbound retail
- team nội bộ có thể thêm destination/package content mới sau launch

## 7.3. Site 3: `wingspass`

### Vai trò business

- site fast track / service pricing
- utility-first
- có tiềm năng bán độc lập và bán kèm package

### Objective

Ra mắt site service pricing rõ ràng để user:

- xem bảng giá
- hiểu dịch vụ theo sân bay
- xem add-on
- liên hệ đặt dịch vụ

### Feature packet

#### WP-01. Service IA

- homepage
- bảng giá
- page theo sân bay
- add-on
- FAQ
- contact

#### WP-02. Service pricing model

- `fastTrackServices`
- `fastTrackPriceTables`
- airport taxonomy
- service code
- group tier
- direction
- add-on mapping

#### WP-03. Pricing-first UI

- table component
- airport tabs
- add-on rows
- notes/conditions blocks

#### WP-04. Rate card migration

- chuyển rate card ảnh thành dữ liệu có cấu trúc
- QA giá theo sân bay và theo loại dịch vụ

#### WP-05. Content entry

- homepage thật
- bảng giá thật
- pages theo Nội Bài / Đà Nẵng / Phú Quốc / Tân Sơn Nhất
- FAQ thật
- contact thật

#### WP-06. Launch and handover

- UAT với team vận hành
- kiểm tra flow update giá
- deploy production
- bàn giao SOP cập nhật bảng giá

### Nội dung thật tối thiểu để launch

- 1 homepage
- 1 bảng giá master
- 4 page sân bay
- 1 page add-on
- 1 FAQ
- 1 contact page

### Definition of done cho `wingspass`

- user xem giá nhanh, không cần đọc lòng vòng
- team nội bộ chỉnh được giá và add-on mà không sửa code
- production site usable như một service microsite độc lập

## 7.4. Site 4: `wingsplus.vn`

### Vai trò business

- private tour
- MICE
- special market
- long-haul/high-ticket

### Objective

Ra mắt site high-value đủ để:

- thể hiện năng lực và positioning
- dẫn user vào luồng proposal/tư vấn
- dùng được cho private/group sales

### Feature packet

#### WL-01. IA cho private/MICE

- homepage
- private tours
- MICE
- special markets
- destination pages
- request proposal
- case studies / capability
- contact

#### WL-02. Product model cho high-ticket travel

- package/story pages
- departure variant nếu cần
- destination references
- proposal inquiry forms

#### WL-03. Premium UI system

- hero statement
- featured destinations
- capability grid
- story/case-study blocks
- proposal CTA

#### WL-04. Localization

- `vi`
- `en`
- QA bilingual navigation, metadata, page consistency

#### WL-05. Content entry

- private page thật
- MICE page thật
- 4-6 destination/highlight pages
- proposal page thật
- capability/about/trust content thật

#### WL-06. Launch and handover

- staging UAT
- bilingual QA
- production deploy
- handover proposal/content workflow

### Nội dung thật tối thiểu để launch

- 1 homepage
- 1 private tours page
- 1 MICE page
- 1 special markets page
- 4-6 destination pages
- 1 request proposal page
- 1 case study/capability page
- 1 contact page

### Definition of done cho `wingsplus`

- site đủ premium để không bị nhầm với outbound retail
- có đủ content song ngữ `vi/en`
- team nội bộ vận hành được proposal funnel cơ bản

## 8. Trục triển khai theo feature thay vì theo file

Để implement thực tế, nên bóc thành các initiative/feature như sau:

### Initiative A. Platform production foundation

- multisite registry
- production environment
- domain/locales
- roles and access
- deploy and observability

### Initiative B. Productized content core

- tour and departure schema
- destination/market schema
- forms and inquiries
- media governance
- import-assisted pipeline

### Initiative C. WingsGo launch

- IA
- UI
- migration
- content entry
- UAT
- deploy

### Initiative D. WingSide launch

- IA
- UI
- localization
- destination/package entry
- UAT
- deploy

### Initiative E. WingsPass launch

- pricing model
- pricing UI
- rate migration
- UAT
- deploy

### Initiative F. WingsPlus launch

- bilingual premium UI
- proposal flow
- high-ticket content entry
- UAT
- deploy

### Initiative G. Handover and operations

- site-specific handover packs
- SOP content updates
- SOP pricing updates
- launch checklist
- owner mapping

## 9. Trách nhiệm vận hành theo team

### Marketing

- campaign content
- landing content
- CTA optimization
- visual/banner updates

### Quản trị viên

- site settings
- roles
- publish approvals nếu cần
- domain/deploy coordination

### Content Manager

- nhập/sửa tour content
- nhập/sửa destination/package/service content
- kiểm tra preview
- duy trì lịch khởi hành / giá / FAQ

## 10. Mốc nghiệm thu production cho mỗi site

Mỗi site nên qua 5 cổng:

1. `Feature complete`
   - xong schema, UI, workflow
2. `Data loaded`
   - dữ liệu thật đã vào hệ
3. `Editorial ready`
   - team nội bộ thao tác được
4. `Staging approved`
   - QA/UAT pass
5. `Production live`
   - site public + handover xong

## 11. Rủi ro cần quản lý sớm

### R1. Data source không sạch

Google Sheet/Docs/poster hiện là nguồn thật nhưng không đồng nhất hoàn toàn.

Cần:

- mapping rules rõ
- import QA rõ
- ownership duyệt dữ liệu sau import

### R2. Localization effort bị đánh giá thấp

Đặc biệt với `wingsside` và `wingsplus`, bilingual content sẽ kéo effort lên rõ.

### R3. Không chốt content owners

Nếu không chốt ai chịu trách nhiệm duyệt nội dung thật, tiến độ launch sẽ nghẽn ở UAT/content entry.

### R4. Dùng page builder thay cho product model

Nếu lạm dụng page builder để chứa lịch khởi hành, bảng giá, rate card, về sau việc vận hành sẽ vỡ.

### R5. Launch site nhưng chưa có quy trình cập nhật sau launch

Site chỉ thật sự production-ready khi đội nội bộ tự cập nhật được đợt dữ liệu kế tiếp.

## 12. Kết luận triển khai

Kế hoạch đúng cho vòng production không phải là:

- làm xong một cục website rồi mới nghĩ đến dữ liệu và vận hành.

Kế hoạch đúng là:

- dựng foundation multisite production,
- mở schema sản phẩm đúng business,
- triển khai từng site theo thứ tự doanh thu và mức sẵn sàng dữ liệu,
- đưa dữ liệu thật vào ngay trong quá trình build,
- go-live từng site độc lập,
- và chỉ coi là done khi site public launch được cùng workflow vận hành thật.

Theo logic đó, thứ tự `wingsgo -> wingsside -> wingspass -> wingsplus` là hợp lý và đủ chắc để đi tới production.
