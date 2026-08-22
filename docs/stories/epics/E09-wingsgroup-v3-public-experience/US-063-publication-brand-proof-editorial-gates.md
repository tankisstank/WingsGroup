# US-063 Quản trị publication, brand, proof và editorial gate

## Trạng thái

Accepted engineering; Chờ xác nhận quyền publication.

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
- Mười ba editorial assets giữ development/staging-only scope, không được trình bày như legal proof, và không được public khi publication rights chưa được ghi nhận.
- Brand logo/runtime token chỉ đổi sau khi brand owner cung cấp export, token source và confirmation; không dùng unreconciled export.
- English copy/metadata/media và public editorial content phải qua native-quality review trước khi bật locale hoặc publish.
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

## Pending Gates

Proof publication rights, editorial media/English copy, brand token/logo,
legal/privacy/consent và ecosystem destination validation chưa được đóng.
