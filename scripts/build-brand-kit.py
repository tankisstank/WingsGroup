from __future__ import annotations

import json
import shutil
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BRAND_ROOT = REPO_ROOT / "source" / "brand" / "visual-identity"
OUTPUT_ROOT = REPO_ROOT / "publish" / "brand-kit"
PACKAGE_ROOT = OUTPUT_ROOT / "WingsGroup-web-brand-kit"


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    if PACKAGE_ROOT.exists():
        shutil.rmtree(PACKAGE_ROOT)
    PACKAGE_ROOT.mkdir(parents=True)

    copy_file(BRAND_ROOT / "WEB-BRAND-GUIDE.md", PACKAGE_ROOT / "WEB-BRAND-GUIDE.md")
    copy_file(BRAND_ROOT / "README.md", PACKAGE_ROOT / "README.md")
    copy_file(BRAND_ROOT / "site-brand-reference.json", PACKAGE_ROOT / "site-brand-reference.json")

    for source_pdf in sorted((BRAND_ROOT / "pdf").glob("*.pdf")):
        copy_file(source_pdf, PACKAGE_ROOT / "source-pdf" / source_pdf.name)

    manifests = []
    for manifest_path in sorted((BRAND_ROOT / "exports").glob("*/manifest.json")):
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifests.append(manifest)
        destination_dir = PACKAGE_ROOT / "web-assets" / manifest_path.parent.name
        copy_file(manifest_path, destination_dir / "manifest.json")
        for asset_path in manifest["assets"].values():
            source_asset = BRAND_ROOT / asset_path
            copy_file(source_asset, destination_dir / source_asset.name)

    lines = [
        "# WingsGroup Web Brand Kit",
        "",
        "Bộ asset web master và tài liệu thương hiệu dùng cho hệ sinh thái WingsGroup.",
        "",
        "## Thành phần",
        "",
        "- `WEB-BRAND-GUIDE.md`: quy chuẩn kích thước, CSS pixel, màu và mapping.",
        "- `site-brand-reference.json`: mapping có cấu trúc cho CMS/Payload.",
        "- `web-assets/`: logo master, mark, favicon, Open Graph và manifest theo site.",
        "- `source-pdf/`: brand board PDF nguồn để đối chiếu.",
        "",
        "## Các site",
        "",
    ]
    lines.extend(f"- `{m['siteCode']}` — {m['displayTitle']}" for m in manifests)
    (PACKAGE_ROOT / "PACKAGE-README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    zip_path = OUTPUT_ROOT / "WingsGroup-web-brand-kit.zip"
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in sorted(PACKAGE_ROOT.rglob("*")):
            if path.is_file():
                archive.write(path, path.relative_to(OUTPUT_ROOT).as_posix())

    site_items = "".join(f"<li><strong>{m['displayTitle']}</strong> <code>{m['siteCode']}</code></li>" for m in manifests)
    html = f'''<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>WingsGroup Web Brand Kit</title>
<style>body{{margin:0;background:#f4f7fb;color:#102a43;font:16px/1.6 system-ui,sans-serif}}main{{max-width:920px;margin:48px auto;padding:0 24px}}article{{background:white;border:1px solid #d9e2ec;border-radius:20px;padding:32px;box-shadow:0 12px 40px #102a4314}}h1{{margin-top:0;color:#005090}}a.button{{display:inline-block;background:#005090;color:#fff;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700;margin:8px 8px 8px 0}}a.secondary{{background:#e7f0f8;color:#005090}}code{{background:#eef2f6;padding:2px 6px;border-radius:6px}}li{{margin:8px 0}}</style></head>
<body><main><article><h1>WingsGroup Web Brand Kit</h1>
<p>Bộ asset thương hiệu web master, tài liệu hướng dẫn và brand board nguồn.</p>
<p><a class="button" href="/WingsGroup-web-brand-kit.zip">Tải file ZIP</a><a class="button secondary" href="/WingsGroup-web-brand-kit/WEB-BRAND-GUIDE.md">Mở hướng dẫn</a></p>
<h2>Quy chuẩn nhanh</h2><ul><li>Logo master: <code>2400×800 px</code></li><li>Mark: <code>1024×1024 px</code></li><li>Favicon: <code>512×512 px</code></li><li>Open Graph: <code>1200×630 px</code></li><li>CSS quyết định kích thước hiển thị; không crop hoặc kéo méo asset.</li></ul>
<h2>Thương hiệu</h2><ul>{site_items}</ul><p><a href="/WingsGroup-web-brand-kit/">Duyệt toàn bộ thư mục gói</a></p>
</article></main></body></html>'''
    (OUTPUT_ROOT / "index.html").write_text(html, encoding="utf-8")
    print(f"Package: {zip_path}")
    print(f"Files: {sum(1 for path in PACKAGE_ROOT.rglob('*') if path.is_file())}")


if __name__ == "__main__":
    main()
