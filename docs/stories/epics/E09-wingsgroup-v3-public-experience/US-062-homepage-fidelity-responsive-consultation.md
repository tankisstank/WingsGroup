# US-062 Fidelity homepage và UX tư vấn responsive

## Trạng thái

Accepted engineering; Chờ xác nhận publication/content gates.

## Lane

high-risk

## Product Contract

Homepage WingsGroup v3 phải bám runtime fidelity contract trên desktop, tablet
và mobile; consultation flow phải có fallback nội bộ, consent-aware và không
đưa người dùng tới channel ngoài chưa được duyệt.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/go-live-review-pipeline.md`

## Acceptance Criteria

- Homepage render đúng sáu section, selector contract và không tạo standalone service-router ngoài ecosystem section.
- Mobile navigation có `Liên hệ → #contact` và consultation CTA riêng; header, hero và FAB mở cùng dialog, Escape/focus return hoạt động.
- Editorial rail hiển thị ba governed images với alt tiếng Việt trong explicit local preview; public anonymous media vẫn bị từ chối khi asset pending.
- Proof archive giữ đủ bốn record pending, không biến editorial media thành proof hoặc claim pháp lý.
- Contact fallback hiển thị name/brief, consent bắt buộc và preferred-channel choices pending; submit local preview chỉ ghi run-owned sink, không mở external link.
- Viewport 375/390/768/1024/1280/1440 và reduced-motion evidence không có horizontal overflow hoặc autoplay trái contract.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | E09-20 final re-review: focused regression suites gồm 33 unit tests; component 17 tests. |
| Integration | E09-20 final re-review: `mediaAccess.int.spec.ts` 1 test và WingsGroup foundation/lead suites đạt 22 integration tests. |
| E2E | E09-20 final re-review browser evidence: 375, 390, 768, 1024, 1280 và 1440 checks; no major visual gap. |
| Release | Pending media/publication gates vẫn fail-closed; không có production launch claim. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-20-rereview-2.json` — reviewed SHA `72a28cf6441f5b6269fe68d5e08e1c42beb0b20a`, recommendation `accept`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-30-31-rereview-3.json` — reviewed SHA `ca7ccbae8ec2f5e5186e4a9ce81b4d8f134c7ea6`, bổ sung browser proof cho consent/consultation responsive flow.
- `docs/product/wingsgroup-v3-fidelity-contract.json`

## Pending Gates

Legal/privacy/consent approval, editorial media và English copy approval, brand
token/logo, consultation endpoint owner/SLA/tracking và ecosystem destination
validation vẫn mở.
