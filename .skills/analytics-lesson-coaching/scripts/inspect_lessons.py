"""Inspect local PPTX lessons without changing them or executing embedded content.

Uses Python's standard library. Image previews require Pillow and are optional.
This extracts source content, not rendered slide layouts or OCR.
"""

import argparse
import hashlib
import json
import posixpath
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
}


def paragraphs(root):
    return [
        "".join(p.itertext()).strip()
        for p in root.findall(".//a:p", NS)
        if "".join(p.itertext()).strip()
    ]


def relationships(archive, part):
    directory, filename = posixpath.split(part)
    relname = posixpath.join(directory, "_rels", filename + ".rels")
    if relname not in archive.namelist():
        return {}
    result = {}
    for rel in ET.fromstring(archive.read(relname)):
        external = rel.get("TargetMode") == "External"
        target = rel.get("Target", "")
        result[rel.get("Id")] = {
            "type": rel.get("Type", "").rsplit("/", 1)[-1],
            "external": external,
            "target": target if external else posixpath.normpath(posixpath.join(directory, target)).lstrip("/"),
        }
    return result


def preview_images(assets, destination):
    try:
        from PIL import Image, ImageDraw, ImageOps
    except ImportError:
        return {"status": "unavailable", "reason": "Pillow is not installed", "files": []}
    tiles = []
    failures = []
    for asset in assets:
        if not asset.get("image"):
            continue
        try:
            with Image.open(destination / asset["file"]) as original:
                rgba = original.convert("RGBA")
                frame = Image.new("RGBA", rgba.size, "white")
                frame.alpha_composite(rgba)
                frame = frame.convert("RGB")
                tile = Image.new("RGB", (640, 430), "white")
                view = ImageOps.contain(frame, (620, 370))
                tile.paste(view, ((640 - view.width) // 2, 45))
                draw = ImageDraw.Draw(tile)
                draw.text((10, 10), asset["id"] + " slides " + ",".join(map(str, asset["slides"])), fill="black")
                draw.text((10, 415), f"{original.width} x {original.height}", fill="black")
                tiles.append(tile)
        except Exception as exc:
            failures.append({"file": asset["file"], "error": str(exc)})
    files = []
    for offset in range(0, len(tiles), 8):
        batch = tiles[offset:offset + 8]
        sheet = Image.new("RGB", (1280, 430 * ((len(batch) + 1) // 2)), "#dddddd")
        for index, tile in enumerate(batch):
            sheet.paste(tile, ((index % 2) * 640, (index // 2) * 430))
        path = destination / f"images-{offset // 8 + 1:02d}.jpg"
        sheet.save(path, quality=90)
        files.append(path.name)
    return {"status": "generated", "files": files, "failures": failures}


def inspect(deck, destination, previews):
    destination.mkdir(parents=True, exist_ok=True)
    assets = {}
    slides = []
    with ZipFile(deck) as archive:
        names = set(archive.namelist())
        presentation = ET.fromstring(archive.read("ppt/presentation.xml"))
        deck_rels = relationships(archive, "ppt/presentation.xml")
        parts = [deck_rels[item.get("{" + NS["r"] + "}id")]["target"]
                 for item in presentation.findall("p:sldIdLst/p:sldId", NS)]
        for number, part in enumerate(parts, 1):
            root = ET.fromstring(archive.read(part))
            rels = relationships(archive, part)
            entry = {"number": number, "part": part, "text": paragraphs(root),
                     "notes": [], "math_text": [n.text for n in root.findall(".//m:t", NS) if n.text],
                     "assets": [], "charts": [], "external_links": [], "alt_text": []}
            for node in root.findall(".//p:cNvPr", NS):
                if node.get("descr") or node.get("title"):
                    entry["alt_text"].append({k: node.get(k) for k in ("name", "descr", "title") if node.get(k)})
            for rel in rels.values():
                if rel["external"]:
                    entry["external_links"].append(rel)
                    continue
                target = rel["target"]
                if target not in names:
                    continue
                if rel["type"] == "notesSlide":
                    notes = ET.fromstring(archive.read(target))
                    for shape in notes.findall(".//p:sp", NS):
                        placeholder = shape.find("p:nvSpPr/p:nvPr/p:ph", NS)
                        if placeholder is None or placeholder.get("type") not in {"sldImg", "sldNum", "hdr", "ftr", "dt"}:
                            entry["notes"].extend(paragraphs(shape))
                elif rel["type"] == "chart":
                    chart = ET.fromstring(archive.read(target))
                    entry["charts"].append({"part": target, "cached_values": [n.text for n in chart.findall(".//c:v", NS)]})
                elif rel["type"] in {"image", "video", "audio", "media", "oleObject", "package"}:
                    raw = archive.read(target)
                    digest = hashlib.sha256(raw).hexdigest()
                    if digest not in assets:
                        asset_id = f"asset-{len(assets) + 1:03d}"
                        suffix = Path(target).suffix
                        filename = f"media/{asset_id}{suffix}"
                        path = destination / filename
                        path.parent.mkdir(exist_ok=True)
                        path.write_bytes(raw)
                        assets[digest] = {"id": asset_id, "part": target, "sha256": digest,
                                          "file": filename, "image": rel["type"] == "image", "slides": []}
                    if number not in assets[digest]["slides"]:
                        assets[digest]["slides"].append(number)
                    if assets[digest]["id"] not in entry["assets"]:
                        entry["assets"].append(assets[digest]["id"])
            slides.append(entry)
    with deck.open("rb") as source:
        source_hash = hashlib.file_digest(source, "sha256").hexdigest()
    result = {"source": str(deck.resolve()), "sha256": source_hash,
              "bytes": deck.stat().st_size, "slide_count": len(slides), "slides": slides,
              "assets": list(assets.values()), "limits": "XML text, notes, chart caches and embedded media; no layout rendering, OCR, playback or linked-content retrieval."}
    if previews:
        result["previews"] = preview_images(result["assets"], destination)
    (destination / "slides.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [f"# {deck.name}", f"Source SHA-256: {result['sha256']}", f"Slides: {len(slides)}", ""]
    for slide in slides:
        lines += [f"## Slide {slide['number']}", *slide["text"]]
        if slide["math_text"]:
            lines += ["Math: " + " ".join(slide["math_text"])]
        if slide["notes"]:
            lines += ["Notes:", *slide["notes"]]
        if slide["alt_text"]:
            lines += ["Alt text: " + json.dumps(slide["alt_text"], ensure_ascii=False)]
        if slide["assets"]:
            lines += ["Embedded assets: " + ", ".join(slide["assets"])]
        if slide["charts"]:
            lines += ["Chart caches: " + json.dumps(slide["charts"], ensure_ascii=False)]
        lines += [""]
    (destination / "slides.md").write_text("\n".join(lines), encoding="utf-8")
    return {k: result[k] for k in ("source", "sha256", "bytes", "slide_count")}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="A PPTX file or folder of PPTX lessons")
    parser.add_argument("output", type=Path, help="A new evidence folder; existing folders are refused")
    parser.add_argument("--previews", action="store_true", help="Create contact sheets of embedded images using Pillow")
    args = parser.parse_args()
    decks = [args.source] if args.source.is_file() else sorted(args.source.glob("*.pptx"))
    if not decks or any(deck.suffix.lower() != ".pptx" for deck in decks):
        parser.error("Provide a PPTX file or a folder containing PPTX files")
    if args.output.exists():
        parser.error("Output already exists; choose a new folder to preserve earlier evidence")
    args.output.mkdir(parents=True)
    manifest = []
    for index, deck in enumerate(decks, 1):
        manifest.append(inspect(deck, args.output / f"chapter-{index}", args.previews))
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"decks": len(manifest), "slides": sum(d["slide_count"] for d in manifest), "manifest": str((args.output / "manifest.json").resolve())}))


if __name__ == "__main__":
    main()
