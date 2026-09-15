from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle, KeepTogether

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'outputs' / 'progress_report'
TMP = ROOT / 'tmp' / 'progress_report'
SHOTS = TMP / 'screenshots'
OUT.mkdir(parents=True, exist_ok=True)
PDF = OUT / 'MedShield_Chapter_4_Progress_Report_Objective_Aligned_September_2026.pdf'

styles = getSampleStyleSheet()
body = ParagraphStyle('Body', parent=styles['BodyText'], fontName='Helvetica', fontSize=10.2, leading=15, alignment=TA_JUSTIFY, firstLineIndent=28, spaceAfter=8, textColor=colors.black)
h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=TA_LEFT, spaceBefore=8, spaceAfter=7, textColor=colors.black)
h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=11.2, leading=14, alignment=TA_LEFT, spaceBefore=8, spaceAfter=6, textColor=colors.black)
center_h = ParagraphStyle('CenterH', parent=h1, alignment=TA_CENTER)
caption = ParagraphStyle('Caption', parent=body, fontName='Helvetica-BoldOblique', alignment=TA_CENTER, firstLineIndent=0, fontSize=9.5, leading=12, spaceBefore=5, spaceAfter=8)
table_caption = ParagraphStyle('TableCaption', parent=body, fontName='Helvetica-Bold', alignment=TA_CENTER, firstLineIndent=0, fontSize=9.5, leading=12, spaceBefore=5, spaceAfter=5)
source_note = ParagraphStyle('SourceNote', parent=body, fontName='Helvetica-Oblique', alignment=TA_LEFT, firstLineIndent=0, fontSize=8, leading=10, spaceBefore=4, spaceAfter=8)
cover_title = ParagraphStyle('CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=21, leading=29, alignment=TA_CENTER, textColor=colors.black)
cover = ParagraphStyle('Cover', parent=body, fontName='Helvetica-Bold', fontSize=10.5, leading=14, alignment=TA_CENTER, firstLineIndent=0, spaceAfter=0)

def institutional_header(canvas, doc):
    canvas.saveState()
    y = 10.52 * inch
    canvas.drawImage(str(TMP/'ust-seal.png'), 0.86*inch, 9.78*inch, width=.68*inch, height=.68*inch, preserveAspectRatio=True, mask='auto')
    canvas.drawImage(str(TMP/'cics-seal.png'), 6.95*inch, 9.76*inch, width=.68*inch, height=.72*inch, preserveAspectRatio=True, mask='auto')
    canvas.setFont('Helvetica-Bold', 9.2)
    for i, line in enumerate(['UNIVERSITY OF SANTO TOMAS','College of Information and Computing Sciences','Department of Information Systems','1st Semester AY 2026-2027']):
        canvas.drawCentredString(4.25*inch, y-i*.16*inch, line)
    canvas.restoreState()

doc = SimpleDocTemplate(str(PDF), pagesize=letter, rightMargin=.8*inch, leftMargin=.8*inch, topMargin=1.28*inch, bottomMargin=.68*inch, title='Capstone 2 Progress Report for Chapter 4', author='ethanangeles-gab')
story=[]

def P(text): story.append(Paragraph(text, body))
def H(text, level=1): story.append(Paragraph(text, h1 if level==1 else h2))
def PB(): story.append(PageBreak())
def T(headers, rows, widths, title=None, source=None):
    parts=[]
    if title:
        parts.append(Paragraph(title, table_caption))
    data=[[Paragraph(str(x), ParagraphStyle('th', parent=body, fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white, alignment=TA_CENTER, firstLineIndent=0, spaceAfter=0)) for x in headers]]
    for row in rows:
        data.append([Paragraph(str(x), ParagraphStyle('td', parent=body, fontSize=8, leading=10, alignment=TA_LEFT if i in (0,len(row)-1) else TA_CENTER, firstLineIndent=0, spaceAfter=0)) for i,x in enumerate(row)])
    table=Table(data,colWidths=[w*inch for w in widths],repeatRows=1,hAlign='CENTER')
    cmds=[('BACKGROUND',(0,0),(-1,0),colors.HexColor('#1F4E78')),('TEXTCOLOR',(0,0),(-1,0),colors.white),('GRID',(0,0),(-1,-1),.45,colors.HexColor('#D9D9D9')),('VALIGN',(0,0),(-1,-1),'MIDDLE'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]
    for r in range(2,len(data),2): cmds.append(('BACKGROUND',(0,r),(-1,r),colors.HexColor('#EAF2F8')))
    table.setStyle(TableStyle(cmds)); parts.append(table)
    if source:
        parts.append(Paragraph(source, source_note))
    story.extend([KeepTogether(parts),Spacer(1,8)])
def F(path, text, width=6.75):
    image=Image(str(path),width=width*inch,height=width*inch*ImageReaderSize(path)[1]/ImageReaderSize(path)[0])
    story.append(KeepTogether([image,Paragraph(text,caption)]))
def ImageReaderSize(path):
    from PIL import Image as PILImage
    with PILImage.open(path) as im: return im.size

# Cover
story += [Spacer(1,.88*inch), Paragraph('A Prescriptive Analytics Driven Decision<br/>Support System for Pharmaceutical Demand<br/>Forecasting and Planning in MedShield<br/>Pharmaceutical Corporation',cover_title), Spacer(1,.7*inch), Paragraph('A Capstone Project Progress Report Presented to the<br/>Department of Information Systems<br/>College of Information and Computing Sciences<br/>University of Santo Tomas',cover), Spacer(1,.42*inch), Paragraph('In partial fulfillment<br/>of the requirements for the degree of<br/>Bachelor of Science in Information Systems',cover), Spacer(1,.4*inch), Paragraph('Angeles, Ethan Gabriel C.<br/>Atabelo, Kerr Lawrence T.<br/>Benedicto, Adrian Lei M.<br/>San Miguel, Keith Nicolai R.',cover), Spacer(1,.28*inch), Paragraph('Joseph Richard G. Catubag, MBA',cover), Spacer(1,.38*inch), Paragraph('September 2026',cover), PageBreak()]

story += [Paragraph('Chapter 4',center_h),Paragraph('Results and Discussion',center_h)]
P('This progress report presents the updated implementation and verification results of the MedShield Pharma Corporation Decision Support System. It aligns the current dashboard with the general and specific objectives stated in Chapter 1, the combined CRISP-DM and SEMMA methodology in Chapter 3, and the descriptive, predictive, and prescriptive paths in the MedShield North Star Diagram. The revision distinguishes completed dashboard capability from analytical methods that still require validated source data or operational inputs.')
H('4.1 Presentation of Results')
P('The revised DSS now operates through a Next.js dashboard, a TypeScript API gateway, and Python analytical services. The approved project scope is sales history from 2017 onward across MedShield service areas, even though the attached Capstone paper still states a 2021-2025 study window in Chapters 1 and 3. The paper and the repository North Star must therefore be amended to use the broader period. Metric availability remains source-dependent: 2017-2019 records cannot support validated Net CP revenue analysis until their financial mapping is repaired. The changes are recorded in Git commit 4d00c29 on branch ega_medshieldup3.')
P('The implementation distinguishes descriptive evidence, forecast estimates, and scenario outputs. Actual observations override estimates whenever current-year actual data becomes available. Missing observations remain unavailable rather than being converted to zero. Forecast and prescriptive outputs remain draft or scenario evidence and are not treated as approved procurement instructions.')
T(['Component','Implemented progress','Current qualification'],[
['Calendar coverage','The approved scope and All Years interface span 2017 through the current calendar year.','2017-2019 Net CP revenue remains unavailable until reconciled.'],
['Overview and Sales Diagnostics','Single Year and Y/Y use monthly granularity; All Years uses annual granularity.','Current-year estimates stop at the current Philippine month.'],
['Product Prioritization','Revenue Pareto with cumulative contribution, ABC, portfolio, and scoped trends.','Y/Y is removed; the companion trend is monthly or yearly.'],
['Buyer clustering','Government, Private, Internal, and Unknown are shared across DSS modules.','Classification reflects defined source-label rules.'],
['Forecasting','Current-month windows support 3, 6, and 12 months with historical validation.','Baseline models remain draft and source age is disclosed.'],
['Prescriptive planning','Pareto shortlist and integer-pack allocation scenario.','Operational inputs still require approval.']], [1.25,3.1,2.3], 'Table 4.1 Current DSS Implementation Status', 'Source: MedShield DSS implementation at Git commit 4d00c29 and live verification completed on September 15, 2026.')

PB(); H('4.1.1 Alignment With the Study Objectives',2)
P('The general objective is to develop an integrated DSS by December 2026 that improves demand visibility and reduces expiry-driven wastage for the December 2026 and succeeding planning cycles. The following matrix connects each specific objective to its stated method, current dashboard evidence, and present completion boundary. The historical period in Specific Objective 1 is updated to 2017 onward; corresponding wording in Chapters 1 and 3 and the current North Star transcription remains a required documentation amendment.')
T(['No.','Specific objective and intended method','Current DSS evidence','Alignment status'],[
['1','Analyze validated sales from 2017 onward by territory using STL decomposition and year-over-year analysis.','Monthly Single Year and Y/Y views, annual All Years summaries, territory filters, seasonality evidence, and completeness labels.','Partial: time-grain and baseline views exist; 2017-2019 Net CP and formal STL publication evidence remain unresolved.'],
['2','Prioritize products, territories, and accounts using 80/20 analysis and XGBoost-supported ABC classification.','Revenue Pareto, deterministic ABC bands, product table, area analysis, demand-growth views, and buyer-cluster filters.','Partial: observed Pareto/ABC is implemented; canonical SKU, customer master, and provisional XGBoost remain pending.'],
['3','Forecast territory demand from December 2026 onward using Prophet with validated DII and RSI regressors plus XGBoost urgency scoring.','Rolling 3, 6, and 12-month windows, actual-versus-holdout evidence, simple baselines, error metrics, and source-age warnings.','In progress: forecast workflow exists; Prophet, DII, RSI, and XGBoost outputs are not yet published as validated models.'],
['4','Improve inventory planning and target expiry-driven wastage at or below 5% using EOQ, ROP, safety stock, MCDA, and linear programming.','Pareto-scoped integer-pack allocation scenarios with demand, budget, stock, pack, and supplier constraints.','Scenario only: operational inventory, expiry, lead-time, cost, budget, and outcome data are incomplete.'],
['5','Present five DSS modules with upload validation, alerts, collaborative filtering, and decision support.','Sales Diagnostic, Product Prioritization, Area Prioritization, Forecast Modeling, Prescriptive Planning, and governed data upload are available.','Partial: core modules and ingestion exist; official signal alerts, collaborative filtering, and measured outcomes remain pending.']], [.42,2.35,2.35,1.58], 'Table 4.2 Alignment of Study Objectives Methods and Current DSS Evidence', 'Source: Capstone paper, Chapter 1, Sections 1.3.1 and 1.3.2, pages 11-12; Chapter 3 methodology; MedShield North Star; and current DSS verification. The study-period wording reflects the approved 2017-onward correction.')

PB(); H('4.1.2 Alignment With CRISP-DM and SEMMA',2)
P('CRISP-DM governs the project from business understanding through deployment. The updated 2017-onward scope, study objectives, and business definitions provide Business Understanding; sales, DOH, PAGASA, and weather-provider coverage reviews provide Data Understanding; ingestion validation, product and area mapping, period completion, and analytical aggregation provide Data Preparation. The current Modeling evidence is strongest in descriptive Pareto, trend, and classification outputs. Predictive outputs remain baseline or draft evidence, and prescriptive outputs remain scenarios. Evaluation uses reconciliation checks, frozen historical origins, holdout metrics, and regression tests. Deployment is represented by the authenticated dashboard and service interfaces, but model publication still requires review gates.')
P('SEMMA operates within the analytical phase. Sample selects trusted historical records; Explore profiles missing periods, rejected rows, aliases, territories, and trends; Modify standardizes fields and builds time, product, area, buyer, and external-signal features; Model applies the approved descriptive, predictive, and prescriptive methods when their inputs are ready; Assess compares outputs against baselines and records limitations before publication. This structure prevents the dashboard from presenting a visible chart as proof that its underlying model has completed methodological validation.')

H('4.2 Data Analysis')
P('The updated analytical design follows a consistent time-grain rule across the approved 2017-onward scope. A selected year is examined by month because month-level movement supports seasonality and planning analysis. All Years is summarized annually to preserve long-term comparability without crowding the interface. Y/Y comparison is retained only where direct month-aligned comparison is analytically meaningful. Every output must also show whether the selected metric is available and validated for the chosen year.')
P('Product prioritization now uses the Pareto principle directly. Products are ranked from highest to lowest net sales revenue, shown as bars, while cumulative contribution is plotted as a percentage line. ABC classes, the product table, portfolio view, and companion time trend are recalculated from the same selected period.')
P('Buyer classification is expressed through four mutually exclusive implementation clusters. Government includes national government, public hospitals, and accounts explicitly named as LGUs or government institutions. Private includes generic provincial sales areas not explicitly named as LGUs, private hospitals, pharmacy accounts, and individual sales accounts. Internal isolates MedShield business labels. Remaining records are Unknown. This taxonomy refines the paper\'s earlier Government, Hospital, and Pharmaceutical categories: Government maps directly, private hospitals and pharmacies roll into Private, Internal is excluded from external territory performance, and Unknown remains an explicit data-quality class. Chapters 1 and 3 should adopt this crosswalk so one customer-type definition is used throughout the study.')
T(['Buyer cluster','Observed records','Interpretation'],[['Government','7,544','Explicit national government, public hospital, or LGU labels.'],['Private','22,523','Generic provincial, hospital, pharmacy, or individual-account labels.'],['Internal','4,901','MedShield administration and internal business-line records.'],['Unknown','577','Records not classifiable under the other rules.']], [1.35,1.35,4.0], 'Table 4.3 Buyer Cluster Classification Results', 'Source: MedShield processed sales classifications and live cluster-count verification completed on September 15, 2026. Counts represent classified records, not market share.')
P('These are classification coverage counts from the September 15, 2026 live verification, not market-share estimates. Revenue and quantity shares are calculated only within the selected cluster and analytical scope.')
H('4.2.1 Financial Data Limitation',2)
P('The 2017-onward scope does not imply that every metric is complete for every year. Local records for 2017, 2018, and 2019 currently contain zero values in the approved Net CP field used for net sales revenue. Gross sales fields exist, but substituting them would change the approved financial definition. These years remain part of the study period for available quantities and source-quality analysis, while revenue and revenue-derived KPIs must be marked unavailable until historical ingestion and year-specific financial mappings are repaired and reconciled.')

PB(); H('4.3 Dashboard')
P('The dashboard integrates descriptive, predictive, and prescriptive views into a common interface. Time filters change the underlying aggregation, buyer clusters use one shared rule, actual observations remain distinct from estimates, and scenario recommendations display their evidence and limitations.')
H('4.3.1 Executive Overview',2)
P('The Executive Overview summarizes cumulative revenue, current-year outlook, peak periods, and leading customer context. A selected year displays January through December, Y/Y comparison aligns both selected years by calendar month, and All Years displays annual totals from 2017 through the current year.')
F(SHOTS/'overview.png','Figure 4.1 Updated MedShield DSS Executive Overview')
P('The 2026 annual value is labeled as an estimate through the current month. Philippine calendar time determines the cutoff. When actual monthly data is loaded, it replaces the corresponding estimate while later unavailable months remain outside the displayed current-year evidence.')

PB(); H('4.3.2 Sales Diagnostics',2)
P('Sales Diagnostics applies the same time-grain rules to net sales, gross profit, growth, and margin analysis. Single Year displays monthly values, Y/Y compares matching months, and All Years retains an annual comparison. Percentage growth is accompanied by nominal peso movement, and missing months are not treated as zero sales.')
F(SHOTS/'sales-diagnostics.png','Figure 4.2 Updated Sales Diagnostics with Dynamic Time Grain')
P('Gross margin is derived from aggregate gross profit divided by aggregate net sales for the selected scope. Labels distinguish revenue, recorded gross profit, rates, and delivered source units to reduce metric ambiguity.')

PB(); H('4.3.3 Product Prioritization',2)
P('Product Prioritization no longer offers Y/Y comparison because it ranks the portfolio rather than comparing two annual series. Its primary visualization is a Pareto chart: descending net sales revenue bars and cumulative revenue contribution on a secondary percentage axis.')
F(SHOTS/'product-prioritization.png','Figure 4.3 Product Revenue Pareto and ABC Portfolio Views')
P('For a selected year, the companion trend shows monthly revenue for leading products. Under All Years it changes to yearly granularity. ABC distribution, portfolio position, cumulative contribution, and ranking rows are recalculated from the same selected period.')

PB(); H('4.3.4 Area Prioritization',2)
P('Area Prioritization separates buyer ownership from geography and customer channel. Users select Government, Private, Internal, or Unknown, then examine revenue share and product-specific quantity share by geography or channel.')
F(SHOTS/'area-prioritization.png','Figure 4.4 Buyer Cluster and Geographic Distribution Analysis')
P('Explicit institutional wording takes precedence. A province name alone is treated as a private sales area, while an explicitly named LGU or provincial government is Government. MedShield business-line labels are Internal. Unknown remains visible so records are not silently reassigned.')

PB(); H('4.3.5 Forecast Modeling',2)
P('Forecast Modeling begins with the current Philippine calendar month. The selector provides 3, 6, and 12 months, with the current month counted as month one. On September 15, 2026, the windows are September-November 2026, September 2026-February 2027, and September 2026-August 2027. This rolling design includes the December 2026 planning period required by Specific Objective 3 while remaining usable for later monthly cycles.')
F(SHOTS/'forecast-modeling.png','Figure 4.5 Current Month Forecast and Historical Validation')
P('The chart retains actual observations, retrospective holdout predictions, future baseline forecasts, and empirical historical-error ranges. Missing calendar months remain visible as gaps. The service discloses the training origin and age of available sales history. Seasonal naive and last-observed-value forecasts are the required comparison baselines. The paper\'s intended Prophet, DII, RSI, and XGBoost models are not yet represented as validated published outputs. MAE, RMSE, MAPE or WAPE, bias, coverage, and frozen forecast origin must be reported on identical observed periods before any candidate is promoted.')

PB(); H('4.3.6 Prescriptive Planning',2)
P('Prescriptive Planning uses the same buyer clusters. It ranks products by positive net sales over the latest available 12 months, selects the top 20 percent capped at five products, and prepares an integer-pack allocation scenario.')
F(SHOTS/'prescriptive-planning.png','Figure 4.6 Buyer Scoped Prescriptive Planning Scenario')
P('The objective prioritizes fulfilled-demand fractions and then minimizes cost at the best attainable service level. It is an interim scenario that supports the North Star question of inventory optimization and loss reduction. Full alignment with Specific Objective 4 requires approved EOQ, ROP, safety-stock, MCDA, and linear-programming inputs, including current inventory, expiry, lead time, ordering and holding cost, pack size, supplier limits, budget, capacity, and service-level policy. Results remain scenario-only until these inputs and policies are approved.')

PB(); H('4.3.7 Data Upload Page',2)
P('The Data Upload page retains source-import controls and an ingestion status log. It supports continued loading of sales and structured data without hard-coding the final year. Current-year actuals are designed to supersede estimates when new monthly records arrive.')
F(SHOTS/'data-upload.png','Figure 4.7 Updated Data Upload and Ingestion Status Page')
P('The workflow remains subject to validation, duplicate handling, financial reconciliation, and lineage. The unresolved 2017-2019 Net CP issue must be corrected before a refreshed snapshot can be described as financially validated.')

PB(); H('4.3.8 MedShield DSS KPI Tree',2)
P('The revised KPI tree uses the Chapter 1 general objective as its root and the five specific objectives as its primary branches. Each branch links the North Star question to the method stated in Chapter 3 and to the measures needed to demonstrate completion. CRISP-DM governs the full lifecycle, SEMMA structures the analytics work, and data-quality and human-review gates apply before publication.')
F(TMP/'kpi-tree.png','Figure 4.8 Objective-Aligned MedShield DSS KPI Tree',6.75)
P('The first branch measures the 2017-onward sales baseline; the second measures product, territory, and account prioritization; the third measures forecast accuracy and improvement over a simple baseline; the fourth measures inventory and wastage outcomes; and the fifth measures governed dashboard delivery. The expiry-driven wastage target cannot yet be evaluated because actual inventory, expiry, supplier, and fulfillment outcomes are incomplete.')

PB(); H('4.4 Summary of Findings')
P('The current progress establishes a functioning analytical dashboard and a traceable route from the study objectives to measurable outputs. Major improvements are the 2017-onward dynamic calendar, consistent monthly and annual time grains, direct product Pareto analysis, the buyer-cluster crosswalk, current-month forecast horizons, explicit model-status labels, and scenario-safe planning.')
P('The alignment review also identifies the difference between implemented interface capability and completed methodology. Descriptive evidence is the most mature. Predictive workflow and validation controls exist, but the paper-defined Prophet, DII, RSI, and XGBoost outputs still require reproducible model runs and source coverage. Prescriptive calculations remain scenarios until operational data is supplied. The paper and North Star must be updated from 2021-2025 to 2017 onward and must use the current buyer taxonomy.')
T(['Objective area','Evidence','Status'],[['Historical baseline','2017-current calendar, monthly/yearly grain, territory views, and quality labels.','Partial'],['Product and area priority','Revenue Pareto, cumulative line, ABC, scoped trend, and buyer clusters.','Partial'],['Forecast demand','Current month plus 3, 6, or 12 months with benchmark diagnostics.','In progress'],['Inventory outcomes','Constrained integer-pack scenario and explicit operational blockers.','Scenario only'],['Governed DSS delivery','Five core modules, upload validation, source labels, and human-review boundaries.','Partial'],['Documentation alignment','Objectives, methodology, North Star, and KPI tree crosswalk completed in this report.','Paper update required']], [2.05,3.45,1.25], 'Table 4.4 Objective-Aligned Summary of Findings', 'Source: Alignment analysis of the capstone objectives, CRISP-DM and SEMMA methodology, MedShield North Star, and the verified September 2026 DSS implementation.')

PB(); H('4.5 Refinement of Analytical Outputs<br/>Based on Technical Consultation')
P('The latest revision implements the principal recommendations documented during the September 2026 consultation. Revenue and profit comparisons now use clearer time grains; growth retains nominal and percentage evidence; product prioritization uses a direct Pareto representation; buyer behavior is separated into explicit clusters; forecast views include actual and retrospective evidence; and prescriptive output is constrained to a focused shortlist.')
P('The product module was refined further by removing Y/Y comparison, converting the primary chart to a true revenue Pareto, and retaining monthly or annual movement in a companion trend. This separates portfolio concentration from time-series behavior while keeping both under the same selected period.')
P('Forecasting changed from a static future year to a rolling window beginning in the current month. Closed-month observations remain the training population, and stale-history warnings remain visible. Sector segmentation now follows one precedence rule across area, forecast, and planning modules.')
H('4.5.1 Verification Record',2)
T(['Verification activity','Observed result'],[['Backend analytical regression suite','29 tests passed across clustering, forecast, regression, and planning.'],['Frontend type validation','TypeScript no-emit validation passed.'],['Targeted browser verification','Four cluster and forecast cases plus the dedicated Pareto case passed.'],['Live service check','Forecast start returned 2026-09 and cluster counts reconciled.'],['Version control','DSS commit 4d00c29 and alignment commit c83f7b9 were pushed to branch ega_medshieldup3.']], [2.3,4.45], 'Table 4.5 DSS Verification Record', 'Source: Backend regression, frontend type validation, targeted browser checks, live service verification, and Git history recorded during the September 2026 implementation review.')
H('4.5.2 Remaining Work',2)
P('The first documentation task is to revise Chapters 1 and 3 and the North Star wording from 2021-2025 to 2017 onward, then apply the Government, Private, Internal, and Unknown buyer crosswalk consistently. The data team must repair and reconcile 2017-2019 Net CP without substituting gross sales, document which non-revenue metrics remain valid for those years, and regenerate downstream analytical populations from one approved source. Formal STL evidence, Prophet and external-regressor comparisons, XGBoost eligibility and evaluation, official signal ingestion, operational inventory and procurement inputs, and measured acceptance outcomes must be completed before the corresponding objectives are claimed as achieved.')

doc.build(story,onFirstPage=institutional_header,onLaterPages=institutional_header)
print(PDF)
