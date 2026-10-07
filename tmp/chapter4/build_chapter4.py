from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "docs" / "chapters"
OUT_PATH = OUT_DIR / "MedShield_Chapter_4_System_Implementation_Results_and_Discussion.docx"
ASSET_DIR = ROOT / "tmp" / "chapter4" / "assets"
SCREENSHOT_DIR = ROOT / "tmp" / "progress_report" / "screenshots"

BLACK = "000000"
NAVY = "17324D"
BLUE = "315F7D"
PALE_BLUE = "EAF2F7"
PALE_GRAY = "F3F5F7"
GRID = "D9D9D9"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin}"))
        if node is None:
            node = OxmlElement(f"w:{margin}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_borders(table, color=GRID, size="6"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = qn(f"w:{edge}")
        el = borders.find(tag)
        if el is None:
            el = OxmlElement(f"w:{edge}")
            borders.append(el)
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), size)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_keep_with_next(paragraph, keep=True):
    paragraph.paragraph_format.keep_with_next = keep


def set_run_font(run, name="Times New Roman", size=None, bold=None, italic=None, color=BLACK):
    run.font.name = name
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), name)
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr)
    run._r.append(fld_char2)
    set_run_font(run, size=10)


def add_body(doc, text, first_line=True, keep=False):
    p = doc.add_paragraph(style="Normal")
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.first_line_indent = Inches(0.5) if first_line else None
    p.paragraph_format.keep_together = keep
    p.add_run(text)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.first_line_indent = Inches(-0.2)
    p.add_run(text)
    return p


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.keep_with_next = True
    return p


def add_caption(doc, label, source=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(label)
    set_run_font(r, size=10, bold=True)
    if source:
        s = doc.add_paragraph()
        s.alignment = WD_ALIGN_PARAGRAPH.CENTER
        s.paragraph_format.space_after = Pt(8)
        r2 = s.add_run(source)
        set_run_font(r2, size=9, italic=True)
    return p


def add_figure(doc, path, width, caption, source):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    r = p.add_run()
    r.add_picture(str(path), width=Inches(width))
    add_caption(doc, caption, source)


def add_table(doc, headers, rows, widths=None, font_size=9, alignments=None, caption=None, page_break_before=False):
    if caption:
        cap = doc.add_paragraph()
        cap.paragraph_format.keep_with_next = True
        cap.paragraph_format.page_break_before = page_break_before
        cap.paragraph_format.space_after = Pt(4)
        rr = cap.add_run(caption)
        set_run_font(rr, size=10, bold=True)
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(str(text))
        set_run_font(r, size=font_size, bold=True, color="FFFFFF")
    for ridx, row in enumerate(rows):
        cells = table.add_row().cells
        for i, text in enumerate(row):
            cell = cells[i]
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ridx % 2 == 1:
                set_cell_shading(cell, PALE_BLUE)
            p = cell.paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.alignment = (alignments[i] if alignments else WD_ALIGN_PARAGRAPH.LEFT)
            r = p.add_run(str(text))
            set_run_font(r, size=font_size)
    if widths:
        for row in table.rows:
            for i, width in enumerate(widths):
                row.cells[i].width = Inches(width)
    after = doc.add_paragraph()
    after.paragraph_format.space_after = Pt(2)
    return table


def make_architecture_diagram():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    out = ASSET_DIR / "medshield_architecture.png"
    canvas = Image.new("RGB", (1800, 900), "white")
    draw = ImageDraw.Draw(canvas)
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 52)
        box_font = ImageFont.truetype("arialbd.ttf", 34)
        body_font = ImageFont.truetype("arial.ttf", 26)
        small_font = ImageFont.truetype("arial.ttf", 23)
    except OSError:
        title_font = box_font = body_font = small_font = ImageFont.load_default()

    draw.text((900, 45), "MedShield Current Runtime Architecture", fill="#000000", font=title_font, anchor="ma")

    boxes = [
        ((90, 210, 420, 500), "Authenticated User", ["Browser session", "Decision review"]),
        ((515, 170, 855, 540), "Frontend", ["Next.js App Router", "React and TypeScript", "Chart.js dashboard"]),
        ((950, 170, 1290, 540), "API Gateway", ["Express and TypeScript", "Validation and authorization", "Server-only credentials"]),
        ((1385, 120, 1715, 390), "Databricks Gold", ["Unity Catalog", "Sales and analytics views", "Runtime source of truth"]),
        ((1385, 505, 1715, 760), "Supabase", ["Authentication", "Identity and audit", "No dashboard measures"]),
    ]
    for idx, (rect, heading, lines) in enumerate(boxes):
        fill = "#EAF2F7" if idx not in (2, 3) else "#DDEBF3"
        draw.rounded_rectangle(rect, radius=24, fill=fill, outline="#315F7D", width=5)
        x1, y1, x2, y2 = rect
        draw.text(((x1 + x2) / 2, y1 + 55), heading, fill="#17324D", font=box_font, anchor="ma")
        y = y1 + 120
        for line in lines:
            draw.text(((x1 + x2) / 2, y), line, fill="#000000", font=body_font, anchor="ma")
            y += 52

    def arrow(start, end, label=None, label_y_offset=-42):
        draw.line([start, end], fill="#17324D", width=8)
        ex, ey = end
        sx, sy = start
        import math
        angle = math.atan2(ey - sy, ex - sx)
        size = 24
        pts = [
            (ex, ey),
            (ex - size * math.cos(angle - 0.5), ey - size * math.sin(angle - 0.5)),
            (ex - size * math.cos(angle + 0.5), ey - size * math.sin(angle + 0.5)),
        ]
        draw.polygon(pts, fill="#17324D")
        if label:
            mx, my = (sx + ex) / 2, (sy + ey) / 2 + label_y_offset
            draw.text((mx, my), label, fill="#000000", font=small_font, anchor="mm")

    arrow((420, 355), (515, 355), "HTTPS")
    arrow((855, 355), (950, 355), "Authenticated API")
    arrow((1290, 300), (1385, 255), "SQL Statement API")
    arrow((1290, 430), (1385, 620), "JWT validation")
    draw.text((900, 825), "Local processed files are offline QA evidence only and are not runtime fallbacks.", fill="#444444", font=small_font, anchor="ma")
    canvas.save(out, quality=95)
    return out


def style_document(doc):
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.9)
    section.bottom_margin = Inches(0.85)
    section.left_margin = Inches(1.25)
    section.right_margin = Inches(1.0)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)

    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    normal.font.size = Pt(12)
    normal.font.color.rgb = RGBColor(0, 0, 0)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.widow_control = True

    for name, size, before, after in (("Title", 16, 0, 14), ("Heading 1", 14, 14, 8), ("Heading 2", 12, 12, 6), ("Heading 3", 12, 10, 4)):
        style = doc.styles[name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.space_before = Pt(before)
        style.paragraph_format.space_after = Pt(after)
        style.paragraph_format.keep_with_next = True
    doc.styles["Title"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_ppr = doc.styles["Title"]._element.get_or_add_pPr()
    title_border = title_ppr.find(qn("w:pBdr"))
    if title_border is not None:
        title_ppr.remove(title_border)
    doc.styles["Heading 1"].paragraph_format.page_break_before = False

    for name in ("List Bullet", "List Number"):
        style = doc.styles[name]
        style.font.name = "Times New Roman"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
        style.font.size = Pt(12)
        style.font.color.rgb = RGBColor(0, 0, 0)
        style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        style.paragraph_format.space_after = Pt(3)

    footer = section.footer
    add_page_number(footer.paragraphs[0])


def build():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    architecture = make_architecture_diagram()
    doc = Document()
    style_document(doc)

    title = doc.add_paragraph(style="Title")
    title.add_run("CHAPTER 4")
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(18)
    r = subtitle.add_run("SYSTEM IMPLEMENTATION RESULTS AND DISCUSSION")
    set_run_font(r, size=14, bold=True)

    add_body(
        doc,
        "This chapter presents the implemented MedShield Business Analytics Decision Support System and the evidence produced by its September 2026 validation cycle. The chapter describes the current runtime architecture, data preparation controls, descriptive and predictive outputs, dashboard implementation, and verification results. The evidence shows that MedShield can reconcile historical sales records, publish governed descriptive views, compare simple forecast benchmarks, and expose reviewable planning scenarios. It does not yet support an operational claim for disease-adjusted forecasting or automated procurement because buyer and product mappings, authenticated end-to-end acceptance, weather-station alignment, and live inventory inputs remain open release gates (MedShield Capstone Group 9, 2026b, 2026e).",
    )
    add_body(
        doc,
        "The results are reported according to their evidentiary status. Historical source-derived values are treated as actual; backward allocations are estimated; forecast outputs remain draft benchmarks; NASA POWER observations are proxy weather data; optimization outputs are scenarios; and unavailable outputs are marked blocked. This classification prevents preliminary model outputs from being presented as approved operational recommendations (MedShield Capstone Group 9, 2026d).",
    )

    add_heading(doc, "4.1 System Overview and Current Architecture", 1)
    add_body(
        doc,
        "MedShield was implemented as an authenticated web-based decision-support application. The interface uses the Next.js App Router with React and TypeScript, consistent with the framework's file-based routing and server-client component model (Vercel, 2026). The browser communicates with a TypeScript and Express API gateway. That gateway owns request validation, authorization checks, and every dashboard query; it also protects Databricks credentials from browser exposure. Supabase Auth supplies identity and session handling, while the analytical measures are read from Databricks Gold views governed through Unity Catalog (MedShield Capstone Group 9, 2026a). Supabase documentation likewise distinguishes authentication from authorization and describes JSON Web Tokens as the mechanism used to scope authenticated access (Supabase, 2026).",
    )
    add_body(
        doc,
        "The current architecture deliberately has no browser JSON, local snapshot, or Supabase analytics fallback. If Databricks or a required Gold object is unavailable, the gateway returns an error and the interface hides analytical values behind an explicit unavailable state. This boundary is important because Unity Catalog is designed to centralize access control, lineage, and auditing for governed data assets (Databricks, 2026). Local processed files remain reproducible QA evidence, but they do not silently substitute for the runtime source of truth.",
    )
    add_figure(
        doc,
        architecture,
        5.3,
        "Figure 4.1. MedShield current runtime architecture",
        "Source: Developed from MedShield Architecture (MedShield Capstone Group 9, 2026a).",
    )
    add_table(
        doc,
        ["Layer", "Implemented technology", "Primary responsibility"],
        [
            ["Presentation", "Next.js 14, React 18, TypeScript, Chart.js", "Authenticated navigation, analytical views, filters, status labels, charts, and exports"],
            ["API gateway", "Express and TypeScript", "Authorization, input validation, Databricks query orchestration, response contracts, and unavailable states"],
            ["Analytical source", "Databricks Gold and Unity Catalog", "Governed sales facts, monthly and yearly summaries, products, areas, transactions, benchmarks, and external-signal evidence"],
            ["Identity and audit", "Supabase Auth and audit store", "User authentication, JWT-backed sessions, account identity, and audit support"],
            ["Offline analytical services", "Python jobs and test modules", "Reconciliation, forecast validation, external-regression assessment, and constrained planning scenarios"],
        ],
        widths=[1.2, 2.0, 3.2],
        font_size=8.5,
        caption="Table 4.1. Implemented system layers and responsibilities",
    )

    add_heading(doc, "4.2 Data Sources and Analytical Scope", 1)
    add_body(
        doc,
        "The implemented dashboard supports annual and monthly sales history from 2017 through 2025. The September evidence pack uses the allocated sales file as its reproducible local source and records both the file hash and the dataset checksum. Disease signals were prepared from Department of Health records covering 2021 to 2025, while NASA POWER supplied provider-derived meteorological proxy observations. The NASA POWER Daily API returns analysis-ready daily solar and meteorological time-series data; in MedShield, those values are explicitly labeled as proxy context and not as official PAGASA observations (National Aeronautics and Space Administration, 2026). Ten PAGASA station files were detected, but no station-to-sales-territory mapping had been approved at the evidence cutoff (MedShield Capstone Group 9, 2026e).",
    )
    add_body(
        doc,
        "The analytical grain varies by output. Sales evidence begins at delivered product-line level, forecast comparisons are evaluated by month for one selected metric and scope, external regression aligns territory-month observations, and planning scenarios operate on a deliberately limited product shortlist. Missing months are preserved as unobserved rather than converted to zero demand. This rule avoids creating artificial demand declines and protects comparisons from incomplete historical periods.",
    )
    add_table(
        doc,
        ["Source", "Coverage used", "Role in Chapter 4", "Publication status"],
        [
            ["MedShield sales", "Dashboard history 2017-2025; 42,165 source rows in revision evidence", "Delivered quantity, net sales, product-month reconciliation, forecast benchmarks, and planning shortlist", "Observed rows after quality exclusions"],
            ["DOH disease data", "2021-2025; exact province labels and onset-date monthly counts", "Retrospective dengue signal for exploratory lagged regression", "Prepared retrospective signal; release dates unavailable"],
            ["NASA POWER", "Daily provider observations aggregated to complete months", "Weather proxy and regression context", "Proxy, not official PAGASA"],
            ["PAGASA station files", "Ten station files detected", "Potential official historical reference", "Blocked pending approved station-to-territory mapping"],
            ["Inventory and supplier inputs", "Not available", "Would support operational EOQ, reorder, allocation, and capacity decisions", "Scenario only"],
        ],
        widths=[1.25, 1.65, 2.45, 1.35],
        font_size=8.2,
        caption="Table 4.2. Data sources, scope, and publication status",
    )

    add_heading(doc, "4.3 Sales Preparation and Data Quality Results", 1)
    add_body(
        doc,
        "The September revision evidence reconciled 42,165 input rows into 35,545 included analytical rows and 6,620 excluded rows. The excluded population consisted of 6,618 duplicate or estimated rows and two records with an invalid metric, date, or product. Within the heatmap-specific audit, the same excluded total was partitioned into 4,825 rejected or unclassified rows, 63 duplicate rows, 1,730 estimated backward-allocation rows, and two invalid date or quantity rows. The equality of the input, included, and excluded counts provides an auditable population boundary for the analyses that follow (MedShield Capstone Group 9, 2026b, 2026e).",
    )
    add_table(
        doc,
        ["Reconciliation component", "Rows", "Interpretation"],
        [
            ["Input rows", "42,165", "All rows inspected by the revision evidence generator"],
            ["Included observed rows", "35,545", "Rows eligible for the scoped sales analyses"],
            ["Rejected or unclassified", "4,825", "Rows outside the approved analytical classification"],
            ["Estimated allocations", "1,730", "Backward-allocated rows excluded from observed heatmap quantities"],
            ["Duplicate rows", "63", "Duplicate records excluded from the heatmap population"],
            ["Invalid date or quantity", "2", "Rows that failed minimum metric validity"],
            ["Total excluded", "6,620", "4,825 + 1,730 + 63 + 2"],
        ],
        widths=[2.1, 1.0, 3.45],
        font_size=8.8,
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT],
        caption="Table 4.3. Sales-row reconciliation",
    )
    add_body(
        doc,
        "The heatmap validation identified 4,483 raw product identities and reconciled quantity across 19,047 product-month groups. Estimated rows were excluded, and one raw product was evaluated at a time so that quantities from unlike pack sizes or product identities were not combined into a misleading total. The current business definition therefore describes quantity as delivered units in source units, not total market demand; mixed packs require normalization before comparison (MedShield Capstone Group 9, 2026c).",
    )

    add_heading(doc, "4.4 Descriptive Sales and Ownership Results", 1)
    add_body(
        doc,
        "The accepted observed population was split into 7,544 Government rows and 28,001 Unknown rows. No Private rows were published because buyer ownership mapping was not approved. Unknown must not be interpreted as Private: it is a separate residual classification for records that do not satisfy the approved buyer rules. The corresponding net sales were PHP 184,370,752.13 for Government and PHP 203,250,641.76 for Unknown, representing 47.56% and 52.44%, respectively, of the PHP 387,621,393.89 scoped total. These shares describe the classified analytical population only and do not establish the company's complete channel mix (MedShield Capstone Group 9, 2026b, 2026e).",
    )
    add_table(
        doc,
        ["Ownership class", "Included rows", "Net sales", "Share of scoped net sales"],
        [
            ["Government", "7,544", "PHP 184,370,752.13", "47.56%"],
            ["Unknown", "28,001", "PHP 203,250,641.76", "52.44%"],
            ["Private", "0 published", "Not reported", "Mapping not approved"],
            ["Total scoped population", "35,545", "PHP 387,621,393.89", "100.00%"],
        ],
        widths=[1.45, 1.1, 2.0, 1.9],
        font_size=8.8,
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.CENTER],
        caption="Table 4.4. Accepted sales rows and net sales by ownership",
    )
    add_body(
        doc,
        "The system also retains a separate financial-ledger audit. Among 35,956 checked ledger rows, 13,469 rows, or 37.46%, differed between the workbook gross-margin value and the value derived from net sales less acquisition cost. The aggregate difference was PHP 172,449,135.25. Because this ledger population differs from the 35,545 observed allocated rows, the denominators cannot be compared as if they represented the same dataset. The discrepancy is therefore preserved as an unresolved source exception rather than being overwritten or certified (MedShield Capstone Group 9, 2026b).",
    )
    add_figure(
        doc,
        SCREENSHOT_DIR / "sales-diagnostics.png",
        6.25,
        "Figure 4.2. Sales diagnostics view with historical net sales and gross profit",
        "Source: MedShield dashboard screenshot captured September 17, 2026.",
    )

    add_heading(doc, "4.5 Product and Territory Prioritization", 1)
    add_body(
        doc,
        "Product prioritization combines revenue contribution with an explicit evidence status. For the Unknown ownership class in Quezon from January through December 2025, 85 raw product identities recorded positive revenue. The five-product shortlist accounted for 41.96% of positive-product revenue, not 80%. This result demonstrates why a top-20% rule cannot automatically be described as an 80/20 concentration finding. The Pareto threshold and the shortlist cap answer different questions and must be reported separately.",
    )
    add_table(
        doc,
        ["Rank", "Raw product identity", "Net sales", "Share", "Observed months"],
        [
            ["1", "KZIDINE 35MG", "PHP 493,260.00", "13.47%", "12"],
            ["2", "GITOR-40 40MG", "PHP 413,000.00", "11.28%", "5"],
            ["3", "CARVIDA 6.25MG", "PHP 255,552.00", "6.98%", "10"],
            ["4", "PHYTOBAS 10MG/ML IV", "PHP 190,900.00", "5.21%", "7"],
            ["5", "CLOVAS 75MG TAB", "PHP 183,300.00", "5.01%", "5"],
            ["", "Top five combined", "PHP 1,536,012.00", "41.96%", ""],
        ],
        widths=[0.5, 2.35, 1.4, 0.85, 0.9],
        font_size=8.5,
        alignments=[WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.CENTER],
        caption="Table 4.5. Quezon 2025 product shortlist for the Unknown ownership class",
    )
    add_body(
        doc,
        "The dashboard presents territory and product views separately so users can inspect revenue contribution without assuming that every area label is geographic or every raw product name is a canonical stock-keeping unit. Final territory-level external-signal joins require approved geographic mappings, and final product-level recommendations require canonical SKU and alias approval (MedShield Capstone Group 9, 2026c).",
    )
    add_figure(
        doc,
        SCREENSHOT_DIR / "product-prioritization.png",
        6.25,
        "Figure 4.3. Product prioritization view with Pareto and ABC evidence",
        "Source: MedShield dashboard screenshot captured September 17, 2026.",
    )

    add_heading(doc, "4.6 Forecast Benchmark Results", 1)
    add_body(
        doc,
        "Forecast validation compared a seasonal-naive benchmark with a last-observed-value benchmark for Government net sales. The forecast origin was December 2025, the series contained 81 observed months, and the final 12-month comparison had nine paired observed months. Both models were evaluated on the same available observations; months without observed values were not zero-filled. Using a matched holdout is essential because forecast metrics are meaningful only when competing methods are assessed over comparable cases. Hyndman and Koehler (2006) similarly emphasize the limitations of accuracy measures when their scale or denominator makes comparisons unstable.",
    )
    add_table(
        doc,
        ["Benchmark", "n", "MAE", "RMSE", "WAPE", "Bias"],
        [
            ["Seasonal naive", "9", "PHP 2,695,359.26", "PHP 3,459,768.58", "85.05%", "PHP -2,574,060.06"],
            ["Last observed value", "9", "PHP 1,987,359.74", "PHP 2,632,312.49", "62.71%", "PHP -1,230,712.16"],
        ],
        widths=[1.45, 0.45, 1.4, 1.4, 0.85, 1.4],
        font_size=8.1,
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT],
        caption="Table 4.6. Government net-sales forecast benchmark comparison",
    )
    add_body(
        doc,
        "The last-observed-value benchmark performed better in this specific comparison. Its MAE was 26.27% lower, its RMSE was 23.92% lower, and its WAPE was 22.34 percentage points lower than the seasonal-naive benchmark. Both bias values were negative, indicating underprediction on average within the paired observations. The result is a model-selection finding for one scope, not a certification for operations: source completeness was still unverified, the origin was eight closed months stale as of September 12, 2026, and only nine paired observations were available (MedShield Capstone Group 9, 2026b, 2026e).",
    )
    add_figure(
        doc,
        SCREENSHOT_DIR / "forecast-modeling.png",
        6.25,
        "Figure 4.4. Forecast modeling view with benchmark metrics and horizon controls",
        "Source: MedShield dashboard screenshot captured September 17, 2026.",
    )

    add_heading(doc, "4.7 External Signal Regression Results", 1)
    add_body(
        doc,
        "An exploratory regression tested whether a one-month-lagged dengue signal improved net-sales prediction for the Unknown ownership class in Quezon. The design is methodologically plausible: Philippine research has shown that meteorological variables and lag structures can be relevant to dengue incidence (Carvajal et al., 2018), and other work has shown that non-prescription medication sales can add behavioral information to respiratory-disease forecasting when evaluated out of sample (Dolan et al., 2023). These studies justify testing an external signal; they do not imply that the signal must improve MedShield's forecast.",
    )
    add_table(
        doc,
        ["Model", "Holdout months", "MAE", "RMSE", "WAPE", "Bias"],
        [
            ["Sales-only baseline", "12", "PHP 118,915.72", "PHP 144,925.10", "38.98%", "PHP 34,265.65"],
            ["Dengue-lag augmented", "12", "PHP 130,885.37", "PHP 156,126.92", "42.90%", "PHP 64,310.87"],
        ],
        widths=[1.55, 0.9, 1.25, 1.25, 0.8, 1.25],
        font_size=8.2,
        alignments=[WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.RIGHT, WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.RIGHT],
        caption="Table 4.7. Exploratory dengue-lag regression comparison for Quezon",
    )
    add_body(
        doc,
        "The augmented model did not improve the result. Its MAE was approximately 10.07% worse than the sales-only baseline, and both RMSE and WAPE also increased. The fitted coefficient for cases per 100 at a one-month lag was negative, but it should not be interpreted as evidence that dengue reduces pharmaceutical demand. The evaluation is retrospective, uses final revised disease counts without historical publication dates, and may reflect omitted variables, product mix, measurement boundaries, or unstable relationships. The correct conclusion is therefore that this tested signal did not improve predictive accuracy for this scope; no causal or operational claim is supported (MedShield Capstone Group 9, 2026b, 2026e).",
    )

    add_heading(doc, "4.8 Prescriptive Planning as a Controlled Scenario", 1)
    add_body(
        doc,
        "The prescriptive layer was implemented as a controlled scenario rather than a procurement recommendation. The solver first maximizes the equal-product fulfillment fraction and then minimizes cost, subject to integer pack sizes, budget, protected stock, and supplier limits. Python tests included an independent exhaustive enumeration and infeasible cases. However, actual on-hand stock, reserved stock, supplier prices, lead times, pack or minimum-order rules, capacity, and client-approved demand were unavailable. User-entered values are consequently assumptions, and the resulting allocation cannot be treated as an approved order (MedShield Capstone Group 9, 2026b).",
    )
    add_body(
        doc,
        "This boundary is consistent with the system's business definitions. Delivered quantity represents fulfilled historical demand, not unmet market demand; workbook gross margin is not company net income; and inventory urgency cannot be asserted without stock, service-level, and lead-time evidence (MedShield Capstone Group 9, 2026c). The interface therefore uses scenario language and requires review before any action.",
    )
    add_figure(
        doc,
        SCREENSHOT_DIR / "prescriptive-planning.png",
        6.25,
        "Figure 4.5. Prescriptive planning view with explicit assumption and scenario controls",
        "Source: MedShield dashboard screenshot captured September 17, 2026.",
    )

    add_heading(doc, "4.9 Dashboard Implementation", 1)
    add_body(
        doc,
        "The dashboard organizes the analytical workflow into overview, sales diagnostics, product prioritization, area prioritization, forecast modeling, prescriptive planning, data upload, sales-data inspection, and weather validation views. The interface distinguishes actual, estimated, draft, proxy, official, scenario, and blocked outputs. These labels are not decorative; they communicate whether the value is source-derived, model-generated, assumption-based, or unavailable. Charts and filtered tables are designed to retain the same analytical scope in the on-screen view and exported data (MedShield Capstone Group 9, 2026d).",
    )
    add_body(
        doc,
        "The overview page leads with net sales, gross profit, peak demand month, and top territory, followed by a yearly trend and model-publication status. This decision-first layout reduces the risk that users interpret a blocked or scenario output as an operational recommendation. The current screenshots also show a historical period selector and a persistent data-freshness label that identify the active source.",
    )
    add_heading(doc, "4.10 System Validation and Acceptance Evidence", 1)
    add_body(
        doc,
        "Validation combined analytical reconciliation, unit tests, browser interaction tests, static type checks, and authorization checks. Fifty Python tests passed across planning, regression, forecasting, ownership, heatmap, metric-definition, pipeline, and financial-reconciliation modules. Thirteen isolated browser cases passed for diagnostics, weighted margin, heatmaps, ownership denominators, forecast exports, regression results, scenario invalidation, and mobile layouts. Frontend and backend TypeScript checks also passed. Playwright is suited to this form of browser-level verification because it can run selected interaction suites headlessly from the command line (Microsoft, 2026).",
    )
    add_table(
        doc,
        ["Validation area", "Observed result", "Status and boundary"],
        [
            ["Row reconciliation", "42,165 input = 35,545 included + 6,620 excluded", "Pass"],
            ["Quantity reconciliation", "19,047 product-month groups matched across scoped modules", "Pass"],
            ["Python analytical tests", "50 tests passed", "Pass"],
            ["Isolated browser tests", "13 cases passed using the actual chart runtime", "Pass; not authenticated end to end"],
            ["TypeScript checks", "Frontend and backend no-emit checks passed", "Pass"],
            ["Anonymous access", "Five protected GET routes and two POST routes returned HTTP 401", "Pass"],
            ["Authenticated workflow", "Repository demo login returned invalid credentials", "Not verified; provisioned session required"],
            ["Live upload refresh", "Isolated pipeline replacement tests passed", "Not verified against the approved live dataset"],
        ],
        widths=[1.55, 2.8, 2.15],
        font_size=8.3,
        caption="Table 4.8. September 2026 validation and acceptance results",
    )
    add_body(
        doc,
        "The validation supports the internal consistency of the analytical pipeline and the behavior covered by the tests. It does not establish full deployment acceptance. The authenticated frontend-to-gateway-to-Databricks-to-chart workflow and the live upload refresh remained unverified because no valid provisioned account was available during the acceptance run. These items are reported as open gates instead of being counted as passed (MedShield Capstone Group 9, 2026b).",
    )

    add_heading(doc, "4.11 Discussion of Findings", 1)
    add_heading(doc, "4.11.1 Data Governance and Traceability", 2)
    add_body(
        doc,
        "The strongest implementation result is traceability. The system records the source population, exclusion reasons, file hashes, mapping status, forecast scope, and model status. The row reconciliation and product-month reconciliation show that analytical outputs can be traced to an explicit population. At the same time, the separate financial-ledger discrepancy demonstrates why governance cannot be reduced to a passing total: two sources can use similar field names while representing different populations or accounting semantics.",
    )
    add_heading(doc, "4.11.2 Benchmarking Before Complexity", 2)
    add_body(
        doc,
        "The benchmark results justify retaining simple models as required comparators. In the tested Government scope, the last-observed-value method outperformed the seasonal-naive method. In the Quezon regression scope, adding a dengue lag made the model worse. Together, the results show that added complexity does not automatically add value. External signals should be promoted only when they improve a paired holdout comparison, retain interpretable scope, and pass the applicable release gates.",
    )
    add_heading(doc, "4.11.3 Decision Support Rather Than Automated Decision Making", 2)
    add_body(
        doc,
        "MedShield's implemented value lies in structured review rather than autonomous action. Managers can inspect sales history, ownership coverage, product concentration, territory results, forecast uncertainty, and planning assumptions in one interface. The system also makes unavailable evidence visible. Empty Private views, blocked PAGASA regression, and scenario-only allocations are more informative than fabricated completeness because they identify the exact approvals or data needed for the next decision.",
    )
    add_heading(doc, "4.11.4 Alignment With Prior Research", 2)
    add_body(
        doc,
        "Prior research supports testing weather, disease, and sales signals at appropriate spatial and temporal grains. Carvajal et al. (2018) showed that rainfall, relative humidity, temperature, and lagged structure were relevant candidates for dengue modeling in Metropolitan Manila. Dolan et al. (2023) showed that medication sales can contribute to respiratory forecasting, but their work also relied on out-of-sample comparison and carefully defined geographic resolution. MedShield's negative dengue-lag result does not contradict those studies; it indicates that usefulness is context-specific and must be demonstrated for the selected product, territory, period, and data quality.",
    )

    add_heading(doc, "4.12 Limitations and Release Gates", 1)
    add_body(
        doc,
        "The results remain subject to four principal release gates. First, authenticated end-to-end workflow evidence has not been completed. Second, buyer ownership and canonical SKU mappings require approval. Third, PAGASA station mapping and sufficient aligned weather history are unresolved. Fourth, operational planning requires approved stock, demand, supplier, pack, budget, lead-time, and capacity inputs. The forecast origin is also stale relative to the September evidence date, disease signals are retrospective final counts rather than as-published historical vintages, and the financial ledger contains a material source discrepancy.",
    )
    add_table(
        doc,
        ["Open gate", "Effect on interpretation", "Evidence required to close"],
        [
            ["Authenticated workflow", "Prevents a deployed end-to-end acceptance claim", "Provisioned account, full browser run, and authenticated screenshots"],
            ["Buyer and SKU mappings", "Prevents complete sector and canonical-product reporting", "Approved buyer map, alias map, and canonical SKU list"],
            ["PAGASA alignment", "Prevents official weather-adjusted model publication", "Approved station-to-territory mapping and sufficient matched history"],
            ["Planning inputs and objective", "Prevents operational procurement recommendations", "Client-approved demand objective, stock, prices, packs, lead times, supplier caps, and budget"],
            ["Financial reconciliation", "Prevents certification of workbook gross margin as fully reconciled", "Source-owner review of 13,469 mismatched ledger rows and population alignment"],
        ],
        widths=[1.5, 2.35, 2.65],
        font_size=8.3,
        caption="Table 4.9. Remaining release gates",
    )

    add_heading(doc, "4.13 Chapter Summary", 1)
    add_body(
        doc,
        "MedShield implements the core components of a historical pharmaceutical decision-support system: an authenticated web interface, governed Databricks-backed analytical views, reproducible sales-quality controls, product and ownership analysis, paired forecast benchmarks, exploratory external-signal testing, and constrained planning scenarios. The September evidence reconciled 42,165 source rows, validated 19,047 product-month groups, and demonstrated that simple benchmarks and explicit status labels can prevent unsupported model claims. The last-observed-value benchmark outperformed the seasonal-naive benchmark for the tested Government scope, while the dengue-lag model worsened MAE for the tested Quezon scope. These findings support continued use of baseline comparison, human review, and release gates before operational publication.",
    )
    add_body(
        doc,
        "Accordingly, the system should be presented as a reviewable historical decision-support platform rather than a live disease-surveillance service, official weather-alert system, or automated procurement engine. The implemented workflow is suitable for capstone demonstration and analytical review within the tested scope, while final deployment acceptance depends on the unresolved authentication, mapping, external-data, financial-reconciliation, and planning-input requirements.",
    )

    doc.add_page_break()
    add_heading(doc, "References", 1)
    refs = [
        "Carvajal, T. M., Viacrusis, K. M., Hernandez, L. F. T., Ho, H. T., Amalin, D. M., & Watanabe, K. (2018). Machine learning methods reveal the temporal pattern of dengue incidence using meteorological factors in metropolitan Manila, Philippines. BMC Infectious Diseases, 18, 183. https://doi.org/10.1186/s12879-018-3066-0",
        "Databricks. (2026). What is Unity Catalog? https://docs.databricks.com/aws/en/data-governance/unity-catalog",
        "Dolan, E., Goulding, J., Marshall, H., Smith, G., Long, G., et al. (2023). Assessing the value of integrating national longitudinal shopping data into respiratory disease forecasting models. Nature Communications, 14, 7258. https://doi.org/10.1038/s41467-023-42776-4",
        "Hyndman, R. J., & Koehler, A. B. (2006). Another look at measures of forecast accuracy. International Journal of Forecasting, 22(4), 679-688. https://doi.org/10.1016/j.ijforecast.2006.03.001",
        "MedShield Capstone Group 9. (2026a). MedShield architecture [Unpublished system documentation].",
        "MedShield Capstone Group 9. (2026b). Section 8 acceptance evidence - September 12, 2026 [Unpublished validation report].",
        "MedShield Capstone Group 9. (2026c). MedShield approved business definitions [Unpublished system documentation].",
        "MedShield Capstone Group 9. (2026d). Dashboard model publication guide [Unpublished system documentation].",
        "MedShield Capstone Group 9. (2026e). Revision evidence as of September 12, 2026 [Data file].",
        "Microsoft. (2026). Running and debugging tests. Playwright documentation. https://playwright.dev/docs/running-tests",
        "National Aeronautics and Space Administration. (2026). POWER Daily API. https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        "Supabase. (2026). Auth. https://supabase.com/docs/guides/auth",
        "Vercel. (2026). Next.js App Router. https://nextjs.org/docs/app",
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.left_indent = Inches(0.5)
        p.paragraph_format.first_line_indent = Inches(-0.5)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        p.add_run(ref)

    doc.core_properties.title = "Chapter 4 System Implementation Results and Discussion"
    doc.core_properties.subject = "MedShield Business Analytics Decision Support System"
    doc.core_properties.author = "MedShield Capstone Group 9"
    doc.core_properties.keywords = "MedShield, Chapter 4, decision support, pharmaceutical analytics, forecasting"
    doc.save(OUT_PATH)
    print(OUT_PATH)


if __name__ == "__main__":
    build()
