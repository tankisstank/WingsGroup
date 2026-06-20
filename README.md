# WingsGroup workspace

Workspace nay da duoc tach theo vai tro va chot `Markdown` la `single source of truth` cho du an `WingsGroup`.

## Cau truc

- `source/notes/`: ghi chu hop, memo, follow-up, kanban va ghi chu van hanh.
- `source/strategy/`: tai lieu chien luoc va roadmap lam nguon chinh de chinh sua noi dung.
- `source/pricing/`: estimate va bao gia dang Markdown lam nguon.
- `assets/visuals/`: SVG dung chung cho tai lieu nguon va ban publish.
- `publish/html/`: ban HTML de gui doi tac hoac review nhanh.
- `publish/pdf/`: ban PDF xuat cuoi.
- `publish/vercel/`: ban static site tu phuc vu deploy Vercel, giu rieng de tranh anh huong toi source.
- `artifacts/tmp/`: anh render, preview va file tam trong qua trinh canh chinh.

## Nguyen tac lam viec

- Chinh noi dung o `source/` truoc.
- Chi cap nhat `publish/` sau khi noi dung trong `source/` da duoc chot.
- `assets/visuals/` la noi duy nhat chua SVG dung chung cho bo tai lieu.
- `artifacts/tmp/` chi la file tam, co the don dep dinh ky.

## Ghi chu

- Ten du an chinh thuc cua repo nay la `WingsGroup`.
- `publish/vercel/` hien dang la ban deploy tuong doi doc lap va van giu ban copy rieng cua `visuals/` de khong lam gay ban deploy cu.
- Neu muon chuan hoa tiep, buoc tiep theo hop ly la tao script xuat `source -> publish` de tranh sua tay nhieu noi.
