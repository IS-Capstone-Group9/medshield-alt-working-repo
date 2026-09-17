from pathlib import Path
from PIL import Image, ImageDraw

source = Path(__file__).parent / "aligned_render_v5"
pages = sorted(source.glob("page-*.png"))
thumbs = []
for path in pages:
    image = Image.open(path).convert("RGB")
    image.thumbnail((306, 396))
    thumbs.append((path.stem, image.copy()))

cols = 4
cell_w, cell_h = 326, 436
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#dce5ec")
draw = ImageDraw.Draw(sheet)
for index, (label, image) in enumerate(thumbs):
    x = (index % cols) * cell_w + 10
    y = (index // cols) * cell_h + 30
    draw.text((x, 8 + (index // cols) * cell_h), label, fill="#102a43")
    sheet.paste(image, (x, y))

sheet.save(Path(__file__).parent / "aligned-report-contact-sheet.png")
