from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

import fitz
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
REFERENCE_PATH = ROOT / "site-brand-reference.json"
EXPORTS_DIR = ROOT / "exports"

ASSET_KINDS = ("logo-primary", "logo-reverse", "mark", "favicon", "og-image")

# Web master assets are deliberately exported at fixed dimensions. Consumers
# choose the rendered size with CSS in CSS pixels; they should not resize or
# crop the source file during import.
WEB_MASTER_SIZES = {
    "logo": (2400, 800),
    "mark": (1024, 1024),
    "favicon": (512, 512),
    "og-image": (1200, 630),
}

DEFAULT_CROPS = {
    "logo-primary": (0.04, 0.05, 0.68, 0.62),
    "logo-reverse": (0.63, 0.08, 0.93, 0.39),
    "mark": (0.09, 0.04, 0.62, 0.43),
}


def render_pdf_page(pdf_path: Path, zoom: float = 4.0) -> Image.Image:
    doc = fitz.open(pdf_path)
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def crop_norm(image: Image.Image, box: Iterable[float]) -> Image.Image:
    width, height = image.size
    left, top, right, bottom = box
    return image.crop(
        (
            int(left * width),
            int(top * height),
            int(right * width),
            int(bottom * height),
        )
    )


def content_bounds(image: Image.Image, threshold: int = 246):
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    min_x, min_y = width, height
    max_x, max_y = 0, 0

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and not (red >= threshold and green >= threshold and blue >= threshold):
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if min_x > max_x or min_y > max_y:
        return None

    pad_x = max(12, int((max_x - min_x) * 0.04))
    pad_y = max(12, int((max_y - min_y) * 0.04))
    return (
        max(min_x - pad_x, 0),
        max(min_y - pad_y, 0),
        min(max_x + pad_x, width - 1),
        min(max_y + pad_y, height - 1),
    )


def trim_white(image: Image.Image) -> Image.Image:
    bounds = content_bounds(image)
    if not bounds:
        return image.convert("RGBA")
    return image.crop(bounds).convert("RGBA")


def white_to_transparent(image: Image.Image, threshold: int = 248) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()

    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha and red >= threshold and green >= threshold and blue >= threshold:
                pixels[x, y] = (255, 255, 255, 0)

    return rgba


def fit_inside(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    output = image.copy()
    output.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
    return output


def square_canvas(image: Image.Image, size: int = 512) -> Image.Image:
    source = fit_inside(image.convert("RGBA"), int(size * 0.78), int(size * 0.78))
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    canvas.alpha_composite(source, ((size - source.width) // 2, (size - source.height) // 2))
    return canvas


def master_canvas(
    image: Image.Image,
    width: int,
    height: int,
    max_width: int,
    max_height: int,
    background: tuple[int, int, int, int] = (255, 255, 255, 0),
) -> Image.Image:
    """Place a trimmed asset on a fixed-size web master canvas."""
    source = fit_inside(image.convert("RGBA"), max_width, max_height)
    canvas = Image.new("RGBA", (width, height), background)
    canvas.alpha_composite(source, ((width - source.width) // 2, (height - source.height) // 2))
    return canvas


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.strip().lstrip("#")
    return tuple(int(value[index : index + 2], 16) for index in (0, 2, 4))


def make_og_image(site: dict, logo: Image.Image) -> Image.Image:
    primary = hex_to_rgb(site["colors"]["primary"])
    accent = hex_to_rgb(site["colors"].get("accent", "#FDB515"))
    canvas = Image.new("RGB", (1200, 630), primary)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 520, 1200, 630), fill=accent)
    panel = Image.new("RGBA", (920, 360), (255, 255, 255, 245))
    panel_draw = ImageDraw.Draw(panel)
    panel_draw.rounded_rectangle((0, 0, 920, 360), radius=36, fill=(255, 255, 255, 245))
    canvas.paste(panel, (140, 105), panel)

    placed_logo = fit_inside(logo.convert("RGBA"), 640, 220)
    canvas.paste(placed_logo, (280 + (640 - placed_logo.width) // 2, 155), placed_logo)

    try:
      title_font = ImageFont.truetype("arial.ttf", 42)
      body_font = ImageFont.truetype("arial.ttf", 30)
    except OSError:
      title_font = ImageFont.load_default()
      body_font = ImageFont.load_default()

    title = site["displayTitle"]
    tagline = site.get("tagline") or site.get("valueLine") or "Fly further. Together"
    title_box = draw.textbbox((0, 0), title, font=title_font)
    tagline_box = draw.textbbox((0, 0), tagline, font=body_font)
    draw.text(((1200 - (title_box[2] - title_box[0])) // 2, 390), title, fill=primary, font=title_font)
    draw.text(
        ((1200 - (tagline_box[2] - tagline_box[0])) // 2, 545),
        tagline,
        fill=(255, 255, 255),
        font=body_font,
    )

    return canvas


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def export_site(site: dict) -> dict:
    pdf_path = ROOT / site["sourcePdf"]
    rendered = render_pdf_page(pdf_path)
    # Keep the public asset folder aligned with the existing WingsSide alias;
    # the technical tenant code remains `wing-side` in the manifest.
    asset_code = "wingsside" if site["siteCode"] == "wing-side" else site["siteCode"]
    site_dir = EXPORTS_DIR / asset_code
    site_dir.mkdir(parents=True, exist_ok=True)

    crops = site.get("crops", {})
    primary_crop = crop_norm(rendered, crops.get("logoPrimary", DEFAULT_CROPS["logo-primary"]))
    reverse_crop = crop_norm(rendered, crops.get("logoReverse", DEFAULT_CROPS["logo-reverse"]))
    mark_crop = crop_norm(rendered, crops.get("mark", DEFAULT_CROPS["mark"]))

    logo_primary = master_canvas(
        white_to_transparent(trim_white(primary_crop)),
        *WEB_MASTER_SIZES["logo"],
        max_width=2160,
        max_height=560,
    )
    logo_reverse = master_canvas(
        trim_white(reverse_crop),
        *WEB_MASTER_SIZES["logo"],
        max_width=2160,
        max_height=560,
        background=(255, 255, 255, 255),
    )
    mark = master_canvas(
        white_to_transparent(trim_white(mark_crop)),
        *WEB_MASTER_SIZES["mark"],
        max_width=760,
        max_height=760,
    )
    favicon = master_canvas(
        mark,
        *WEB_MASTER_SIZES["favicon"],
        max_width=512,
        max_height=512,
    )
    og_image = make_og_image(site, logo_primary)

    site_code = asset_code
    outputs = {
        "logoPrimary": site_dir / f"{site_code}-logo-primary.png",
        "logoReverse": site_dir / f"{site_code}-logo-reverse.png",
        "mark": site_dir / f"{site_code}-mark.png",
        "favicon": site_dir / f"{site_code}-favicon.png",
        "ogImage": site_dir / f"{site_code}-og-image.png",
    }

    save_png(logo_primary, outputs["logoPrimary"])
    save_png(logo_reverse, outputs["logoReverse"])
    save_png(mark, outputs["mark"])
    save_png(favicon, outputs["favicon"])
    save_png(og_image, outputs["ogImage"])

    manifest = {
        "siteCode": site["siteCode"],
        "displayTitle": site["displayTitle"],
        "sourcePdf": site["sourcePdf"],
        "tagline": site.get("tagline"),
        "valueLine": site.get("valueLine"),
        "colors": site["colors"],
        "webAssetContract": {
            "sourceOfTruth": "This folder's PNG masters",
            "unit": "css-px",
            "doNotCrop": True,
            "doNotUpscale": True,
            "dimensions": {
                "logoPrimary": list(WEB_MASTER_SIZES["logo"]),
                "logoReverse": list(WEB_MASTER_SIZES["logo"]),
                "mark": list(WEB_MASTER_SIZES["mark"]),
                "favicon": list(WEB_MASTER_SIZES["favicon"]),
                "ogImage": list(WEB_MASTER_SIZES["og-image"]),
            },
        },
        "assets": {key: str(path.relative_to(ROOT)).replace("\\", "/") for key, path in outputs.items()},
    }
    (site_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return manifest


def make_contact_sheet(manifests: list[dict]) -> None:
    cells = []
    for manifest in manifests:
        logo = Image.open(ROOT / manifest["assets"]["logoPrimary"]).convert("RGBA")
        favicon = Image.open(ROOT / manifest["assets"]["favicon"]).convert("RGBA")
        og = Image.open(ROOT / manifest["assets"]["ogImage"]).convert("RGB")

        cell = Image.new("RGB", (760, 520), (246, 248, 250))
        preview = Image.new("RGBA", (700, 210), (255, 255, 255, 255))
        logo_preview = fit_inside(logo, 580, 150)
        preview.alpha_composite(logo_preview, ((700 - logo_preview.width) // 2, (210 - logo_preview.height) // 2))
        cell.paste(preview.convert("RGB"), (30, 30))

        icon = fit_inside(favicon, 96, 96)
        cell.paste(icon.convert("RGB"), (30, 270), icon)

        og_preview = fit_inside(og, 320, 168)
        cell.paste(og_preview, (390, 260))

        draw = ImageDraw.Draw(cell)
        draw.text((145, 300), manifest["displayTitle"], fill=(15, 23, 42))
        draw.text((145, 330), manifest["siteCode"], fill=(71, 85, 105))
        cells.append(cell)

    cols = 2
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 760, rows * 520), (226, 232, 240))
    for index, cell in enumerate(cells):
        sheet.paste(cell, ((index % cols) * 760, (index // cols) * 520))

    sheet.save(EXPORTS_DIR / "contact-sheet.png", "PNG", optimize=True)


def main() -> None:
    reference = json.loads(REFERENCE_PATH.read_text(encoding="utf-8"))
    manifests = [export_site(site) for site in reference["sites"]]
    make_contact_sheet(manifests)
    print(f"Exported {len(manifests)} site asset sets to {EXPORTS_DIR}")


if __name__ == "__main__":
    main()
