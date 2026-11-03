import 'dotenv/config'

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(appRoot, '..')
const manifestPath = path.join(repoRoot, 'docs', 'plane', 'manifest.json')
const storyRoot = path.join(repoRoot, 'docs', 'stories')

const EXTERNAL_SOURCE = 'wingstravel-plane-import'
const action = process.argv[2] || 'preview'
const storyIdFilter = new Set(
  String(process.env.PLANE_STORY_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)

const planeConfig = {
  apiKey: process.env.PLANE_API_KEY || '',
  workspaceSlug: process.env.PLANE_WORKSPACE_SLUG || '',
  baseUrl: (process.env.PLANE_BASE_URL || 'https://api.plane.so').replace(/\/$/, ''),
}

const INITIATIVE_TEXT = {
  currentName: 'WingsGroup CMS Platform',
  name: 'Nền tảng CMS WingsGroup',
  description:
    'Chương trình CMS đa site cho WingsGroup, bao gồm nền tảng dùng chung và các site con phục vụ giai đoạn 1.',
}

const PROJECT_TEXT = {
  WGCORE: {
    name: 'Nền tảng lõi WingsGroup',
    description:
      'Nền tảng dùng chung cho CMS đa site, đa ngôn ngữ, page builder, giao diện quản trị, theme, SEO và hạ tầng.',
  },
  WTRAVEL: {
    name: 'WingsTravel',
    description: 'Site umbrella của WingsTravel và các deliverable riêng cho giai đoạn 1.',
  },
  WGO: {
    name: 'WingsGo',
    description:
      'Site WingsGo với nội dung, campaign, tour và các deliverable public của giai đoạn 1.',
  },
  WSIDE: {
    name: 'WingSide',
    description: 'Site WingSide trong hệ sinh thái WingsGroup.',
  },
  WPLUS: {
    name: 'WingsPlus',
    description: 'Site WingsPlus trong hệ sinh thái WingsGroup.',
  },
  WCARE: {
    name: 'WingsCare',
    description: 'Site WingsCare trong hệ sinh thái WingsGroup.',
  },
  WPASS: {
    name: 'WingsPass',
    description: 'Site WingsPass trong hệ sinh thái WingsGroup.',
  },
}

const STATE_NAME_MAP = {
  Backlog: 'Kế hoạch',
  Planned: 'Đã lên kế hoạch',
  Todo: 'Tiếp nhận',
  Intake: 'Tiếp nhận',
  'In Progress': 'Đang thực hiện',
  'In Review': 'Đang rà soát',
  'Validation Pending': 'Chờ xác nhận',
  Blocked: 'Tắc nghẽn',
  Done: 'Hoàn tất',
  Delivered: 'Đã bàn giao',
  Cancelled: 'Đã hủy',
}

const MODULE_NAME_MAP = {
  'Multisite Core': 'Lõi đa site',
  'Sites & Site Settings': 'Site và cấu hình site',
  'Pages & Landing Pages': 'Trang và landing page',
  'Posts & Content': 'Bài viết và nội dung',
  'Tours & Services': 'Tour và dịch vụ',
  Media: 'Thư viện media',
  Localization: 'Đa ngôn ngữ',
  'SEO & Metadata': 'SEO và metadata',
  'CMS Admin UX': 'Trải nghiệm quản trị CMS',
  'Access Control': 'Phân quyền truy cập',
  'Theme & Branding': 'Giao diện và nhận diện thương hiệu',
  'Go-live Review': 'Rà soát phát hành',
  Infrastructure: 'Hạ tầng',
}

const EPIC_TYPE_NAME = 'Epic'

const MILESTONE_NAME_MAP = {
  'Foundation Ready': 'Sẵn sàng nền tảng',
  'CMS Internal Review': 'Rà soát nội bộ CMS',
  'Client UAT': 'UAT khách hàng',
  'First Site Go-live': 'Phát hành site đầu tiên',
  'Post-launch Stabilization': 'Ổn định sau phát hành',
}

const PROPERTY_TEXT = {
  'Story ID': {
    name: 'Mã story',
    description: 'Mã story nội bộ trong repo.',
    options: {},
  },
  Epic: {
    name: 'Epic',
    description: 'Epic hoặc initiative chứa story.',
    options: {},
  },
  Site: {
    name: 'Site',
    description: 'Phân loại theo site hoặc phần lõi dùng chung.',
    options: {
      Core: 'Lõi',
      WingsTravel: 'WingsTravel',
      WingsGo: 'WingsGo',
      WingSide: 'WingSide',
      WingsPlus: 'WingsPlus',
      WingsCare: 'WingsCare',
      WingsPass: 'WingsPass',
    },
  },
  Phase: {
    name: 'Giai đoạn',
    description: 'Giai đoạn delivery.',
    options: {
      'Phase 1': 'Giai đoạn 1',
      'Phase 2': 'Giai đoạn 2',
    },
  },
  Workstream: {
    name: 'Nhóm công việc',
    description: 'Nhóm công việc chính.',
    options: {
      CMS: 'CMS',
      SEO: 'SEO',
      Tours: 'Tour',
      Platform: 'Nền tảng',
      Content: 'Nội dung',
      Docs: 'Tài liệu',
    },
  },
  'Proof Status': {
    name: 'Trạng thái bằng chứng',
    description: 'Mức độ đầy đủ của bằng chứng hiện tại.',
    options: {
      Full: 'Đầy đủ',
      Partial: 'Một phần',
      Pending: 'Chờ bổ sung',
    },
  },
  'Source Link': {
    name: 'Liên kết nguồn',
    description: 'Đường dẫn tài liệu nội bộ trong repo.',
    options: {},
  },
  'Customer Visible': {
    name: 'Hiển thị khách hàng',
    description: 'Đánh dấu item có hiển thị cho khách hàng hay không.',
    options: {
      Yes: 'Có',
      No: 'Không',
    },
  },
}

const PAGE_NAME_MAP = {
  '01. Tong quan du an WingsGroup CMS': '01. Tổng quan dự án WingsGroup CMS',
  '02. Pham vi Phase 1': '02. Phạm vi giai đoạn 1',
  '03. Tien do va moc ban giao': '03. Tiến độ và mốc bàn giao',
  '04. Huong dan su dung CMS': '04. Hướng dẫn sử dụng CMS',
  '05. Quy trinh cap nhat noi dung': '05. Quy trình cập nhật nội dung',
  '06. Quy trinh review preview publish': '06. Quy trình review, preview và publish',
  '07. Cach gui yeu cau thay doi': '07. Cách gửi yêu cầu thay đổi',
  '08. FAQ': '08. FAQ',
}

const STORY_TITLE_MAP = {
  'US-044': 'Nhập và phát hành catalog tour WingsGo',
  'US-003': 'Đăng ký site và cấu hình',
  'US-004': 'Đa ngôn ngữ và định tuyến theo site',
  'US-005': 'Trình biên soạn trang và landing page',
  'US-006': 'Quyền biên tập theo phạm vi site',
  'US-007': 'Sẵn sàng phát hành site đầu tiên',
  'US-008': 'Metadata, canonical và sitemap nền tảng',
  'US-009': 'Dữ liệu có cấu trúc và nghiên cứu SEO cho tác nhân AI',
  'US-010': 'Breadcrumb, liên kết nội bộ và trường SEO',
  'US-011': 'Nền tảng giao diện đa site',
  'US-012': 'Bảng điều hành quản trị CMS',
  'US-013': 'Gia cố bảng điều hành vận hành CMS',
  'US-014': 'Cấu hình giao diện đa site do CMS quản lý',
  'US-015': 'Hệ thống trình bày hero mô-đun',
  'US-016': 'Thư viện bố cục mẫu trong CMS',
  'US-017': 'Phân giải giao diện theo tên miền thật',
  'US-018': 'Rà soát site trong CMS',
  'US-019': 'Quy trình rà soát trước phát hành',
  'US-020': 'Nền tảng trình bày hero trong CMS',
  'US-021': 'Trải nghiệm quyết định hero và giao diện trong CMS',
  'US-022': 'Vỏ giao diện theme cho backend CMS',
  'US-023': 'Mô hình sản phẩm tour',
  'US-024': 'Trình dựng chi tiết tour',
  'US-025': 'Chốt kiểm tra migration PostgreSQL',
  'US-035': 'Mô hình biến thể khởi hành',
  'US-036': 'Nền tảng biên tập tour',
  'US-037': 'Trải nghiệm chi tiết tour dày thông tin',
  'US-038': 'Lịch khởi hành hướng browse và chuyển đổi',
  'US-039': 'Tài liệu nền tảng tour và mapping import',
  'US-026': 'Rà soát inbound WingSide và thiết lập story',
  'US-027': 'Nền tảng giao diện inbound WingSide',
  'US-028': 'Các primitive chuyển động',
  'US-029': 'Hero inbound và preset tìm kiếm',
  'US-030': 'Block Page Composer cho inbound',
  'US-031': 'Mở rộng hạ tầng locale',
  'US-032': 'Header inbound, mega menu và chuyển ngôn ngữ',
  'US-033': 'Seed nội dung và media WingSide',
  'US-034': 'Bằng chứng sẵn sàng phát hành WingSide',
  'US-049': 'Phân loại taxonomy tour WingSide',
  'US-061': 'Nền tảng contract, media và fidelity WingsGroup v3',
  'US-062': 'Fidelity homepage và UX tư vấn responsive',
  'US-063': 'Quản trị publication, brand, proof và editorial gate',
  'US-064': 'Consent lead-intake và consultation fallback',
  'US-065': 'Corporate routes, legal/locale và publication governance',
  'US-066': 'PostgreSQL, cross-tenant và go-live readiness',
  'US-072': 'Bộ logo năm thương hiệu và căn top header WingsGroup',
  'US-074': 'Khắc phục UX quản trị CMS và go-live đa site',
}

const CHILD_TASK_TEXT = {
  'US-086': {
    5: {
      title: 'Tối ưu tốc độ tải, ảnh và kiểm chứng sau phát hành.',
      description: [
        'AC6 bao gồm tối ưu hiện tại và ngăn tái phát trong CMS. Đặc tả nguồn: source/strategy/us086-ac6-media-20261024/AC6.md; giải pháp: CMS-DESIGN.md; vận hành: OPERATIONS.md; phản biện: review-resolution.md cùng thư mục.',
        'AC6.1–3: freeze sáu cấu hình x ba lượt theo baseline18 Lighthouse; Go dùng biến thể/srcset/sizes đúng slot/DPR và width thật; Group không tải kép JPEG/AVIF, không high-priority dưới fold, không dùng output1440px cho yêu cầu640; xử lý CLS ecosystem và JS/TTFB còn chậm.',
        'AC6.4: poster trong HTML đầu, không URL video tải được trước gate DOM/poster/visible/idle; một nguồn active, fallback reduced-motion/SaveData/play error, keyboard/pause; MIME video/mp4 và GET200/range206/416/seek thực tại origin và CDN. Dùng MP4 chuẩn bị sẵn nếu chưa có encoder, không hứa tự transcode.',
        'AC6.5–6: CMS tự tạo/kiểm bản web khi upload/replace. QUYẾT ĐỊNH USER: mọi ảnh editor upload vào WingsGo đều public-on-upload; original và derivative không cần duyệt/publish/rights riêng hoặc trang tham chiếu, không thêm private/draft schema; readiness không cản public ảnh gốc. Giữ site ownership và EXACT sáu size/rights/publication của Group. G-Async đo upload ARM trước; đủ thì giữ sync, vẫn test concurrent replace/crash recovery. Nếu chọn jobs mới cần runner/resource cap, conditional commit nguyên tử theo revision/quyền, chống stale worker/retry/disk-full.',
        'AC6.7–8: phục vụ ảnhGo theo policy public-on-upload của user; original/derivative theo parent/site. Private/draft/publication chỉ áp tenant có mô hình đó như Group, không áp gate mới cho ảnhGo. Chống cross-site/forged header; cache/revalidate/revoke theo loại media và quyền đã chốt. Backfill dry-run/canary/resume giữ nguồn/mediaID/quan hệ/alt/rights; rollback có mục tiêu, không restore DB mất lead. Shared changes smoke sáu tenant.',
        'AC6.9: mục tiêu lab đề xuất để chốt trước code: LCP median≤2,5s; CLS từng lượt≤0,1; TBT median mobile≤200ms/desktop≤150ms; critical transfer mobile≤2MiB. Ba lượt sạch mỗi cấu hình, công bố median/range/warnings và byte cửa sổ5/10s; timeout là finding, không bỏ lượt chậm. Field CWV chưa có=N/A, TBT không thay INP.',
        'Budget file: thumb≤50KiB/card≤150KiB/hero-poster≤250KiB, MP4 web mobile≤3MiB/desktop≤5MiB; ngoại lệ chất lượng theo media revision/slot/người duyệt, không miễn gate trang. AC6.10: upload/replace/publish staging thật, tests phù hợp, release review và production evidence mới; thiếu gate còn mởAC6. Intake162: production8278868 phát hành21:29ICT ngày2026-10-25; ARM64 CMS canary trên DB riêng,28unit+42component, backup/restore6sites và public9request gate đạt. Retest172URL,40ảnh ghép mẫu;18LH cùng baseline exit0, warning0/HTTPerror0. Group mẫu ảnh giảm40,995%; Go legacy0%. Go home LCP mobile giảm66,2%, desktop49,1%; Group mobile chậm24,6%, Go listing chậm17,5%; TBT/CLS/page gates chưa đạt đầy đủ. Legacy450Go/13Group và MP4 khoảng11MiB còn mở. Báo cáo us086-production-20261025/REPORT.md; Claude final review ở us086-ac6-implementation-20261024/claude-review/final-review.md. Whole-USproof0, AC6 in_progress; AC1–5 chưa bắt đầu, lịch đề xuất đến2026-11-06.',
        'Tham vấn Claude Code qua herdr, claude --dangerously-skip-permissions: source/strategy/us086-ac6-media-20261024/claude-review/result.md và resolution.md. Đồng ý P2 nhưng thu gọn: reuse derivatives/renderer trước, chưa ép worker/schema mới; Group legacy1440 inventory, Go TTFB/Group long tasks và protocol video cần proof. Media gate/page gate theo dõi riêng, không nới ngưỡng hoặc tự chấp nhận finding đã fix.',
      ].join('\n\n'),
    },
  },
  'US-071': [
    {
      title: 'Canonicalize English WingsGroup routes',
      description:
        'Use canonical route identity for English home and approved corporate routes while preserving the raw pathname for attribution and analytics.',
    },
    {
      title: 'Restore V3 header and footer contract',
      description:
        'Expose one consultation CTA, the approved WingsGroup footer identity and links, and no generic ThemeSelector or duplicate responsive controls.',
    },
    {
      title: 'Keep English breadcrumb context',
      description:
        'Hide the unwanted home breadcrumb on the English home route and retain the correct contextual breadcrumb on English subpages.',
    },
    {
      title: 'Pass locale through V3 blocks',
      description:
        'Forward locale and required identity props through Trust, Capability and other locale-sensitive WingsGroup v3 blocks.',
    },
    {
      title: 'Verify English service capability Hero',
      description:
        'Strictly scope the service-capability page to WingsGroup and locale en, with approved English Hero copy or fail-closed behavior.',
    },
    {
      title: 'Run Vietnamese and browser regressions',
      description:
        'Keep Vietnamese routes, child sites and fail-closed governance behavior passing the required unit, integration and browser checks.',
    },
  ],
  'US-072': [
    {
      title: 'Chốt contract năm brand ecosystem',
      description:
        'Xác nhận năm identity WingsGo, WingSide, WingsPass, WingsPlus và WingsCare cùng surface, variant, owner và nguồn artwork.',
    },
    {
      title: 'Tạo bộ primary reverse compact',
      description:
        'Tạo export primary, reverse và compact/mark cho từng brand với canvas gọn, clear-space, dimensions, checksum và alt text.',
    },
    {
      title: 'Nối logo theo surface và site scope',
      description:
        'Logo resolver phải chọn đúng surface/variant, giữ fallback tenant-safe và fail-closed khi thiếu hoặc chưa duyệt asset.',
    },
    {
      title: 'Gia cố kích thước logo header WingsGroup',
      description:
        'Parent header dùng lockup phù hợp, dễ đọc trong shell 76px và không va chạm nav tại desktop/mobile breakpoints.',
    },
    {
      title: 'Căn top năm section headers',
      description:
        'Neo eyebrow, heading, mô tả và action của journey, testimonials, proof, news và about lên cùng top anchor desktop.',
    },
    {
      title: 'Chạy regressions visual và accessibility',
      description:
        'Chạy unit/component/type/lint/build và agent-browser hoặc E2E ở 390/768/1024/1440px, lưu screenshot và console/overflow proof.',
    },
  ],
  'US-074': [
    {
      title: 'Sửa responsive admin và list presentation',
      description:
        'Sửa mobile shell, topbar, search, pagination và date/time; chứng minh không có blank, overlap hoặc overflow ở các viewport bắt buộc.',
    },
    {
      title: 'Gia cố preview và domain WingsGo',
      description:
        'Dùng preview origin allowlist/signed handoff và cập nhật exact-scope canonical, proxy host sau DNS approval; không thay đổi user/account.',
    },
    {
      title: 'Đồng bộ locale và nhãn quản trị',
      description:
        'Áp dụng compact control, no-duplicate locale code, missing-title fallback và Việt hóa nhãn nguồn cho các luồng chính.',
    },
    {
      title: 'Làm đầy đủ impact và site context',
      description:
        'Phân biệt full page total với subset trong Theme Manager và giữ server-side site scope khi thêm context/switcher.',
    },
    {
      title: 'Cải thiện tour, Wizard và lead triage',
      description:
        'Thêm itinerary collapse, create-another an toàn và triage status/assignee/note bounded; deliveryStatus vẫn là trạng thái kỹ thuật.',
    },
    {
      title: 'Chạy validation và rollout an toàn',
      description:
        'Chạy full test/visual/security/migration proof, canary, after-state và rollback; không có account mutation trong mọi bước.',
    },
  ],
  'US-003': [
    {
      title: 'Xây dựng bản ghi site đầy đủ định danh',
      description:
        'Site record cần lưu được identity, domain, locale support và trạng thái active để làm nền cho multisite.',
    },
    {
      title: 'Tách cấu hình thương hiệu, SEO, navigation và contact theo site',
      description:
        'Site settings phải là nơi quản trị brand, SEO, navigation và dữ liệu liên hệ dùng chung cho từng site.',
    },
    {
      title: 'Resolve đúng site context cho public và admin',
      description:
        'Public rendering và admin behavior phải xác định đúng ngữ cảnh site trước khi render hoặc thao tác dữ liệu.',
    },
  ],
  'US-004': [
    {
      title: 'Khởi tạo locale tiếng Việt và tiếng Anh',
      description:
        'Nền tảng bắt đầu với hai locale chính là tiếng Việt và tiếng Anh để phục vụ phase 1.',
    },
    {
      title: 'Cho phép chuyển locale khi biên tập trong CMS',
      description: 'Editor có thể chuyển locale trong CMS khi cập nhật nội dung đa ngôn ngữ.',
    },
    {
      title: 'Render route và metadata đúng locale, đúng site',
      description:
        'Public route và metadata cần phản ánh đúng locale và site context của trang đang được xem.',
    },
  ],
  'US-005': [
    {
      title: 'Quản trị trang marketing bằng structured content',
      description:
        'Các trang marketing lõi được quản lý từ dữ liệu có cấu trúc trong Payload thay vì hardcode.',
    },
    {
      title: 'Tạo pattern landing page tái sử dụng',
      description:
        'Ít nhất một mẫu landing page có thể tái sử dụng cho campaign hoặc biến thể theo thị trường.',
    },
    {
      title: 'Cho phép editor chỉnh hero, CTA và section chuẩn',
      description:
        'Editor có thể chỉnh hero, CTA và các section hỗ trợ trong trường hợp chuẩn mà không cần thay code.',
    },
  ],
  'US-006': [
    {
      title: 'Cho phép super-admin quản lý toàn bộ site',
      description: 'Super-admin có quyền quản trị toàn bộ site và dữ liệu liên quan.',
    },
    {
      title: 'Giới hạn site-manager theo site được phân công',
      description:
        'Site-manager chỉ được xem và thao tác trên các site nằm trong phạm vi phân công.',
    },
    {
      title: 'Giới hạn editor theo site và phạm vi biên tập',
      description: 'Editor chỉ thao tác trong site được giao và trong phạm vi editorial phù hợp.',
    },
    {
      title: 'Khóa field nhạy cảm cho role có quyền thấp',
      description:
        'Các trường nhạy cảm chỉ mở cho role có quyền cao hơn để tránh sửa sai cấu hình hệ thống.',
    },
  ],
  'US-007': [
    {
      title: 'Deploy site đầu tiên với branding và SEO riêng',
      description: 'Site public đầu tiên cần có nhận diện thương hiệu và SEO default theo site.',
    },
    {
      title: 'Đảm bảo core pages ổn định trên mobile và desktop',
      description:
        'Các trang lõi phải hiển thị ổn trên mobile và desktop, không có lỗi layout nghiêm trọng.',
    },
    {
      title: 'Hoàn tất luồng cập nhật nội dung từ CMS',
      description: 'Các cập nhật nội dung thuộc core flow có thể thực hiện trực tiếp từ CMS.',
    },
    {
      title: 'Giữ proof phase 1 độc lập với CRM, payment và AI',
      description: 'Bằng chứng phase 1 không phụ thuộc vào CRM, thanh toán hoặc tính năng AI.',
    },
  ],
  'US-008': [
    {
      title: 'Sinh metadata ổn định cho route quan trọng',
      description:
        'Các route launch-critical cần có title, description, canonical và sharing image metadata ổn định.',
    },
    {
      title: 'Tránh trùng canonical giữa site và locale',
      description: 'Canonical URL không được va chạm giữa các site hoặc locale khác nhau.',
    },
    {
      title: 'Đảm bảo sitemap bao phủ route cần phát hành',
      description: 'Các sitemap hiện có cần bao phủ tập route launch-critical được chọn.',
    },
    {
      title: 'Giữ metadata nhận biết theo site và locale',
      description: 'Logic metadata phải tiếp tục phân biệt đúng site và locale khi render.',
    },
  ],
  'US-009': [
    {
      title: 'Chốt loại structured data dùng trong phase 1',
      description: 'Dự án cần ghi nhận rõ các loại structured data được áp dụng trong phase 1.',
    },
    {
      title: 'Tạo hướng triển khai JSON-LD tái sử dụng',
      description:
        'JSON-LD cần có cách triển khai dùng lại được, tránh markup ad hoc theo từng page.',
    },
    {
      title: 'Áp dụng markup cho page type đại diện',
      description: 'Bộ markup đã chọn cần được áp dụng cho các loại trang đại diện phù hợp.',
    },
    {
      title: 'Ghi lại research và quyết định triển khai vào docs',
      description:
        'Research note và lựa chọn triển khai phải được cập nhật lại vào tài liệu bền vững.',
    },
  ],
  'US-010': [
    {
      title: 'Tạo hierarchy hỗ trợ breadcrumb',
      description: 'Cần có hierarchy phục vụ breadcrumb tại những route có cấu trúc phù hợp.',
    },
    {
      title: 'Bổ sung internal links cho trang quan trọng',
      description:
        'Các trang launch-critical không được bị orphan khỏi hệ thống liên kết nội bộ có ý nghĩa.',
    },
    {
      title: 'Mở các field SEO tối thiểu trong Payload',
      description:
        'Payload collections cần có trường tối thiểu để quản trị SEO ổn định cho các page type đã chọn.',
    },
    {
      title: 'Giữ field mới nhận biết theo site và locale',
      description: 'Các field mới phải giữ đúng phạm vi site và locale khi cần.',
    },
  ],
  'US-011': [
    {
      title: 'Thiết lập theme foundation cho public experience',
      description:
        'Public experience dùng nền tảng theme có tài liệu cho màu sắc, typography, spacing, CTA và shared chrome.',
    },
    {
      title: 'Cho phép override brand theo site',
      description: 'Brand override theo site có thể áp dụng mà không phá design system dùng chung.',
    },
    {
      title: 'Giữ semantic HTML và section pattern tái sử dụng',
      description:
        'Theme work không được làm mất semantic HTML hoặc phá các section pattern có thể dùng lại.',
    },
    {
      title: 'Tài liệu hóa theme rules để handover',
      description: 'Các rule theme đã bàn giao cần được ghi lại để mở rộng và handover sau này.',
    },
  ],
  'US-012': [
    {
      title: 'Thay dashboard và login copy mặc định bằng hướng dẫn WingsTravel',
      description:
        'Dashboard và login copy mặc định của template được thay bằng hướng dẫn quản trị phù hợp WingsTravel.',
    },
    {
      title: 'Hiển thị shortcut và status card theo role',
      description:
        'Super-admin, site-manager và editor nhìn thấy shortcut và status card phù hợp vai trò.',
    },
    {
      title: 'Hiển thị context site được phân công cho user scoped',
      description:
        'User bị giới hạn theo site thấy context site và link tới pages, posts, media, forms, settings, preview liên quan.',
    },
    {
      title: 'Giữ đầy đủ capability phase 1 trong Payload',
      description:
        'Các capability phase 1 vẫn đi qua collections, globals, plugins và custom admin components mà không bypass access rules.',
    },
    {
      title: 'Giới hạn plugin bổ sung trong ranh giới Payload-first',
      description:
        'Plugin public chỉ phục vụ content governance, import/export hoặc editorial quality phù hợp phase 1.',
    },
    {
      title: 'Không thêm booking, payment, CRM, automation hoặc analytics nâng cao',
      description:
        'Story này không mở rộng sang booking, payment, CRM pipeline, automation workflow hoặc advanced analytics dashboard.',
    },
  ],
  'US-015': [
    {
      title: 'Cung cấp bốn presentation key từ một registry',
      description: 'Có bốn presentation key built-in được quản lý từ một registry thống nhất.',
    },
    {
      title: 'Giới hạn chọn presentation cho hero quan trọng',
      description: 'Payload CMS chỉ expose lựa chọn presentation cho các hero có tác động cao.',
    },
    {
      title: 'Hỗ trợ tối đa ba media phụ trợ cho layered visual',
      description: 'Layered visuals hỗ trợ tối đa ba media record phụ trợ tùy chọn.',
    },
    {
      title: 'Giữ fallback ổn định cho legacy records',
      description: 'Record cũ không có presentation vẫn render qua fallback ổn định.',
    },
    {
      title: 'Không để presentation component phụ thuộc site code hoặc route',
      description: 'Presentation components không tự inspect site code, hostname hoặc pathname.',
    },
    {
      title: 'Expose data attributes cho presentation và business variant',
      description:
        'Public markup cần có data attributes thể hiện presentation và business variant.',
    },
  ],
  'US-018': [
    {
      title: 'Tạo custom view /admin/site-review trong CMS',
      description:
        'CMS cần có custom view /admin/site-review, được link từ admin navigation và operator console.',
    },
    {
      title: 'Nhóm page/post theo site và preview URL trong iframe',
      description:
        'View site review nhóm page và post theo site, đồng thời preview URL được chọn trong iframe.',
    },
    {
      title: 'Mở edit action về route edit native của Payload',
      description:
        'Mỗi page hoặc post có action Edit mở đúng route edit native của Payload cho document đó.',
    },
    {
      title: 'Áp dụng access control hiện có khi hiển thị document',
      description:
        'Visibility của site và document phải dùng Payload access control hiện có với overrideAccess false.',
    },
  ],
  'US-019': [
    {
      title: 'Tạo command go-live review trong repo',
      description:
        'Repo có command local để chạy go-live review với app WingsTravel đang chạy local hoặc preview.',
    },
    {
      title: 'Cho phép review toàn bộ site hoặc path cụ thể',
      description: 'Command có thể review tất cả site hoặc tập trung vào một site/path cụ thể.',
    },
    {
      title: 'Sinh screenshot desktop và mobile trong report',
      description: 'Report cần có screenshot desktop và mobile để phục vụ review trực quan.',
    },
    {
      title: 'Kiểm tra route status, browser error và SEO nền tảng',
      description:
        'Report kiểm tra status, lỗi browser, horizontal overflow, title, meta description, canonical, H1 và alt ảnh.',
    },
    {
      title: 'Bổ sung finding nội dung và conversion theo page purpose',
      description:
        'Report có finding về nội dung/copy, CTA chuyển đổi và inquiry path cho campaign và travel-product pages.',
    },
    {
      title: 'Xuất JSON và Markdown report',
      description: 'Output gồm JSON đọc được bằng máy và Markdown report để review hoặc chia sẻ.',
    },
  ],
  'US-020': [
    {
      title: 'Thêm default hero presentation trong site settings',
      description: 'Site settings expose default hero presentation độc lập với theme.',
    },
    {
      title: 'Cho page inherit default hoặc chọn preset riêng',
      description: 'Page có thể inherit default của site hoặc chọn page-level preset.',
    },
    {
      title: 'Giữ legacy presentation render ổn định',
      description: 'Legacy presentation records vẫn render được mà không cần migration dữ liệu.',
    },
    {
      title: 'Cung cấp planner, image carousel và video presentation',
      description: 'Các presentation được quản trị gồm planner, image carousel và video.',
    },
    {
      title: 'Tôn trọng reduced motion và pause khi không visible',
      description: 'Motion cần tôn trọng reduced-motion và dừng khi không còn visible.',
    },
    {
      title: 'Hoàn tất proof ở đủ lớp kiểm thử chính',
      description:
        'Có unit, component, integration, CMS E2E, frontend E2E và visual proof đã chọn.',
    },
  ],
  'US-021': [
    {
      title: 'Tách rõ các scope quyết định trong CMS',
      description:
        'CMS cần tách rõ site theme shell, site default hero và page-level hero override.',
    },
    {
      title: 'Định nghĩa scope site theme shell',
      description:
        'Site theme shell là lớp giao diện site-level, không lẫn với hero default hoặc override từng page.',
    },
    {
      title: 'Định nghĩa scope site default hero',
      description: 'Site default hero là preset mặc định cho site, dùng khi page không override.',
    },
    {
      title: 'Định nghĩa scope page-level hero override',
      description:
        'Page-level hero override chỉ áp dụng cho trang cụ thể và không thay đổi default toàn site.',
    },
    {
      title: 'Giới hạn quyền truy cập /admin/theme và hero editing',
      description:
        '/admin/theme chỉ cho site-manager và super-admin; page-level Hero editing theo quyền update page của editor.',
    },
    {
      title: 'Loại bỏ decision path legacy song song cho hero',
      description:
        'Flow editor-facing không còn expose legacy hero-presentation controls như một đường quyết định song song.',
    },
  ],
  'US-022': [
    {
      title: 'Dùng thống nhất naming WingsGroup CMS trong backend',
      description: 'Visual language của CMS backend dùng thống nhất tên WingsGroup CMS.',
    },
    {
      title: 'Cung cấp hai theme preset code-owned',
      description:
        'CMS backend có hai theme preset riêng là ats-compact và finexy-soft do code quản lý.',
    },
    {
      title: 'Thiết kế ats-compact theo hướng compact, rõ active state',
      description:
        'ats-compact dùng teal/slate, sidebar/navigation mạnh, active state rõ, bảng compact và border tiết chế.',
    },
    {
      title: 'Thiết kế finexy-soft theo hướng mềm và giàu dashboard',
      description:
        'finexy-soft dùng orange/charcoal, rounded cards, pill actions, metric cards, role/site summary và quick actions.',
    },
    {
      title: 'Dùng chung semantic backend token contract',
      description:
        'Hai theme dùng cùng token contract để admin components đổi theme mà không rewrite view logic.',
    },
    {
      title: 'Đảm bảo các route Payload hiện có tiếp tục hoạt động',
      description:
        'Các route /admin, /admin/console, /admin/theme, /admin/site-review, list view và edit view vẫn hoạt động.',
    },
  ],
  'US-023': [
    {
      title: 'Định nghĩa collections tour có cấu trúc',
      description:
        'Tạo và chuẩn hóa các collection tourProducts, tourDepartures và cơ chế biến thể khởi hành để quản lý dữ liệu tour bằng bản ghi có cấu trúc.',
    },
    {
      title: 'Hỗ trợ trang tour theo giá, campaign và lịch khởi hành',
      description:
        'Đảm bảo mô hình dữ liệu phục vụ được trang tour ưu tiên giá, tái sử dụng campaign và hiển thị bảng lịch khởi hành cho WingsGo.',
    },
    {
      title: 'Cho phép editor cập nhật khởi hành và bảng giá',
      description:
        'Editor có thể chỉnh khởi hành và dòng giá mà không phải viết lại toàn bộ trang chi tiết tour.',
    },
    {
      title: 'Hỗ trợ biến thể cùng tour theo điểm khởi hành hoặc hãng bay',
      description:
        'Một tour có thể có nhiều biến thể xuất phát hoặc hãng bay mà không cần nhân bản toàn bộ bản ghi sản phẩm.',
    },
    {
      title: 'Tài liệu hóa mapping import từ Google Sheets và Google Docs',
      description:
        'Ghi rõ cách ánh xạ dữ liệu lịch khởi hành, giá và chương trình tour từ nguồn Google Sheets hoặc Google Docs vào mô hình CMS.',
    },
    {
      title: 'Tách schedule, giá và itinerary khỏi Pages.layout',
      description:
        'Đảm bảo schedule, price và itinerary không chỉ nằm trong block generic của Pages.layout mà có nguồn dữ liệu có cấu trúc riêng.',
    },
  ],
  'US-024': [
    {
      title: 'Dựng template chi tiết tour có kiểm soát',
      description:
        'Cung cấp builder hoặc template được quản trị bằng section type đã duyệt cho các trang sản phẩm du lịch.',
    },
    {
      title: 'Render đầy đủ các section chính từ dữ liệu có cấu trúc',
      description:
        'Trang tour WingsGo hiển thị hero, facts, lý do chọn tour, bản đồ, itinerary, dịch vụ, bảng khởi hành, FAQ, tour liên quan và sticky CTA từ dữ liệu CMS.',
    },
    {
      title: 'Cho phép editor bật tắt và sắp xếp section an toàn',
      description:
        'Editor có thể điều chỉnh các section tùy chọn trong phạm vi được duyệt mà không làm sai dữ liệu lõi của sản phẩm tour.',
    },
    {
      title: 'Hỗ trợ itinerary theo từng ngày và override có giới hạn',
      description:
        'Itinerary được render theo cấu trúc ngày-by-ngày, đồng thời để sẵn cơ chế override có kiểm soát cho các hành trình linh hoạt sau này.',
    },
    {
      title: 'Hoàn thiện giao diện tour dày thông tin trên desktop và mobile',
      description:
        'Trang public cần đủ dày thông tin để hỗ trợ quyết định mua, gần benchmark BestPrice nhưng vẫn đúng brand và site WingsGo.',
    },
    {
      title: 'Chừa điểm mở rộng cho lead form và booking intent',
      description:
        'Kiến trúc trang giữ sẵn vùng chuyển đổi để gắn lead form hoặc booking intent ở giai đoạn 2 mà không phải thiết kế lại toàn bộ.',
    },
  ],
  'US-025': [
    {
      title: 'Chạy PostgreSQL disposable từ empty đến head',
      description:
        'Command repo-local spin up PostgreSQL dùng một lần và apply toàn bộ committed migrations từ schema rỗng đến head.',
    },
    {
      title: 'Fail khi migration lỗi, drift hoặc schema lệch expectation',
      description:
        'Command trả non-zero nếu migration lỗi, phát hiện drift hoặc schema sau migration không khớp expectation từ Payload.',
    },
    {
      title: 'Chạy gate trên PostgreSQL, không dùng SQLite',
      description:
        'Smoke gate phải chạy trên PostgreSQL để bắt lỗi khác biệt dialect thay vì chỉ kiểm tra SQLite.',
    },
    {
      title: 'Kiểm tra seed/import sau migration',
      description:
        'Sau migration cần chạy kiểm tra seed/import để đảm bảo dataset đại diện load được trên schema PostgreSQL mới.',
    },
    {
      title: 'Tài liệu hóa ranh giới SQLite bootstrap-only',
      description:
        'Ghi rõ SQLite chỉ dùng bootstrap local; repairLocalSQLiteSchema không thay thế migration thật trên PostgreSQL.',
    },
    {
      title: 'Ghi rollback path cho migration gần nhất',
      description:
        'Cần có đường rollback cho migration gần nhất, bằng down migration hoặc quy trình restore từ backup rõ ràng.',
    },
  ],
  'US-035': [
    {
      title: 'Tạo collection departure-variants',
      description:
        'Nền tảng có collection cấu trúc để mô tả biến thể khởi hành theo điểm xuất phát, hãng bay hoặc lớp trình bày.',
    },
    {
      title: 'Giới hạn phạm vi override của variant',
      description:
        'Variant chỉ được override một tập trường có kiểm soát, không nhân bản hoặc thay thế toàn bộ product truth.',
    },
    {
      title: 'Liên kết departure với variant phù hợp',
      description:
        'Mỗi departure có thể trỏ tới variant để public renderer biết cách merge dữ liệu khi hiển thị.',
    },
    {
      title: 'Merge base, variant và departure an toàn',
      description:
        'Public tour resolution phải hợp nhất base tour, variant và departure theo thứ tự rõ ràng, không leak field ngoài contract.',
    },
  ],
  'US-036': [
    {
      title: 'Nhóm field authoring cho base tour',
      description:
        'Admin tour base cần nhóm rõ decision data, route, reviews, itinerary, services, FAQ và builder settings.',
    },
    {
      title: 'Nhóm tín hiệu commerce cho departures',
      description:
        'Departure authoring cần expose các field giá, ngày, trạng thái và tín hiệu chuyển đổi theo nhóm dễ hiểu.',
    },
    {
      title: 'Nhóm tab override cho variants',
      description:
        'Variant authoring cần tách tab override để editor hiểu rõ phần nào đang thay đổi so với base tour.',
    },
  ],
  'US-037': [
    {
      title: 'Chuyển hero thành decision header',
      description:
        'Tour detail hero cần ưu tiên thông tin quyết định như giá, lịch, hành trình, CTA và proof thay vì hero trang generic.',
    },
    {
      title: 'Hiển thị review snapshot và route visual',
      description: 'Trang tour cần có proof nhanh và hình dung tuyến đi để hỗ trợ quyết định mua.',
    },
    {
      title: 'Render itinerary theo từng ngày và gắn gallery',
      description:
        'Itinerary phải đọc được theo ngày và có thể dùng media/gallery liên quan tới từng chặng.',
    },
    {
      title: 'Trình bày services và departures như commerce modules',
      description:
        'Dịch vụ bao gồm/không bao gồm và khởi hành phải có cấu trúc ra quyết định, không chỉ là đoạn text.',
    },
    {
      title: 'Giữ sticky CTA sẵn sàng cho builder',
      description:
        'Sticky CTA cần là vùng chuyển đổi ổn định để phase sau gắn lead hoặc booking intent.',
    },
  ],
  'US-038': [
    {
      title: 'Dựng compact hero với thống kê lịch khởi hành',
      description:
        'Trang lịch khởi hành cần hero gọn, nêu nhanh số lượng lịch, điểm đến và tín hiệu giá.',
    },
    {
      title: 'Đưa featured departures lên trước danh sách đầy đủ',
      description:
        'Các lịch đáng chú ý cần được ưu tiên trước bảng đầy đủ để tăng khả năng chuyển đổi.',
    },
    {
      title: 'Cho phép lọc departures theo nhóm',
      description:
        'Danh sách khởi hành cần filter được theo nhóm có ý nghĩa để người dùng tìm lịch phù hợp.',
    },
    {
      title: 'Thêm trust strip và CTA band',
      description: 'Trang browse cần các dải tin cậy và CTA để không chỉ là bảng dữ liệu vận hành.',
    },
    {
      title: 'Thêm hành động theo từng dòng lịch',
      description: 'Mỗi dòng departure cần action để giữ chỗ hoặc xem chi tiết tour liên quan.',
    },
  ],
  'US-039': [
    {
      title: 'Cập nhật product contract tour platform',
      description:
        'Tài liệu sản phẩm cần phản ánh đúng collection, renderer, variant và schedule surface đã triển khai.',
    },
    {
      title: 'Tài liệu hóa builder foundation',
      description:
        'Builder foundation cần ghi rõ section model, vùng chuyển đổi và ranh giới với Page Composer generic.',
    },
    {
      title: 'Tài liệu hóa variant model',
      description:
        'Variant model cần có contract rõ về base tour, departure, override và merge order.',
    },
    {
      title: 'Tài liệu hóa editorial workflow',
      description:
        'Editor cần biết thao tác tour, departure, variant và lịch khởi hành theo quy trình dễ theo.',
    },
    {
      title: 'Tài liệu hóa import mapping',
      description:
        'Mapping từ Google Sheets/Docs vào tour structured data cần đủ rõ để tiếp tục import-assisted updates.',
    },
  ],
  'US-026': [
    {
      title: 'Đăng ký đầy đủ story set US-026 đến US-034',
      description:
        'Harness cần có đủ các story của E08 để tách việc nâng cấp WingSide inbound thành các lát triển khai kiểm soát được.',
    },
    {
      title: 'Tạo folder epic E08 trong tài liệu story',
      description:
        'Epic folder là nơi gom overview, audit và story packet của initiative WingSide inbound upgrade.',
    },
    {
      title: 'Tổng hợp audit hardcode locale theo file',
      description:
        'Các rủi ro locale hardcode phải được ghi nhận theo file để tránh mở public locale sai hoặc fallback copy sai.',
    },
    {
      title: 'Chốt quyết định tái sử dụng block',
      description:
        'Các block Page Composer cần ưu tiên tái sử dụng hoặc mở rộng block hiện có trước khi thêm schema mới.',
    },
    {
      title: 'Chốt quyết định tái sử dụng hero system',
      description:
        'Hero inbound phải đi qua hệ thống hero presentation hiện có và trỏ đúng về cấu hình hero trong app.',
    },
    {
      title: 'Ghi rõ nguồn nội dung và luật locale launch',
      description:
        'Nội dung, provenance và danh sách locale được phép public cần được chốt trước các story downstream.',
    },
  ],
  'US-027': [
    {
      title: 'Thêm preset giao diện inbound v2 cho WingSide',
      description:
        'Preset wings-side-editorial-inbound-v2 định nghĩa token theme inbound mà không thay đổi các site khác.',
    },
    {
      title: 'Áp dụng bảng màu inbound bằng token được quản trị',
      description:
        'Màu nền, chữ, CTA và trạng thái nhấn phải đi qua token theme thay vì hardcode rải rác.',
    },
    {
      title: 'Giữ nguyên mapping font hiện có',
      description:
        'WingSide tiếp tục dùng Playfair Display và Inter cho tới khi quyết định Fraunces được chốt riêng.',
    },
    {
      title: 'Kiểm tra render desktop và mobile của /wingsside',
      description:
        'Route public WingSide phải hiển thị đúng theme trên desktop và mobile, không overflow nghiêm trọng.',
    },
    {
      title: 'Chứng minh theme không leak sang site khác',
      description:
        'WingsGo hoặc một site không phải WingSide cần smoke để xác nhận CSS scoped không ảnh hưởng chéo.',
    },
  ],
  'US-028': [
    {
      title: 'Tạo RevealOnScroll dùng IntersectionObserver',
      description:
        'Primitive reveal chỉ kích hoạt khi element vào viewport và có fallback phù hợp cho reduced-motion.',
    },
    {
      title: 'Tạo CountUp có fallback an toàn',
      description:
        'CountUp hỗ trợ số, suffix, duration và locale; giá trị không phải số phải render text fallback thay vì lỗi.',
    },
    {
      title: 'Tạo hook theo dõi hướng cuộn',
      description:
        'useScrollDirection cần cleanup listener và throttle bằng requestAnimationFrame để tránh ảnh hưởng hiệu năng.',
    },
    {
      title: 'Bổ sung utility CSS motion dùng chung',
      description:
        'Các class reveal, hover lift, image zoom và Ken Burns được định nghĩa ở global CSS với contract rõ ràng.',
    },
    {
      title: 'Không thêm thư viện motion mới',
      description: 'Story này không đưa Framer Motion, Embla hoặc dependency mới vào bundle.',
    },
  ],
  'US-029': [
    {
      title: 'Tái sử dụng hero presentation system hiện có',
      description:
        'Hero inbound dùng preset được quản trị trong hệ thống hero hiện tại, không tạo song song một hero framework mới.',
    },
    {
      title: 'Không đưa video hero vào wave đầu',
      description:
        'Wave 1 chỉ dùng image-only carousel để giảm rủi ro performance và production readiness.',
    },
    {
      title: 'Dựng planner widget có label và control truy cập được',
      description:
        'Planner form cần có label rõ, control truy cập được và submit về URL site-aware.',
    },
    {
      title: 'Kiểm thử hành vi hero/search trên /wingsside',
      description:
        'E2E public xác nhận preset, slide, Ken Burns marker, form label, routing và mobile no-overflow.',
    },
  ],
  'US-030': [
    {
      title: 'Dùng hoặc mở rộng InfoStrip và FeatureGrid cho value props',
      description: 'Value props inbound phải ưu tiên reuse block hiện có để giữ Page Composer gọn.',
    },
    {
      title: 'Mở rộng Stats để hỗ trợ count-up',
      description: 'Stats count-up cần dựa trên block Stats hiện có và motion primitive đã tạo.',
    },
    {
      title: 'Mở rộng Testimonial cho carousel có kiểm soát',
      description:
        'Testimonials carousel phải đi qua block Testimonial, không tạo dữ liệu đánh giá giả.',
    },
    {
      title: 'Chốt quyết định itinerary grid trước khi thêm block mới',
      description:
        'Nếu itinerary grid cần schema mới, quyết định phải được ghi trước khi mở rộng Page Composer.',
    },
    {
      title: 'Không dùng tour section registry cho Page Composer',
      description:
        'Page Composer không được phụ thuộc app/src/tours/sectionRegistry.ts vì đó là registry cho tour detail.',
    },
  ],
  'US-031': [
    {
      title: 'Tạo locale metadata dùng chung',
      description:
        'Locale metadata là contract trung tâm cho CMS-enabled, public-enabled và ads-ready locales.',
    },
    {
      title: 'Mở rộng Payload localization và options trong Sites',
      description:
        'Payload và collection Sites cần nhận biết các locale mục tiêu mà không tự động public toàn bộ.',
    },
    {
      title: 'Giới hạn sitemap, nav và hreflang theo public locale',
      description:
        'Chỉ các locale public-enabled được xuất hiện ở route, navigation, sitemap và hreflang.',
    },
    {
      title: 'Fallback chrome IT/ES/PT sang tiếng Anh',
      description:
        'Các locale quảng cáo chưa đủ native copy cần fallback public chrome sang tiếng Anh, không rơi về tiếng Việt.',
    },
    {
      title: 'Chặn JA/KO/FR/DE khỏi public surface',
      description: 'Các locale CMS-only không được xuất hiện public cho tới khi được bật rõ ràng.',
    },
    {
      title: 'Hoàn tất smoke migration PostgreSQL',
      description:
        'Thay đổi locale có blast radius database nên phải qua PostgreSQL migration smoke/staging gate.',
    },
  ],
  'US-032': [
    {
      title: 'Dựng mega menu inbound trên desktop và mobile',
      description: 'Navigation WingSide cần hỗ trợ mega menu đúng layout desktop và mobile.',
    },
    {
      title: 'Đảm bảo keyboard navigation cho menu',
      description: 'Người dùng bàn phím có thể mở, di chuyển và đóng menu mà không bị kẹt focus.',
    },
    {
      title: 'Đánh dấu locale hiện tại bằng aria-current',
      description:
        'Language switcher phải đánh dấu locale đang xem bằng aria-current để hỗ trợ accessibility.',
    },
    {
      title: 'Ẩn các locale chưa được public',
      description:
        'Public-disabled locales không được xuất hiện trong language switcher hoặc nav public.',
    },
    {
      title: 'Smoke header của site khác',
      description: 'Các header ngoài WingSide vẫn phải pass smoke sau khi thêm navigation inbound.',
    },
  ],
  'US-033': [
    {
      title: 'Hoàn thiện content map WingSide inbound',
      description:
        'Content map cần bao gồm page map, claim register, asset provenance và guard chống copy competitor.',
    },
    {
      title: 'Seed nội dung tiếng Anh cho sáu trang lõi',
      description: 'Sáu core pages cần có nội dung EN đủ để review launch surface.',
    },
    {
      title: 'Gắn trạng thái QA cho IT/ES/PT',
      description: 'Nội dung IT/ES/PT phải có QA status trước khi public hoặc chạy ads.',
    },
    {
      title: 'Không dùng testimonial, rating hoặc claim giả',
      description:
        'Seed content không được tạo bằng chứng xã hội, rating, giấy phép hoặc claim chưa được xác thực.',
    },
    {
      title: 'Không dùng text hoặc asset sao chép từ competitor',
      description: 'Nội dung và media cần có provenance rõ, tránh copy trực tiếp competitor.',
    },
  ],
  'US-034': [
    {
      title: 'Chạy hoặc ghi blocker cho full validation ladder',
      description:
        'Typecheck, lint, integration, component, E2E liên quan và build phải pass hoặc có blocker rõ.',
    },
    {
      title: 'Chạy go-live review hoặc ghi blocker',
      description:
        'Pipeline go-live:review cần được chạy cho WingSide hoặc nêu rõ lý do chưa chạy được.',
    },
    {
      title: 'Thu đủ screenshot cần thiết',
      description: 'Desktop và mobile screenshots là bằng chứng trực quan cho readiness review.',
    },
    {
      title: 'Xác nhận sitemap, canonical và hreflang cho EN/IT/ES/PT',
      description: 'Các locale public cần được kiểm tra SEO technical trước launch.',
    },
    {
      title: 'Xác nhận locale chưa public không leak',
      description: 'JA/KO/FR/DE không được xuất hiện trong nav, sitemap hoặc hreflang public.',
    },
    {
      title: 'Hoàn tất checklist nội dung và pháp lý',
      description:
        'Content/legal checklist cần hoàn chỉnh trước khi coi WingSide inbound là sẵn sàng phát hành.',
    },
  ],
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function walkFiles(dirPath) {
  const output = []
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      output.push(...walkFiles(fullPath))
      continue
    }
    output.push(fullPath)
  }
  return output
}

function resolveStoryFileInDir(dirPath, storyId) {
  const lowerId = storyId.toLowerCase()
  const directFile = walkFiles(dirPath).find((filePath) =>
    path.basename(filePath).toLowerCase().startsWith(lowerId),
  )
  if (directFile) {
    return directFile
  }

  const stack = [dirPath]
  while (stack.length) {
    const current = stack.pop()
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name)
      if (!entry.isDirectory()) {
        continue
      }
      if (entry.name.toLowerCase().startsWith(lowerId)) {
        const overview = path.join(fullPath, 'overview.md')
        if (fs.existsSync(overview)) {
          return overview
        }
      }
      stack.push(fullPath)
    }
  }

  return null
}

function normalizeCollection(response) {
  if (Array.isArray(response)) {
    return response
  }
  if (response?.results && Array.isArray(response.results)) {
    return response.results
  }
  if (response?.data && Array.isArray(response.data)) {
    return response.data
  }
  if (response?.items && Array.isArray(response.items)) {
    return response.items
  }
  if (response?.data && typeof response.data === 'object') {
    return [response.data]
  }
  if (response && typeof response === 'object') {
    return [response]
  }
  return []
}

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInline(text) {
  return escapeHtml(text)
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const html = []
  let paragraph = []
  let listItems = []
  let orderedItems = []

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${paragraph.map(renderInline).join(' ')}</p>`)
      paragraph = []
    }
  }

  const flushList = () => {
    if (listItems.length) {
      html.push(`<ul>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
      listItems = []
    }
    if (orderedItems.length) {
      html.push(`<ol>${orderedItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ol>`)
      orderedItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      continue
    }

    const bullet = trimmed.match(/^-\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      orderedItems = []
      listItems.push(bullet[1])
      continue
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/)
    if (ordered) {
      flushParagraph()
      listItems = []
      orderedItems.push(ordered[1])
      continue
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  return html.join('\n')
}

function translateStateName(name) {
  return STATE_NAME_MAP[name] || name
}

function translateModuleName(name) {
  return MODULE_NAME_MAP[name] || name
}

function translateMilestoneTitle(title) {
  return MILESTONE_NAME_MAP[title] || title
}

function translatePropertyLabel(name) {
  return PROPERTY_TEXT[name]?.name || name
}

function translatePropertyDescription(name, fallback) {
  return PROPERTY_TEXT[name]?.description || fallback
}

function translatePropertyOptions(name, options) {
  return options.map((option) => PROPERTY_TEXT[name]?.options?.[option] || option)
}

function translatePropertyOptionValue(name, value) {
  return PROPERTY_TEXT[name]?.options?.[value] || value
}

function translatePageName(name) {
  return PAGE_NAME_MAP[name] || name
}

function translateStoryTitle(storyId, fallback) {
  return STORY_TITLE_MAP[storyId] || fallback
}

function normalizeRiskLane(riskLane) {
  if (riskLane === 'high_risk') {
    return 'Rủi ro cao'
  }
  if (riskLane === 'normal') {
    return 'Bình thường'
  }
  if (riskLane === 'tiny') {
    return 'Nhỏ'
  }
  return riskLane
}

function runHarnessSql(sql) {
  const isWindows = process.platform === 'win32'
  const command = isWindows ? 'powershell.exe' : path.join(repoRoot, 'scripts', 'harness')
  const args = isWindows
    ? [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        path.join(repoRoot, 'scripts', 'harness.ps1'),
        'query',
        'sql',
        sql,
      ]
    : ['query', 'sql', sql]
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'Failed to query harness')
  }

  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.at(-1) || ''
}

function loadStoriesFromHarness() {
  const sql =
    "SELECT json_group_array(json_object('id', id, 'title', title, 'created_at', created_at, 'risk_lane', risk_lane, 'status', status, 'unit', unit_proof, 'integration', integration_proof, 'e2e', e2e_proof, 'platform', platform_proof, 'evidence', evidence, 'notes', notes)) AS data FROM story WHERE id LIKE 'US-%';"
  const raw = runHarnessSql(sql)
  return JSON.parse(raw).sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  )
}

function resolveStoryPath(story, mapping, manifest) {
  if (story.notes && story.notes.includes('docs/stories/')) {
    const candidate = path.join(repoRoot, story.notes)
    if (fs.existsSync(candidate)) {
      const candidateStats = fs.statSync(candidate)
      if (candidateStats.isFile()) {
        return candidate
      }
      if (candidateStats.isDirectory()) {
        const overview = path.join(candidate, 'overview.md')
        if (fs.existsSync(overview) && fs.statSync(overview).isFile()) {
          return overview
        }
      }
    }
  }

  if (mapping?.epicKey) {
    const epicConfig = (manifest.epics || []).find((item) => item.key === mapping.epicKey)
    const epicSource = epicConfig?.source ? path.join(repoRoot, epicConfig.source) : null
    const epicDir = epicSource ? path.dirname(epicSource) : null
    if (epicDir && fs.existsSync(epicDir)) {
      const epicFile = resolveStoryFileInDir(epicDir, story.id)
      if (epicFile) {
        return epicFile
      }
    }
  }

  return resolveStoryFileInDir(storyRoot, story.id)
}

function extractSection(markdown, sectionTitle) {
  const lines = markdown.replace(/\r/g, '').split('\n')
  const start = lines.findIndex(
    (line) => line.trim().toLowerCase() === `## ${sectionTitle}`.toLowerCase(),
  )
  if (start === -1) {
    return []
  }

  const collected = []
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.startsWith('## ')) {
      break
    }
    collected.push(line)
  }
  return collected
}

function extractAcceptanceCriteria(markdown) {
  const sectionLines = extractSection(markdown, 'Acceptance Criteria')
  const items = []
  let pending = null

  for (const rawLine of sectionLines) {
    const line = rawLine.trim()
    if (!line) {
      continue
    }
    if (line.startsWith('- ')) {
      if (pending) {
        items.push(pending.trim())
      }
      pending = line.slice(2)
      continue
    }
    if (pending) {
      pending += ` ${line}`
    }
  }

  if (pending) {
    items.push(pending.trim())
  }

  return items
}

function toProofStatusKey(story, mapping = {}) {
  if (['Full', 'Partial', 'Pending'].includes(mapping.proofStatusOverride)) {
    return mapping.proofStatusOverride
  }

  const proofs = [story.unit, story.integration, story.e2e, story.platform]
  if (proofs.every((value) => Number(value) === 1)) {
    return 'Full'
  }
  if (proofs.some((value) => Number(value) === 1)) {
    return 'Partial'
  }
  return 'Pending'
}

function toDateOnly(value) {
  const match = String(value || '').match(/\b20\d{2}-\d{2}-\d{2}\b/)
  return match ? match[0] : null
}

function latestDateInText(value) {
  const matches = String(value || '').match(/\b20\d{2}-\d{2}-\d{2}\b/g) || []
  return matches.sort().at(-1) || null
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function diffDays(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
}

function deriveStoryDates(story) {
  const startDate = toDateOnly(story.created_at)
  let targetDate = latestDateInText(story.evidence) || startDate
  if (startDate && targetDate && targetDate < startDate) {
    targetDate = startDate
  }
  return {
    startDate,
    targetDate,
  }
}

function deriveRecordDates(story, childCount = 0, mapping = {}) {
  const mappedStart = toDateOnly(mapping.startDate)
  const mappedTarget = toDateOnly(mapping.targetDate)
  if (mappedStart && mappedTarget) {
    if (mappedTarget < mappedStart) {
      throw new Error(`Invalid mapped dates for ${story.id}: target precedes start`)
    }
    return { startDate: mappedStart, targetDate: mappedTarget }
  }
  const baseDates = deriveStoryDates(story)
  if (baseDates.startDate && childCount > 0) {
    const sequentialTargetDate = addDays(baseDates.startDate, childCount - 1)
    return {
      startDate: baseDates.startDate,
      targetDate: [baseDates.targetDate, sequentialTargetDate].filter(Boolean).sort().at(-1),
    }
  }
  return baseDates
}

function deriveChildDates(story, childIndex, childCount = 0, mapping = {}) {
  const override = mapping.childDateOverrides?.[childIndex + 1]
  if (override?.startDate && override?.targetDate) {
    return {
      startDate: toDateOnly(override.startDate),
      targetDate: toDateOnly(override.targetDate),
    }
  }
  const recordDates = deriveRecordDates(story, childCount, mapping)
  if (recordDates.startDate && childCount > 0) {
    const spanDays = diffDays(recordDates.startDate, recordDates.targetDate)
    const offset = childCount <= 1 ? 0 : Math.round((childIndex * spanDays) / (childCount - 1))
    const taskDate = addDays(recordDates.startDate, offset)
    return {
      startDate: taskDate,
      targetDate: taskDate,
    }
  }
  return recordDates
}

function toProofStatusLabel(story, mapping = {}) {
  return translatePropertyOptionValue('Proof Status', toProofStatusKey(story, mapping))
}

function toPlaneStateName(story, mapping = {}) {
  if (Object.values(STATE_NAME_MAP).includes(mapping.planeStateOverride)) {
    return mapping.planeStateOverride
  }
  if (story.status === 'planned') {
    return 'Đã lên kế hoạch'
  }
  return toProofStatusKey(story, mapping) === 'Full' ? 'Đã bàn giao' : 'Chờ xác nhận'
}

function buildStoryDescription(story, mapping, sourcePath) {
  const sourceText = sourcePath
    ? path.relative(repoRoot, sourcePath).replaceAll('\\', '/')
    : 'Không tìm thấy file story'
  return [
    `<h2>${escapeHtml(story.id)} - ${escapeHtml(translateStoryTitle(story.id, story.title))}</h2>`,
    '<ul>',
    `<li>Mức rủi ro: ${escapeHtml(normalizeRiskLane(story.risk_lane))}</li>`,
    `<li>Trạng thái Plane: ${escapeHtml(toPlaneStateName(story, mapping))}</li>`,
    `<li>Trạng thái bằng chứng: ${escapeHtml(toProofStatusLabel(story, mapping))}</li>`,
    mapping.proofStatusNote ? `<li>Ghi chú proof: ${escapeHtml(mapping.proofStatusNote)}</li>` : '',
    `<li>Site: ${escapeHtml(translatePropertyOptionValue('Site', mapping.site))}</li>`,
    mapping.epicKey ? `<li>Epic: ${escapeHtml(mapping.epicKey)}</li>` : '',
    `<li>Giai đoạn: ${escapeHtml(translatePropertyOptionValue('Phase', mapping.phase))}</li>`,
    `<li>Nhóm công việc: ${escapeHtml(translatePropertyOptionValue('Workstream', mapping.workstream))}</li>`,
    `<li>Tài liệu nguồn: ${escapeHtml(sourceText)}</li>`,
    '</ul>',
    `<p>${escapeHtml(story.evidence || 'Chưa có bằng chứng tóm tắt trong Harness matrix.')}</p>`,
  ].join('\n')
}

function buildChildTitle(storyId, index, criterion = '') {
  const mapped = CHILD_TASK_TEXT[storyId]?.[index]?.title
  if (mapped) {
    return `${storyId} - ${mapped}`
  }
  return `${storyId} - ${criterion || `Tiêu chí chấp nhận ${index + 1}`}`
}

function buildChildDescription(storyId, index, criterion, sourcePath) {
  const sourceText = sourcePath
    ? path.relative(repoRoot, sourcePath).replaceAll('\\', '/')
    : 'Không tìm thấy file story'
  const mapped = CHILD_TASK_TEXT[storyId]?.[index]
  return [
    `<h3>${escapeHtml(buildChildTitle(storyId, index, criterion))}</h3>`,
    `<p>${escapeHtml(mapped?.description || criterion || 'Nội dung chi tiết được đối chiếu từ tài liệu nội bộ.')}</p>`,
    criterion ? `<p>Tiêu chí nguồn: ${escapeHtml(criterion)}</p>` : '',
    `<p>Tài liệu nguồn: ${escapeHtml(sourceText)}</p>`,
  ]
    .filter(Boolean)
    .join('\n')
}

function buildStoryRecords(manifest, { ignoreStoryFilter = false } = {}) {
  const stories = loadStoriesFromHarness()
  const mappedStoryIds = new Set(Object.keys(manifest.storyMappings || {}))
  return stories
    .filter(
      (story) =>
        mappedStoryIds.has(story.id) &&
        (ignoreStoryFilter || storyIdFilter.size === 0 || storyIdFilter.has(story.id)),
    )
    .map((story) => {
      const mapping = manifest.storyMappings[story.id] || {
        projectKey: 'core',
        module: 'CMS Admin UX',
        site: 'Core',
        phase: 'Phase 1',
        workstream: 'CMS',
        customerVisible: 'Yes',
      }
      const sourcePath = resolveStoryPath(story, mapping, manifest)
      const markdown =
        sourcePath && fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, 'utf8') : ''
      const acceptanceCriteria = markdown ? extractAcceptanceCriteria(markdown) : []

      return {
        story,
        mapping,
        sourcePath,
        descriptionHtml: buildStoryDescription(story, mapping, sourcePath),
        parentName: `${story.id} ${translateStoryTitle(story.id, story.title)}`,
        childTasks: acceptanceCriteria.map((criterion, index) => ({
          externalId: `${story.id}-ac-${index + 1}`,
          originalCriterion: criterion,
          planeStateName: toPlaneStateName(story, {
            ...mapping,
            planeStateOverride:
              mapping.childStateOverrides?.[index + 1] || mapping.planeStateOverride,
          }),
          title: buildChildTitle(story.id, index, criterion),
          descriptionHtml: buildChildDescription(story.id, index, criterion, sourcePath),
        })),
      }
    })
}

function deriveEpicDates(records) {
  const dates = records.map((record) => deriveRecordDates(record.story, record.childTasks.length, record.mapping))
  return {
    startDate:
      dates
        .map((item) => item.startDate)
        .filter(Boolean)
        .sort()
        .at(0) || null,
    targetDate:
      dates
        .map((item) => item.targetDate)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
  }
}

function buildEpicDescription(epicConfig, records) {
  const sourceText = epicConfig.source || 'Không có tài liệu nguồn'
  const storyList =
    records
      .map(
        (record) =>
          `<li>${escapeHtml(record.story.id)} - ${escapeHtml(translateStoryTitle(record.story.id, record.story.title))}</li>`,
      )
      .join('\n') || '<li>Epic dùng để ghi chú hoặc supervision plan, chưa có US riêng.</li>'

  return [
    `<h2>${escapeHtml(epicConfig.name)}</h2>`,
    `<p>${escapeHtml(epicConfig.description)}</p>`,
    `<p>Tài liệu nguồn: ${escapeHtml(sourceText)}</p>`,
    '<h3>Story thuộc epic</h3>',
    '<ul>',
    storyList,
    '</ul>',
  ].join('\n')
}

async function ensureEpicGroupings(client, manifest, projectMap, storyRecords, onlyEpicKeys) {
  const workspaceSlug = client.config.workspaceSlug

  for (const epicConfig of manifest.epics || []) {
    if (onlyEpicKeys && !onlyEpicKeys.has(epicConfig.key)) {
      continue
    }

    const project = projectMap.get(epicConfig.projectKey)
    if (!project) {
      continue
    }

    const epicStateId = epicConfig.planeStateOverride
      ? (
          await client.list(`/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/states/`)
        ).find((state) => state.name === epicConfig.planeStateOverride)?.id
      : undefined

    const records = storyRecords.filter((record) => record.mapping.epicKey === epicConfig.key)

    const workItems = await client.list(
      `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`,
    )
    const parentIds = records
      .map(
        (record) => workItems.find((item) => item.external_id === `story:${record.story.id}`)?.id,
      )
      .filter(Boolean)
    const derivedEpicDates = deriveEpicDates(records)
    const epicDates = {
      startDate: derivedEpicDates.startDate || epicConfig.startDate || null,
      targetDate: derivedEpicDates.targetDate || epicConfig.targetDate || null,
    }
    const descriptionHtml = buildEpicDescription(epicConfig, records)
    let epicLinked = false

    try {
      const existingEpicWorkItem = workItems.find(
        (item) => item.external_id === `epic-workitem:${epicConfig.key}`,
      )
      if (existingEpicWorkItem) {
        const updatedEpicWorkItem = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${existingEpicWorkItem.id}/`,
          {
            name: toPlaneItemName(epicConfig.name),
            description_html: descriptionHtml,
            priority: 'high',
            ...(epicStateId ? { state: epicStateId } : {}),
            start_date: epicDates.startDate,
            target_date: epicDates.targetDate,
          },
        )
        for (const parentId of parentIds) {
          const item = workItems.find((candidate) => candidate.id === parentId)
          if (item?.parent !== updatedEpicWorkItem.id) {
            await client.request(
              'PATCH',
              `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${parentId}/`,
              {
                parent: updatedEpicWorkItem.id,
              },
            )
          }
        }
        continue
      }

      const types = await client.list(
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-item-types/`,
      )
      const epicType = types.find((item) => item.name === EPIC_TYPE_NAME)

      if (epicType) {
        let epicWorkItem =
          workItems.find((item) => item.external_id === `epic-workitem:${epicConfig.key}`) ||
          workItems.find((item) => item.name === epicConfig.name && item.type === epicType.id)

        const payload = {
          name: toPlaneItemName(epicConfig.name),
          description_html: descriptionHtml,
          priority: 'high',
          type: epicType.id,
          ...(epicStateId ? { state: epicStateId } : {}),
          start_date: epicDates.startDate,
          target_date: epicDates.targetDate,
          external_id: `epic-workitem:${epicConfig.key}`,
          external_source: EXTERNAL_SOURCE,
        }

        if (!epicWorkItem) {
          epicWorkItem = await client.request(
            'POST',
            `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`,
            payload,
          )
          workItems.push(epicWorkItem)
        } else {
          epicWorkItem = await client.request(
            'PATCH',
            `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${epicWorkItem.id}/`,
            payload,
          )
        }

        for (const parentId of parentIds) {
          const item = workItems.find((candidate) => candidate.id === parentId)
          if (item?.parent !== epicWorkItem.id) {
            await client.request(
              'PATCH',
              `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${parentId}/`,
              {
                parent: epicWorkItem.id,
              },
            )
          }
        }

        epicLinked = true
      }
    } catch (error) {
      console.warn(`Skipping work item type epic sync for ${epicConfig.key}: ${error.message}`)
    }

    try {
      if (epicLinked) {
        continue
      }
      const epics = await client.list(
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/epics/`,
      )
      let epic =
        epics.find((item) => item.external_id === `epic:${epicConfig.key}`) ||
        epics.find((item) => item.name === epicConfig.name)

      const payload = {
        name: toPlaneItemName(epicConfig.name),
        description_html: descriptionHtml,
        priority: 'high',
        start_date: epicDates.startDate,
        target_date: epicDates.targetDate,
        external_id: `epic:${epicConfig.key}`,
        external_source: EXTERNAL_SOURCE,
      }

      if (!epic) {
        epic = await client.request(
          'POST',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/epics/`,
          payload,
        )
      } else {
        epic = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/epics/${epic.id}/`,
          payload,
        )
      }

      if (parentIds.length) {
        const linkedItems = await client.list(
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/epics/${epic.id}/issues/?per_page=100`,
        )
        const linkedIds = new Set(linkedItems.map((item) => item.id))
        const missingIds = parentIds.filter((id) => !linkedIds.has(id))
        if (missingIds.length) {
          await client.request(
            'POST',
            `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/epics/${epic.id}/issues/`,
            {
              work_item_ids: missingIds,
            },
          )
        }
      }
      epicLinked = true
    } catch (error) {
      console.warn(`Skipping native epic sync for ${epicConfig.key}: ${error.message}`)
    }

    if (!epicLinked && parentIds.length) {
      const modules = await client.list(
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/modules/`,
      )
      let moduleRecord =
        modules.find((item) => item.external_id === `epic-module:${epicConfig.key}`) ||
        modules.find((item) => item.name === epicConfig.name)

      if (!moduleRecord) {
        moduleRecord = await client.request(
          'POST',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/modules/`,
          {
            name: toPlaneItemName(epicConfig.name),
            description: epicConfig.description,
            external_id: `epic-module:${epicConfig.key}`,
            external_source: EXTERNAL_SOURCE,
          },
        )
      }

      await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/modules/${moduleRecord.id}/module-issues/`,
        {
          issues: parentIds,
        },
      )
    }
  }
}

class PlaneClient {
  constructor(config) {
    this.config = config
  }

  headers() {
    return {
      'X-API-Key': this.config.apiKey,
      'Content-Type': 'application/json',
    }
  }

  endpoint(pathname) {
    return `${this.config.baseUrl}${pathname}`
  }

  async request(method, pathname, body) {
    let attempt = 0

    while (true) {
      let response
      try {
        response = await fetch(this.endpoint(pathname), {
          method,
          headers: this.headers(),
          body: body ? JSON.stringify(body) : undefined,
        })
      } catch (error) {
        if (attempt < 5) {
          attempt += 1
          const waitMs = Math.min(30000, 1000 * 2 ** attempt)
          console.warn(
            `Network error on ${method} ${pathname}: ${error.message}; retrying in ${Math.ceil(waitMs / 1000)}s`,
          )
          await sleep(waitMs)
          continue
        }
        throw error
      }

      if (response.status === 429 && attempt < 5) {
        attempt += 1
        const retryAfter = Number(response.headers.get('Retry-After') || '65')
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 65000
        console.warn(
          `Rate limited on ${method} ${pathname}; retrying in ${Math.ceil(waitMs / 1000)}s`,
        )
        await sleep(waitMs)
        continue
      }

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`${method} ${pathname} failed: ${response.status} ${text}`)
      }

      if (response.status === 204) {
        return null
      }

      return response.json()
    }
  }

  async requestIfExists(method, pathname, body) {
    try {
      return await this.request(method, pathname, body)
    } catch (error) {
      if (String(error.message).includes(' 404 ')) {
        return null
      }
      throw error
    }
  }

  async list(pathname) {
    const first = await this.request('GET', pathname)
    const items = normalizeCollection(first)
    if (!first?.next) {
      return items
    }

    let next = first.next
    const results = [...items]
    while (next) {
      let response
      let attempt = 0
      while (true) {
        try {
          response = await fetch(next, { headers: this.headers() })
          break
        } catch (error) {
          if (attempt < 5) {
            attempt += 1
            const waitMs = Math.min(30000, 1000 * 2 ** attempt)
            console.warn(
              `Network error on GET ${next}: ${error.message}; retrying in ${Math.ceil(waitMs / 1000)}s`,
            )
            await sleep(waitMs)
            continue
          }
          throw error
        }
      }
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`GET ${next} failed: ${response.status} ${text}`)
      }
      const payload = await response.json()
      results.push(...normalizeCollection(payload))
      next = payload?.next || null
    }

    return results
  }
}

function findByNames(items, names) {
  return items.find(
    (item) =>
      names.includes(item.name) || names.includes(item.display_name) || names.includes(item.title),
  )
}

function toPlaneItemName(value) {
  const name = String(value)
  return name.length <= 255 ? name : `${name.slice(0, 252).trimEnd()}...`
}

async function cleanupDemoContent(client) {
  const workspaceSlug = client.config.workspaceSlug
  const pages = await client.list(`/api/v1/workspaces/${workspaceSlug}/pages/`)
  const demoPage = pages.find((item) => item.name === "Welcome to Company's Wiki")
  if (demoPage) {
    console.warn(
      'Workspace page mặc định của Plane không hỗ trợ sửa/xóa qua API public; bỏ qua bước dọn page demo.',
    )
  }

  const projects = await client.list(`/api/v1/workspaces/${workspaceSlug}/projects/`)
  const demoProject = projects.find((item) => item.identifier === 'WINGS' && !item.external_source)
  if (demoProject) {
    await client.request(
      'DELETE',
      `/api/v1/workspaces/${workspaceSlug}/projects/${demoProject.id}/`,
    )
  }
}

async function ensureWorkspacePrerequisites(client, manifest) {
  const workspaceSlug = client.config.workspaceSlug

  let initiative = null
  try {
    const initiatives = await client.list(`/api/v1/workspaces/${workspaceSlug}/initiatives/`)
    initiative = initiatives.find((item) =>
      [INITIATIVE_TEXT.currentName, INITIATIVE_TEXT.name].includes(item.name),
    )
    if (!initiative) {
      initiative = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/initiatives/`,
        {
          name: INITIATIVE_TEXT.name,
          description: INITIATIVE_TEXT.description,
          state: 'ACTIVE',
        },
      )
    } else {
      initiative = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/initiatives/${initiative.id}/`,
        {
          name: INITIATIVE_TEXT.name,
          description: INITIATIVE_TEXT.description,
        },
      )
    }
  } catch (error) {
    if (
      !error.message.includes('/initiatives/') ||
      !error.message.includes('403') ||
      !error.message.includes('Payment required')
    ) {
      throw error
    }
    console.warn(
      'Plane plan hiện tại không hỗ trợ Initiatives; tiếp tục đồng bộ Project/Epic/US mà không liên kết Initiative.',
    )
  }

  const projects = await client.list(`/api/v1/workspaces/${workspaceSlug}/projects/`)
  const projectMap = new Map()
  for (const projectConfig of manifest.projects) {
    const text = PROJECT_TEXT[projectConfig.identifier] || {
      name: projectConfig.name,
      description: projectConfig.description,
    }
    let project =
      projects.find((item) => item.identifier === projectConfig.identifier) ||
      projects.find((item) => [projectConfig.name, text.name].includes(item.name))

    if (!project) {
      project = await client.request('POST', `/api/v1/workspaces/${workspaceSlug}/projects/`, {
        name: text.name,
        identifier: projectConfig.identifier,
        description: text.description,
        external_id: `project:${projectConfig.key}`,
        external_source: EXTERNAL_SOURCE,
      })
    } else {
      try {
        project = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/`,
          {
            name: text.name,
            description: text.description,
            intake_view: true,
            module_view: true,
            page_view: true,
            issue_views_view: true,
            is_issue_type_enabled: true,
          },
        )
      } catch (error) {
        if (
          !error.message.includes('400') ||
          !error.message.includes('Archived project cannot be updated')
        ) {
          throw error
        }
        project = { ...project, skipHistorySync: true }
        console.warn(
          `Project ${project.identifier || project.name} đã archive; giữ nguyên và bỏ qua đồng bộ lịch sử.`,
        )
      }
    }

    projectMap.set(projectConfig.key, project)
  }

  if (initiative) {
    const initiativeProjects = await client.list(
      `/api/v1/workspaces/${workspaceSlug}/initiatives/${initiative.id}/projects/`,
    )
    const initiativeProjectIds = new Set(
      initiativeProjects.map((item) => item.id || item.project || item.project_id),
    )
    const missingProjectIds = [...projectMap.values()]
      .map((project) => project.id)
      .filter((projectId) => projectId && !initiativeProjectIds.has(projectId))

    if (missingProjectIds.length) {
      await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/initiatives/${initiative.id}/projects/`,
        {
          project_ids: missingProjectIds,
        },
      )
    }
  }

  return { initiative, projectMap }
}

async function ensureProjectSetup(client, manifest, project) {
  const workspaceSlug = client.config.workspaceSlug
  const projectId = project.id

  await client.request('PATCH', `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/`, {
    intake_view: true,
    module_view: true,
    page_view: true,
    issue_views_view: true,
    is_issue_type_enabled: true,
  })

  const states = await client.list(
    `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/states/`,
  )
  const stateMap = new Map()
  for (const state of states) {
    const desiredName = translateStateName(state.name)
    let updated = state
    if (desiredName !== state.name) {
      updated = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/states/${state.id}/`,
        {
          name: desiredName,
          color: state.color,
          group: state.group,
        },
      )
    }
    stateMap.set(state.name, updated)
    stateMap.set(desiredName, updated)
  }

  for (const stateConfig of manifest.states) {
    const desiredName = translateStateName(stateConfig.name)
    if (!stateMap.has(desiredName)) {
      try {
        const created = await client.request(
          'POST',
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/states/`,
          {
            name: desiredName,
            color: stateConfig.color,
            group: stateConfig.group,
            external_id: `state:${stateConfig.name}`,
            external_source: EXTERNAL_SOURCE,
          },
        )
        stateMap.set(stateConfig.name, created)
        stateMap.set(desiredName, created)
      } catch (error) {
        if (
          stateConfig.group === 'triage' &&
          typeof error.message === 'string' &&
          error.message.includes('Cannot create triage state')
        ) {
          const fallbackState = stateMap.get('Tiếp nhận') || stateMap.get('Kế hoạch') || null
          if (fallbackState) {
            stateMap.set(stateConfig.name, fallbackState)
            stateMap.set(desiredName, fallbackState)
            continue
          }
        }
        throw error
      }
    }
  }

  const modules = await client.list(
    `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/`,
  )
  const moduleMap = new Map()
  for (const moduleRecord of modules) {
    const originalName = moduleRecord.name
    const desiredName = translateModuleName(moduleRecord.name)
    let updated = moduleRecord
    if (desiredName !== moduleRecord.name) {
      updated = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${moduleRecord.id}/`,
        {
          name: desiredName,
          description: `Nhóm công việc: ${desiredName}`,
        },
      )
    }
    moduleMap.set(originalName, updated)
    moduleMap.set(desiredName, updated)
    if (moduleRecord.external_id) {
      moduleMap.set(moduleRecord.external_id, updated)
    }
  }

  for (const moduleName of manifest.modules) {
    const desiredName = translateModuleName(moduleName)
    const legacyExternalId = `module:${moduleName.replaceAll('WingSide', 'WingsSide')}`
    let existingModule =
      moduleMap.get(desiredName) ||
      moduleMap.get(`module:${moduleName}`) ||
      moduleMap.get(legacyExternalId)
    if (existingModule && existingModule.name !== desiredName) {
      existingModule = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${existingModule.id}/`,
        {
          name: desiredName,
          description: `Nhóm công việc: ${desiredName}`,
        },
      )
      moduleMap.set(moduleName, existingModule)
      moduleMap.set(desiredName, existingModule)
    } else if (!existingModule) {
      const created = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/`,
        {
          name: desiredName,
          description: `Nhóm công việc: ${desiredName}`,
          external_id: `module:${moduleName}`,
          external_source: EXTERNAL_SOURCE,
        },
      )
      moduleMap.set(moduleName, created)
      moduleMap.set(desiredName, created)
    }
  }

  const projectConfig = manifest.projects.find((item) => item.identifier === project.identifier)
  for (const epicConfig of (manifest.epics || []).filter(
    (item) => item.projectKey === projectConfig?.key,
  )) {
    const desiredName = epicConfig.name
    let existingModule =
      moduleMap.get(desiredName) || moduleMap.get(`epic-module:${epicConfig.key}`)
    if (existingModule && existingModule.name !== desiredName) {
      existingModule = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/${existingModule.id}/`,
        {
          name: desiredName,
          description: epicConfig.description,
        },
      )
      moduleMap.set(epicConfig.name, existingModule)
      moduleMap.set(desiredName, existingModule)
    } else if (!existingModule) {
      const created = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/modules/`,
        {
          name: desiredName,
          description: epicConfig.description,
          external_id: `epic-module:${epicConfig.key}`,
          external_source: EXTERNAL_SOURCE,
        },
      )
      moduleMap.set(epicConfig.name, created)
      moduleMap.set(desiredName, created)
    }
  }

  const milestones = await client.list(
    `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones/`,
  )
  const milestoneMap = new Map()
  for (const milestone of milestones) {
    const originalTitle = milestone.title
    const desiredTitle = translateMilestoneTitle(milestone.title)
    let updated = milestone
    if (desiredTitle !== milestone.title) {
      updated = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones/${milestone.id}/`,
        {
          title: desiredTitle,
          target_date: milestone.target_date,
        },
      )
    }
    milestoneMap.set(originalTitle, updated)
    milestoneMap.set(desiredTitle, updated)
  }

  for (const milestoneConfig of manifest.milestones) {
    const desiredTitle = translateMilestoneTitle(milestoneConfig.title)
    if (!milestoneMap.has(desiredTitle)) {
      const created = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/milestones/`,
        {
          title: desiredTitle,
          target_date: milestoneConfig.targetDate,
          external_id: `milestone:${milestoneConfig.title}`,
          external_source: EXTERNAL_SOURCE,
        },
      )
      milestoneMap.set(milestoneConfig.title, created)
      milestoneMap.set(desiredTitle, created)
    }
  }

  let types
  try {
    types = await client.list(
      `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/`,
    )
  } catch (error) {
    if (
      !error.message.includes('/work-item-types/') ||
      !error.message.includes('402') ||
      !error.message.includes('Payment required')
    ) {
      throw error
    }
    console.warn(
      `Plane plan hiện tại không hỗ trợ work item types cho ${project.identifier || project.name}; bỏ qua custom properties.`,
    )
    return {
      stateMap,
      moduleMap,
      milestoneMap,
      propertyMap: new Map(),
      propertyOptionMap: new Map(),
    }
  }
  const defaultType = types.find((item) => item.is_default) || types[0]
  if (!defaultType) {
    throw new Error(`No work item type found for project ${project.name}`)
  }

  const properties = await client.list(
    `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${defaultType.id}/work-item-properties/`,
  )

  const propertyMap = new Map()
  const propertyOptionMap = new Map()

  for (const property of properties) {
    const originalLabel = property.display_name || property.name
    const key =
      Object.keys(PROPERTY_TEXT).find(
        (candidate) =>
          candidate === originalLabel || PROPERTY_TEXT[candidate].name === originalLabel,
      ) || originalLabel
    const desiredDisplay = translatePropertyLabel(key)
    const desiredDescription = translatePropertyDescription(key, property.description)
    let updated = property
    const optionNames =
      property.property_type === 'OPTION'
        ? translatePropertyOptions(
            key,
            manifest.customProperties.find((item) => item.name === key)?.options || [],
          )
        : undefined

    try {
      updated = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${defaultType.id}/work-item-properties/${property.id}/`,
        {
          display_name: desiredDisplay,
          description: desiredDescription,
          options: optionNames?.map((name) => ({ name })),
        },
      )
    } catch (error) {
      if (property.property_type === 'OPTION' && String(error.message).includes('"context"')) {
        console.warn(
          `Skipping dropdown option sync for "${desiredDisplay}" because Plane API requires option context.`,
        )
        updated = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${defaultType.id}/work-item-properties/${property.id}/`,
          {
            display_name: desiredDisplay,
            description: desiredDescription,
          },
        )
      } else {
        throw error
      }
    }

    propertyMap.set(key, updated)
    propertyMap.set(originalLabel, updated)
    propertyMap.set(desiredDisplay, updated)

    if (updated.property_type === 'OPTION') {
      propertyOptionMap.set(
        key,
        new Map((updated.options || []).map((option) => [option.name, option])),
      )
    }
  }

  for (const propertyConfig of manifest.customProperties) {
    const desiredDisplay = translatePropertyLabel(propertyConfig.name)
    const desiredDescription = translatePropertyDescription(
      propertyConfig.name,
      propertyConfig.description,
    )
    let property = propertyMap.get(propertyConfig.name) || propertyMap.get(desiredDisplay)
    if (!property) {
      property = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${defaultType.id}/work-item-properties/`,
        {
          name: propertyConfig.name,
          display_name: desiredDisplay,
          description: desiredDescription,
          property_type: propertyConfig.propertyType,
          options:
            propertyConfig.propertyType === 'OPTION'
              ? translatePropertyOptions(propertyConfig.name, propertyConfig.options).map(
                  (name) => ({ name }),
                )
              : undefined,
          external_id: `property:${propertyConfig.name}`,
          external_source: EXTERNAL_SOURCE,
        },
      )
      propertyMap.set(propertyConfig.name, property)
      propertyMap.set(desiredDisplay, property)
    }

    if (property.property_type === 'OPTION') {
      propertyOptionMap.set(
        propertyConfig.name,
        new Map((property.options || []).map((option) => [option.name, option])),
      )
    }
  }

  return {
    stateMap,
    moduleMap,
    milestoneMap,
    propertyMap,
    propertyOptionMap,
  }
}

async function ensureWorkspacePages(client, manifest) {
  const workspaceSlug = client.config.workspaceSlug
  const existingPages = await client.list(`/api/v1/workspaces/${workspaceSlug}/pages/`)

  for (const pageConfig of manifest.pages) {
    const desiredName = translatePageName(pageConfig.name)
    const pageSource = path.join(repoRoot, pageConfig.source)
    const markdown = fs.readFileSync(pageSource, 'utf8')
    const descriptionHtml = markdownToHtml(markdown)
    const desiredPage = findByNames(existingPages, [desiredName])
    if (!desiredPage) {
      await client.request('POST', `/api/v1/workspaces/${workspaceSlug}/pages/`, {
        name: desiredName,
        access: 1,
        description_html: descriptionHtml,
      })
    }
  }
}

async function setPropertyValue(
  client,
  workspaceSlug,
  projectId,
  workItemId,
  propertyId,
  rawValue,
) {
  if (!propertyId || rawValue == null || rawValue === '') {
    return
  }

  const pathname = `/api/v1/workspaces/${workspaceSlug}/projects/${projectId}/work-items/${workItemId}/work-item-properties/${propertyId}/values/`
  const existing = await client.requestIfExists('GET', pathname)
  if (!existing) {
    await client.request('POST', pathname, { value: rawValue })
    return
  }

  if (existing.value === rawValue) {
    return
  }

  await client.request('PATCH', pathname, { value: rawValue })
}

async function ensureHistory(client, manifest, projectMap) {
  const workspaceSlug = client.config.workspaceSlug
  const storyRecords = buildStoryRecords(manifest).filter(
    (record) => !projectMap.get(record.mapping.projectKey)?.skipHistorySync,
  )
  const projectWorkItems = new Map()
  const projectSetup = new Map()
  const targetProjectKeys = storyIdFilter.size
    ? new Set(storyRecords.map((record) => record.mapping.projectKey))
    : null

  for (const projectConfig of manifest.projects) {
    if (targetProjectKeys && !targetProjectKeys.has(projectConfig.key)) {
      continue
    }
    const project = projectMap.get(projectConfig.key)
    if (project.skipHistorySync) {
      continue
    }
    projectSetup.set(projectConfig.key, await ensureProjectSetup(client, manifest, project))
    projectWorkItems.set(
      projectConfig.key,
      await client.list(`/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`),
    )
  }

  for (const record of storyRecords) {
    const project = projectMap.get(record.mapping.projectKey)
    const setup = projectSetup.get(record.mapping.projectKey)
    const workItems = projectWorkItems.get(record.mapping.projectKey)

    const parentExternalId = `story:${record.story.id}`
    let parent =
      workItems.find((item) => item.external_id === parentExternalId) ||
      workItems.find((item) => item.name === record.parentName)

    const desiredStateId = setup.stateMap.get(toPlaneStateName(record.story, record.mapping))?.id
    const storyDates = deriveRecordDates(record.story, record.childTasks.length, record.mapping)
    const parentPayload = {
      name: toPlaneItemName(record.parentName),
      description_html: record.descriptionHtml,
      priority: record.story.risk_lane === 'high_risk' ? 'high' : 'medium',
      state: desiredStateId,
      start_date: storyDates.startDate,
      target_date: storyDates.targetDate,
      external_id: parentExternalId,
      external_source: EXTERNAL_SOURCE,
    }

    if (!parent) {
      parent = await client.request(
        'POST',
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`,
        parentPayload,
      )
      workItems.push(parent)
    } else {
      parent = await client.request(
        'PATCH',
        `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${parent.id}/`,
        parentPayload,
      )
    }

    const moduleId =
      setup.moduleMap.get(record.mapping.module)?.id ||
      setup.moduleMap.get(translateModuleName(record.mapping.module))?.id
    if (moduleId) {
      try {
        await client.request(
          'POST',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/modules/${moduleId}/module-issues/`,
          { issues: [parent.id] },
        )
      } catch (error) {
        console.warn(`Skipping module link for ${record.story.id}: ${error.message}`)
      }
    }

    const optionId = (propertyName, value) =>
      setup.propertyOptionMap
        .get(propertyName)
        ?.get(translatePropertyOptionValue(propertyName, value))?.id

    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Story ID')?.id,
      record.story.id,
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Epic')?.id,
      record.mapping.epicKey || '',
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Site')?.id,
      optionId('Site', record.mapping.site),
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Phase')?.id,
      optionId('Phase', record.mapping.phase),
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Workstream')?.id,
      optionId('Workstream', record.mapping.workstream),
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Proof Status')?.id,
      optionId('Proof Status', toProofStatusKey(record.story, record.mapping)),
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Source Link')?.id,
      record.sourcePath ? path.relative(repoRoot, record.sourcePath).replaceAll('\\', '/') : '',
    )
    await setPropertyValue(
      client,
      workspaceSlug,
      project.id,
      parent.id,
      setup.propertyMap.get('Customer Visible')?.id,
      optionId('Customer Visible', record.mapping.customerVisible),
    )

    for (const [index, childTask] of record.childTasks.entries()) {
      const childDates = deriveChildDates(record.story, index, record.childTasks.length, record.mapping)
      let child =
        workItems.find((item) => item.external_id === `child:${childTask.externalId}`) ||
        workItems.find((item) => item.parent === parent.id && item.name === childTask.title)

      const childPayload = {
        name: toPlaneItemName(childTask.title),
        description_html: childTask.descriptionHtml,
        priority: record.story.risk_lane === 'high_risk' ? 'high' : 'medium',
        state: setup.stateMap.get(childTask.planeStateName)?.id || desiredStateId,
        start_date: childDates.startDate,
        target_date: childDates.targetDate,
        parent: parent.id,
        external_id: `child:${childTask.externalId}`,
        external_source: EXTERNAL_SOURCE,
      }

      if (!child) {
        child = await client.request(
          'POST',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`,
          childPayload,
        )
        workItems.push(child)
      } else {
        child = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${child.id}/`,
          childPayload,
        )
      }

      if (!child.name.startsWith(record.story.id)) {
        child = await client.request(
          'PATCH',
          `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${child.id}/`,
          {
            ...childPayload,
            name: buildChildTitle(record.story.id, index, childTask.originalCriterion),
          },
        )
      }
    }
  }

  const affectedEpicKeys = storyIdFilter.size
    ? new Set(storyRecords.map((record) => record.mapping.epicKey))
    : undefined
  await ensureEpicGroupings(client, manifest, projectMap, storyRecords, affectedEpicKeys)
}

async function syncHistoryDates(client, manifest, projectMap) {
  const workspaceSlug = client.config.workspaceSlug
  const storyRecords = buildStoryRecords(manifest)
  const projectWorkItems = new Map()
  let patchedCount = 0
  let missingCount = 0

  for (const projectConfig of manifest.projects) {
    const project = projectMap.get(projectConfig.key)
    projectWorkItems.set(
      projectConfig.key,
      await client.list(`/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`),
    )
  }

  const patchDates = async (project, item, dates) => {
    if (!item) {
      missingCount += 1
      return
    }

    if (item.start_date === dates.startDate && item.target_date === dates.targetDate) {
      return
    }

    await client.request(
      'PATCH',
      `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${item.id}/`,
      {
        start_date: dates.startDate,
        target_date: dates.targetDate,
      },
    )
    patchedCount += 1
  }

  for (const record of storyRecords) {
    const project = projectMap.get(record.mapping.projectKey)
    const workItems = projectWorkItems.get(record.mapping.projectKey)
    const dates = deriveRecordDates(record.story, record.childTasks.length, record.mapping)
    const parent = workItems.find((item) => item.external_id === `story:${record.story.id}`)

    await patchDates(project, parent, dates)

    for (const [index, childTask] of record.childTasks.entries()) {
      const child = workItems.find((item) => item.external_id === `child:${childTask.externalId}`)
      await patchDates(
        project,
        child,
        deriveChildDates(record.story, index, record.childTasks.length, record.mapping),
      )
    }
  }

  console.log(JSON.stringify({ patchedCount, missingCount }, null, 2))
}

async function syncWingsGoItems(client, manifest, projectMap) {
  const workspaceSlug = client.config.workspaceSlug
  const project = projectMap.get('wingsgo')
  const records = buildStoryRecords(manifest).filter(
    (record) => record.mapping.projectKey === 'wingsgo',
  )
  const workItems = await client.list(
    `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`,
  )
  let patchedCount = 0
  let missingCount = 0

  const patchItem = async (item, payload) => {
    if (!item) {
      missingCount += 1
      return null
    }

    patchedCount += 1
    return client.request(
      'PATCH',
      `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${item.id}/`,
      payload,
    )
  }

  for (const record of records) {
    const parent = workItems.find((item) => item.external_id === `story:${record.story.id}`)
    const parentDates = deriveRecordDates(record.story, record.childTasks.length, record.mapping)

    await patchItem(parent, {
      name: toPlaneItemName(record.parentName),
      description_html: record.descriptionHtml,
      start_date: parentDates.startDate,
      target_date: parentDates.targetDate,
    })

    for (const [index, childTask] of record.childTasks.entries()) {
      const child = workItems.find((item) => item.external_id === `child:${childTask.externalId}`)
      const childDates = deriveChildDates(record.story, index, record.childTasks.length, record.mapping)
      await patchItem(child, {
        name: toPlaneItemName(childTask.title),
        description_html: childTask.descriptionHtml,
        start_date: childDates.startDate,
        target_date: childDates.targetDate,
      })
    }
  }

  console.log(JSON.stringify({ patchedCount, missingCount }, null, 2))
}

async function syncImportedWorkItems(client, manifest, projectMap) {
  const workspaceSlug = client.config.workspaceSlug
  const allRecords = buildStoryRecords(manifest, { ignoreStoryFilter: true }).filter(
    (record) => !projectMap.get(record.mapping.projectKey)?.skipHistorySync,
  )
  const records = storyIdFilter.size
    ? allRecords.filter((record) => storyIdFilter.has(record.story.id))
    : allRecords
  const projectRecords = new Map()
  let patchedCount = 0
  let missingCount = 0

  for (const record of records) {
    const group = projectRecords.get(record.mapping.projectKey) || []
    group.push(record)
    projectRecords.set(record.mapping.projectKey, group)
  }

  const patchItem = async (project, item, payload) => {
    if (!item) {
      missingCount += 1
      return null
    }

    patchedCount += 1
    return client.request(
      'PATCH',
      `/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/${item.id}/`,
      payload,
    )
  }

  for (const [projectKey, groupedRecords] of projectRecords.entries()) {
    const project = projectMap.get(projectKey)
    const [workItems, states] = await Promise.all([
      client.list(`/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/work-items/`),
      client.list(`/api/v1/workspaces/${workspaceSlug}/projects/${project.id}/states/`),
    ])
    const stateMap = new Map(states.map((state) => [state.name, state.id]))

    for (const record of groupedRecords) {
      const parent = workItems.find((item) => item.external_id === `story:${record.story.id}`)
      const parentDates = deriveRecordDates(record.story, record.childTasks.length, record.mapping)
      const desiredStateId = stateMap.get(toPlaneStateName(record.story, record.mapping))

      await patchItem(project, parent, {
        name: toPlaneItemName(record.parentName),
        description_html: record.descriptionHtml,
        ...(desiredStateId ? { state: desiredStateId } : {}),
        start_date: parentDates.startDate,
        target_date: parentDates.targetDate,
      })

      for (const [index, childTask] of record.childTasks.entries()) {
        const child = workItems.find((item) => item.external_id === `child:${childTask.externalId}`)
        const childDates = deriveChildDates(record.story, index, record.childTasks.length, record.mapping)
        const childStateId = stateMap.get(childTask.planeStateName) || desiredStateId
        await patchItem(project, child, {
          name: toPlaneItemName(childTask.title),
          description_html: childTask.descriptionHtml,
          ...(childStateId ? { state: childStateId } : {}),
          start_date: childDates.startDate,
          target_date: childDates.targetDate,
        })
      }
    }
  }

  const affectedEpicKeys = storyIdFilter.size
    ? new Set(records.map((record) => record.mapping.epicKey))
    : undefined
  await ensureEpicGroupings(client, manifest, projectMap, allRecords, affectedEpicKeys)

  console.log(JSON.stringify({ patchedCount, missingCount }, null, 2))
}

function preview(manifest) {
  const storyRecords = buildStoryRecords(manifest)
  const summary = {
    initiative: INITIATIVE_TEXT.name,
    projectCount: manifest.projects.length,
    moduleCount: manifest.modules.length,
    epicCount: manifest.epics?.length || 0,
    milestoneCount: manifest.milestones.length,
    stateCount: manifest.states.length,
    propertyCount: manifest.customProperties.length,
    pageCount: manifest.pages.length,
    storyCount: storyRecords.length,
    childTaskCount: storyRecords.reduce((sum, record) => sum + record.childTasks.length, 0),
  }

  console.log(JSON.stringify(summary, null, 2))
  console.log('')
  for (const record of storyRecords) {
    console.log(
      `${record.story.id} | ${PROJECT_TEXT[manifest.projects.find((item) => item.key === record.mapping.projectKey)?.identifier || 'WGCORE']?.name || record.mapping.projectKey} | ${translateModuleName(record.mapping.module)} | ${toPlaneStateName(record.story, record.mapping)} | child=${record.childTasks.length}`,
    )
  }
}

async function main() {
  const manifest = readJson(manifestPath)

  if (action === 'preview') {
    preview(manifest)
    return
  }

  if (!planeConfig.apiKey || !planeConfig.workspaceSlug) {
    throw new Error('Missing PLANE_API_KEY or PLANE_WORKSPACE_SLUG')
  }

  const client = new PlaneClient(planeConfig)

  if (action === 'cleanup-demo') {
    await cleanupDemoContent(client)
    return
  }

  const { projectMap } = await ensureWorkspacePrerequisites(client, manifest)

  if (action === 'import-structure') {
    for (const projectConfig of manifest.projects) {
      const project = projectMap.get(projectConfig.key)
      if (!project.skipHistorySync) {
        await ensureProjectSetup(client, manifest, project)
      }
    }
    return
  }

  if (action === 'import-pages') {
    await ensureWorkspacePages(client, manifest)
    return
  }

  if (action === 'import-history') {
    await ensureHistory(client, manifest, projectMap)
    return
  }

  if (action === 'sync-dates') {
    await syncHistoryDates(client, manifest, projectMap)
    return
  }

  if (action === 'sync-wingsgo') {
    await syncWingsGoItems(client, manifest, projectMap)
    return
  }

  if (action === 'sync-workitems') {
    await syncImportedWorkItems(client, manifest, projectMap)
    return
  }

  if (action === 'import-all') {
    await cleanupDemoContent(client)
    for (const projectConfig of manifest.projects) {
      const project = projectMap.get(projectConfig.key)
      if (!project.skipHistorySync) {
        await ensureProjectSetup(client, manifest, project)
      }
    }
    await ensureHistory(client, manifest, projectMap)
    await ensureWorkspacePages(client, manifest)
    return
  }

  throw new Error(`Unknown action: ${action}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
