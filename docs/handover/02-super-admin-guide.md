# Super Admin Guide

## Responsibilities

- Platform-wide governance
- Site configuration
- User and role assignment
- Final publishing authority if applicable

## Core Tasks

### Access The Admin

1. Open `/admin`.
2. Sign in with the handed-over super admin account.
3. Open `/admin/console` or use `Console vận hành` in the admin navigation.
4. Use the console metrics to check sites, pages, drafts, media, forms, and
   lead submissions.

### Manage Sites

1. Open `Nâng cao > Site`.
2. Create or update site records.
3. Open `Cấu hình site > Cấu hình site` to maintain branding, navigation,
   contact details, and SEO defaults.
4. Review supported locales before handing a site to editors.

### Manage Users

1. Open `Nâng cao > Người dùng`.
2. Create the user.
3. Assign one role: `super-admin`, `site-manager`, or `editor`.
4. Assign site scope for `site-manager` and `editor`.
5. Disable, delete, or rotate access when a person leaves the project.

### Publish And Data Exchange

1. Super admins can publish pages and posts.
2. Super admins can use `Dữ liệu > Nhập dữ liệu` and `Dữ liệu > Xuất dữ liệu`.
3. Imported pages and posts default to draft where supported, then must be
   reviewed before publish.
4. Media and lead submissions are export-only in this phase.

## Safety Notes

- Sensitive settings: site domains, active status, user roles, and assigned
  sites.
- Fields restricted to super admin: user role and site assignment.
- Editors cannot publish directly; escalate publish requests to a site manager
  or super admin.

## Local Production Smoke

Use `scripts/start-local-production.ps1` from PowerShell to build, copy
standalone static assets, and run the local production server with a writable
SQLite database.
