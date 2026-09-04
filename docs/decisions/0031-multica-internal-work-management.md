# 0031 Multica Internal Work Management

Date: 2026-08-07

## Status

Accepted

## Context

WingsTravel currently uses Plane as a customer-facing tracking layer. Its
repository adapter maps projects, Epics, stories, acceptance tasks, delivery
proof, dates, and documentation pages. The repository itself remains the
source of truth, and historic Plane API plan restrictions have made remote
synchronization less dependable.

The project now needs a tracker that can also coordinate repository-aware AI
agents, retain their execution history, route work, and automate recurring
operational tasks.

## Decision

Adopt Multica as the internal work-management and agent-execution control plane
through a staged migration. Keep repository documentation, story packets,
proof, and strategy sources authoritative.

Use Multica Projects for delivery surfaces, parent issues for Epics, child
issues for US stories, and staged sub-issues for acceptance criteria. Keep
Plane delivery state, proof status, source link, site, phase, and workstream as
explicit Multica properties so the migration does not discard meaning.

Do not assign imported historical items to agents. Agent assignment and
mentions are reserved for newly authorized work after an explicit pilot.

Plane remains read-only during migration. Its removal, the removal of its
importer, and changes to `AGENTS.md` require a later acceptance decision after
an audited dual-read validation period.

## Alternatives Considered

1. Keep Plane as the active tracker and use Multica only for ad-hoc agent
   tasks. Rejected because it keeps planning, execution, and agent history in
   separate control planes.
2. Replace Plane immediately. Rejected because it risks losing customer-facing
   documentation, delivery-state nuance, and historic traceability.
3. Make Multica the source of truth. Rejected because product contracts,
   evidence, and strategy need versioned repository review and durable links to
   code and tests.

## Consequences

Positive:

- Issues gain agent runs, comments, routing, skills, runtime context, and
  automations in one operational record.
- The workflow no longer depends on Plane plan-gated API capabilities.
- Repository authority and evidence remain reviewable and portable.

Tradeoffs:

- A purpose-built importer and migration validation are required.
- Multica has no proven replacement in this project for Plane Pages and the
  full delivery roadmap view; repository/customer documentation remains needed.
- For a workspace with production data, autonomous agents require a dedicated,
  credential-scoped runtime boundary.

## Chấp nhận rủi ro cho workspace migration

Ngày 2026-08-10, chủ sở hữu dự án chấp nhận dùng runtime đã xác thực hiện tại
cho môi trường Multica migration mới, không phải production. Chủ sở hữu chấp
nhận hoãn service identity riêng, secret manager, runtime cô lập và kho artifact
append-only trong toàn bộ các giai đoạn migration của môi trường mới này. Agent
không được yêu cầu lại phê duyệt tương tự khi workspace đích vẫn là workspace
migration mới đã được chấp nhận.

Chấp nhận này không cho phép deployment, sửa Plane, thay đổi application
production, tiết lộ secret hoặc ghi vào workspace đã có dữ liệu production.
Các cơ chế import xác định vẫn bắt buộc: workspace đích tường minh, dry-run mặc
định, kiểm tra số lượng kỳ vọng, idempotent, bản ghi lịch sử không gán và không
có mention kích hoạt agent.

## Follow-Up

- Implement a dry-run-only importer and compare it with `plane:preview`.
- Define and test the repository-aware Multica agent prompt and skill.
- Pilot one new bounded issue before importing historic work.
- Decide the Plane cutover only after the migration gates pass.
