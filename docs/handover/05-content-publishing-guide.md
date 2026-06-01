# Content And Publishing Guide

## Scope

Describe the content types included in phase 1:

- Pages: core pages and campaign landing pages in `Nội dung > Trang`.
- Posts: editorial/news content in `Nội dung > Bài viết`.
- Landing pages: implemented as structured CMS pages using reusable blocks.
- Shared settings: branding, navigation, footer, contact details, and SEO
  defaults in `Cấu hình site > Cấu hình site`.
- Leads: public form submissions in `Lead > Lead gửi về`.
- Data exchange: imports and exports in `Dữ liệu`.
- Console: role-aware operational entry point in `/admin/console`.
- Wizard: guided page creation in `/admin/page-wizard`.

## Publishing Flow

1. Draft creation
2. Internal review
3. Preview
4. Publish
5. Post-publish verification

Editors stop at draft and preview. Site managers and super admins complete the
publish step.

## Wizard Templates

The quick page wizard ships with these templates:

- Trang chủ site
- Trang giới thiệu
- Trang nội dung
- Landing page chiến dịch
- Trang dịch vụ
- Trang tour / gói du lịch
- Trang điểm đến
- Trang bảo hiểm / chăm sóc
- Trang thu lead
- Trang liên hệ

Wizard output is draft-only. If a site form exists, lead-oriented templates can
auto-attach a `formBlock` scaffold.

## Post Checklist

- Correct site
- Correct locale
- Correct URL or slug
- Copy complete
- Images complete
- CTA or links verified
- Metadata reviewed
- Publisher role is `site-manager` or `super-admin`

## Rollback Notes

- How to unpublish or revert: use Payload versions/drafts on the affected page
  or post.
- Who approves rollback: site manager for assigned site content, super admin for
  platform-wide or cross-site issues.

## Import And Export

- Imports are available for selected content collections and should be treated
  as manager/admin operations.
- Pages and posts imported through data exchange should be reviewed before
  publish.
- Media and form submissions are export-only in this phase.
- User records are not part of routine content import/export.
- Import list UI includes risk guidance and sample files under `public/samples`.
