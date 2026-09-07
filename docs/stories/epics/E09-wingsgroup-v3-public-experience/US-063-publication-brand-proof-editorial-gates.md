# US-063 Quản trị publication, brand, proof và editorial gate

## Trạng thái

Accepted engineering; Chờ xác nhận các quyền publication còn lại.

## Lane

high-risk

## Product Contract

WingsGroup v3 chỉ được công bố claim, proof, logo/token và editorial media khi
đủ bằng chứng đúng loại. Nội dung pending phải được hiển thị trung tính hoặc
ẩn fail-closed; kiểm thử pass không thay thế phê duyệt của owner.

## Relevant Product Docs

- `docs/product/wingsgroup-v3-release-gates.json`
- `docs/product/wingsgroup-v3-media-manifest.json`
- `docs/product/wingsgroup-v3-fidelity-contract.json`
- `docs/product/editorial-operations.md`

## Acceptance Criteria

- Legal identity chỉ dùng exact registered identity và approved relationship wording; không suy diễn thêm corporate structure, review, award hoặc certification claim.
- Proof record chỉ rời pending khi có source/issuer, context/date, publication permission và media provenance; bốn record pending vẫn được kiểm đếm rõ.
- Mười ba editorial assets đã có site-scope và quyền WingsGroup production editorial use trong media manifest; không được trình bày như legal proof, và runtime publication vẫn cần governed production import, bilingual alt text, provenance và verified derivatives.
- Brand logo/runtime token đã được triển khai từ brand kit được owner duyệt tại SHA `0c45339b55d6aa7e0138aa0fbe1ddfc8a4c08085`; các export chưa reconcile tiếp tục bị chặn.
- English route/chrome/metadata/copy đã có native-quality editorial acceptance; policy/legal publication vẫn qua gate riêng trước khi publish.
- Release-gates report phân biệt accepted engineering với human publication approval và giữ production decision ở trạng thái blocked khi gate mandatory còn pending.

## Validation

| Layer | Expected proof |
| --- | --- |
| Unit | E09-00-11 final re-review: contract/media tests 18 passed; transaction and tenant guards passed. |
| Platform | E09-20 final re-review: public pending media denied, preview-only media available, four pending proof rows and three editorial images verified. |
| Release | E09-50-51 final re-review: 27/27 local checks and route/security evidence; launch recommendation remains blocked by human publication gates. |

## Evidence

- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-00-11-rereview-2.json` — accepted SHA `547ab08a6b0bea30664ece2d5537d7a86833d1b1`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-20-rereview-2.json` — accepted SHA `72a28cf6441f5b6269fe68d5e08e1c42beb0b20a`.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-fidelity-20260814/reports/E09-50-51-rereview-1.json` — accepted engineering correction at SHA `ebb4175b2b104f1b564232f7051282bc3881f574`, production launch blocked.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-brand-kit-20260823/reports/WP-BRAND-01.json` — approved brand kit implementation at SHA `0c45339b55d6aa7e0138aa0fbe1ddfc8a4c08085`.
- `docs/product/wingsgroup-v3-media-manifest.json` — exactly 13 WingsGroup editorial assets with approved production-use rights and governed runtime restrictions.
- `/home/docker-admin/.codex-orchestrator/runs/wings-e09-en-editorial-audit-20260824/reports/EN-EDITORIAL-03-final.json` — independent Terra accepted SHA `95e887ec6da2f74a1a7403f0d8e4e62de95cc85d`, no P0/P1/P2 public-English findings.

## Pending Gates

Privacy/consent source contract đã được stakeholder duyệt ngày `2026-08-24`;
runtime policy/consent proof và production lead delivery vẫn là release work
riêng. Proof publication vẫn optional/non-blocking và fail-closed; consultation
channels và ecosystem destinations cũng optional/fail-closed khi chưa có
endpoint/destination evidence.
Brand token/logo, 13-asset site-scope/publication authorization và English native
editorial review đã approved, nhưng không phải production launch approval.
