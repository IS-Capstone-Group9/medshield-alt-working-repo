# Dashboard UI/UX QA audit and fix plan — 10 November 2026

**Scope:** all nine dashboard pages on branch `medshield/update_05` (includes commit `50209fa`).
**Method:** live signed-in run of `frontend/e2e/ui-qa-probe.spec.ts` (read-only) at 768, 1024, 1280, 1440 and
1920px, plus the 7 November live screenshots. Measurements are computed styles and box geometry, not estimates.
Screenshots stay outside Git because they show client figures.
**Not changed by this plan:** values, formulas, API, Databricks, evidence labels, Limit lines (CLAUDE.md rules 7 and 10).

**What already passes:** no sideways page scroll at 768–1920px. Text is at least 12px. Every chart uses
`responsive: true` with a fixed-height wrapper. Focus rings show on nav items, buttons, selects and disclosures.
The content width is capped at 1360px.

## Issues, ranked

Severity: **H** = visibly wrong or misleading, **M** = inconsistent, **L** = polish.

### 1. Layout and grid alignment

| # | Sev | Component | Identified issue | Root cause | Exact fix | Status and live evidence |
|---|---|---|---|---|---|---|
| L1 | H | Planning: Review scenario inputs | The heading sits flush under "Historical sales contribution" with 0px gap, and the empty input table is a header-only box | `#planInputs` heading has no top margin; table renders `thead` with no empty row | `.plan-section-title{margin-top:var(--space-6)}`; add one `<tr><td colspan=…>No products in this scope.</td></tr>` empty state | Fixed — Planning’s heading has a 24px gap. A live empty scope rendered one message row spanning all nine columns. |
| L2 | H | Data Source page | Text, buttons and disclosures are stacked with no card rhythm: 0–4px between paragraph, button and summary. Inputs are 977px wide with a 2-column page | Panel uses raw `<p>`/`<button>` with no gap container; inputs have `width:100%` inside a full-width block | Wrap groups in `display:grid;gap:var(--space-3)`; cap fields at `max-width:560px`; put Check/Download buttons in one `.btn-row{display:flex;gap:8px;flex-wrap:wrap}` | Fixed — Source and intake groups measure 12px gaps. Both visible inputs are capped at 560px, and the action rows wrap. |
| L3 | M | All pages: card radius | Cards use 10px (filter, header) and 12px (KPI, chart) side by side | `.chart-card,.insight-card{border-radius:10px}` and `.kpi-card{border-radius:12px !important}` | One token `--radius-card:10px`; apply to `.kpi-card`, `.chart-card`, `.analytics-output-hub`, `.dashboard-filter-panel` | Fixed — All 300 measured card surfaces have a 10px radius. |
| L4 | M | All pages: shadows | KPI and chart cards have a shadow; header and filter cards do not | Shadow set only on `.kpi-card`/`.chart-card` | Utilitarian rule: border only, `box-shadow:none` on all four card types | Fixed — All 300 measured card surfaces have no box shadow. |
| L5 | M | Overview: card gutters | KPI row gutter is 12px; the analytics-card row below is 16px | `.kpi-grid{gap:var(--space-3)}` vs the analytics grid `gap:16px` | Use `--space-4` (16px) for every card grid: `.kpi-grid,.chart-grid-2,.overview-analytics-grid{gap:var(--space-4)}` | Fixed — Overview KPI and analytical grids and the Area action grid measure 16px. Page stacks and the adjacent Sales charts measure 12px. |
| L6 | M | Overview: 4 analytics cards | Equal 349px height leaves 120–160px of blank space above the buttons in 3 cards | Cards stretch to the tallest; button is pushed down by `margin-top:auto` | Remove `margin-top:auto` from the action; `align-items:start` on the grid | Fixed — The four Overview cards now size to content. At 1440px, the prior 349px row became 226, 265, 333 and 247px cards. The action margin is 0px. |
| L7 | M | Area: action cards | Two 541px cards with 40–60px blank space at the bottom | Same stretch pattern | Same fix as L6 | Fixed — Area cards align to the top of the grid. At 1440px, the two 239px cards became 236 and 216px. |
| L8 | M | Overview: provenance strip | "Financial scope · Forecast · Planning · Publication limits" floats between two cards as bare 12px text | Strip is outside any container, after the trend card | Move the strip into the trend card footer, or into the header tag row | Fixed — The trend card footer contains all four visible provenance items at 1024, 1440 and 1920px. |
| L9 | M | View Sales Data | Financial scope select is a full-width 1,000px bar between the header and Limit line, unlike the filter card on other pages | Page uses its own scope control outside `.dashboard-filter-panel` | Render it inside the standard filter card; `max-width:320px` | Fixed — The financial scope select sits inside the standard filter card and measures 320px at 1024–1920px. |
| L10 | L | Sales, Area: trailing disclosures | "About this sales view" and "Separate geographic priority model" sit outside cards, left-aligned at x=276 with no padding | Placed after the last card by `page-layout.ts` | Put them in one `.dashboard-supporting-evidence` card like Products and Forecast | Fixed — The existing Sales and Area disclosure labels are visible inside their respective supporting-evidence cards at all three layout widths. |

### 2. Chart and output placement

| # | Sev | Component | Identified issue | Root cause | Exact fix | Status and live evidence |
|---|---|---|---|---|---|---|
| C1 | H | Forecast and Products charts | Warm amber glow behind the plot after data has loaded | Likely cause: the chart wrapper keeps `data-state="loading"`, so the reference style's amber `::after` shimmer stays on. Needs confirming in Phase 0 | Set `wrap.dataset.state='ready'` after render; also `.chart-wrap[data-state=ready]::after{content:none}` | Fixed — Five rendered wrappers had the amber loading overlay at baseline. The final direct check found 0 of 24 wrappers still loading. |
| C2 | H | Forecast chart | Baseline estimates float alone at the far right; the dashed backtest line is short and unlabelled | The x-axis spans to 2027-01, but 2026-10 has no actual or estimate, so the line breaks | Draw a connector from the last actual to the first estimate (`spanGaps` on the estimate dataset only), and shade the forecast region with an annotation box | Fixed — A dashed connector joins the last actual to the first estimate across one blank month. Canvas inspection confirmed shading over the forecast window. The value sample is byte-identical to baseline, including the null month. |
| C3 | M | Forecast chart | 82px below the plot for ticks, axis title and legend; 3 legend items wrap | Legend at bottom with 11px labels, plus an x-axis title "Calendar month" that repeats the ticks | Move the legend to the top-right; remove the x-axis title. Plot height gains about 40px | Partly fixed — The three-item legend is one top-right row and the x-axis title is hidden. Space below the plot fell from 82 to 38px. The plot grew 22px at 1440px against the approximate 40px expectation. |
| C4 | M | All charts: axis styling | Tick colour differs by chart: `#31566d`, `#6f8796`, `#666`, and the series blue on the y-axis title | Each runtime sets its own `ticks.color`; Chart.js default `#666` where unset | Set `Chart.defaults.color='var(--chart-label)'` value `#3f6377`, `Chart.defaults.font.size=12`, `scale.grid.color='#e3ecf2'` once in `use-dashboard-runtime.ts`; delete per-chart colour overrides | Fixed — All 50 axes in the five-width probe and all 42 axes in the supplemental check use `#3f6377` at 12px. |
| C5 | M | Charts: tick label padding | `ticks.padding` is 3px everywhere, so labels touch the axis | Chart.js default | `Chart.defaults.scale.ticks.padding=8` | Fixed — Tick padding is 8px on every measured axis, up from 3px on the baseline primary charts. |
| C6 | M | Chart heights | Heights are 280, 300, 310 and 360px, and `.chart-wrap.h300` is actually 310 | `overrides.css` 1640–1653 | Three tokens only: `--chart-sm:240px`, `--chart-md:300px`, `--chart-lg:360px`; fix `.h300` to 300 | Fixed — Visible charts use 300px or 360px or the prescribed hero clamp. Sales movement measures 300px, up from 280px. The shared compact token is 240px. |
| C7 | M | Chart aspect at wide screens | At 1920px the Overview chart is 1262×300 (4.2:1); at 1024px it is 926×300 (3.1:1) | Fixed height, fluid width | `height:clamp(260px, 26vw, 360px)` on hero charts keeps the ratio near 3.4–3.6:1 | Fixed — The Overview hero measures 3.48:1 at 1024px and 3.51:1 at 1920px, versus 3.09:1 and 4.21:1 before. It follows the required clamp and measures 3.04:1 at 1440px. |
| C8 | M | Products bar chart | Value labels sit inside bars in white; short bars ("₱4.7M") nearly fill the bar; the x-axis starts at "-₱21.4K" | Inline label plugin `descriptive-products-runtime.ts:38`; axis min from negative adjustments | Labels at the bar end in dark text; `x.min:0` when no negatives are shown; move negatives to the table | Partly fixed — All ten measured positive labels sit beyond the bar ends in dark type with zero clipping. The x-axis minimum is 0 when the negative series is hidden. The default chart still draws the negative series because its existing evidence wording describes both series. |
| C9 | M | Sales: movement chart | Blue and red bars are 12px apart from the zero line labels; 12 ticks are labelled `2017-01, 2017-11…` (odd 10-month steps) | `maxTicksLimit:12` over 117 months | Use yearly ticks (`callback` shows January only) | Fixed — The Sales movement chart shows ten year labels, each at a January tick position. |
| C10 | L | Overview chart | Legend at the bottom adds 40px between the plot and the coverage line | `legend.position:'bottom'` | Top-right legend, same as C3 | Fixed — The Overview legend is at the top right. Space below the plot fell from 68 to 38px at 1440px. |

### 3. Data density and typography

| # | Sev | Component | Identified issue | Root cause | Exact fix | Status and live evidence |
|---|---|---|---|---|---|---|
| T1 | H | KPI values, all pages | Figures are proportional, so ₱ values jump in width when filters change | `.kpi-value` sets `font-feature-settings:'tnum'` but a later `!important` rule resets it; computed `font-variant-numeric:normal` | `.kpi-value,.metric-value,[class*=status-value]{font-variant-numeric:tabular-nums !important}` | Fixed — The settled probe found zero visible numeric strings without tabular digits across 45 page/width observations. |
| T2 | H | Tables, all pages | Numeric columns are right-aligned but proportional | No `tabular-nums` except View Sales Data | `.product-table td,.uploaded-data-table td,.mcda-table td{font-variant-numeric:tabular-nums}` | Fixed — Table cells use tabular digits. Products had 20 flagged numeric cells at 1440px before and zero after. |
| T3 | H | Products table | Header "Product name from sales records" sits centred over a left-aligned column, "Share of positive amounts" wraps to 3 lines, and "Details" sits far right | Header `text-align` differs from cells; no column widths | `th{text-align:inherit}` per column class; `th.num,td.num{text-align:right}`; set `table-layout:fixed` with widths for Rank 56px, Share 120px, ABC 180px, Details 120px | Partly fixed — The fixed column widths are 56, 140, 120, 180 and 120px, with Product taking the remainder. The settled probe found zero alignment mismatches. The Share header still occupies two lines. |
| T4 | M | Area table | Region is right-aligned (text); Observed ABC is right-aligned (a letter) | Last 4 columns forced right | Right-align only Recorded net sales and share | Fixed — Area’s Region and Observed ABC cells and headers align left. Recorded net sales and positive-area share align right. |
| T5 | M | Headings | Four heading styles in one header: 32px League Spartan, 20px, 19.5px, 16px, 15px and 14.5px | Each panel sets its own size | Scale: page title 20px, card title 16px, section 14px, all Inter 700 | Fixed — The heading roles use Inter 700 at 20, 16 and 14px. The settled probe reports a 12px floor and at most six font sizes per page. |
| T6 | M | Line height | 1.15–1.67 across 7 values | No base line-height token | `--lh-tight:1.2` (values, headings), `--lh-body:1.5` (everything else) | Fixed — The only measured line-height ratios are 1.2 and 1.5 across 45 page/width observations. |
| T7 | M | Weights | Buttons use 600, 700 and 800 | Per-panel rules | Buttons 600; labels 600; values 700 | Fixed — The visible buttons measure 600 weight and value roles use 700. Form and table labels use 600. |
| T8 | M | Uppercase labels | KPI, table head and form labels are uppercase with 0.08em spacing; Weather labels too | Repeated `text-transform:uppercase` | Sentence case for table heads and form labels; keep uppercase only for KPI labels | Partly fixed — Form labels and table headings no longer inherit the uppercase transform or expanded spacing. Existing title-case labels keep their wording and capitalization. |
| T9 | L | Forecast KPIs | "₱-7,353,357.60" puts the sign after ₱ | `fmtTarget` prepends ₱ to a negative number (`forecast-validation-runtime.ts:291`) | `(value<0?'−₱':'₱')+Math.abs(value)…` | Fixed — The Forecast bias visually places the minus sign before the peso symbol. Its DOM text retains the original order for the exact value sample. |
| T10 | L | Products table | Rows are 36px and 10 rows take 360px plus a 71px header | Wrapped 3-line header | Fixed by T3; target header 40px | Partly fixed — Header height fell from 71 to 39px at all five widths, meeting the 40px limit. The Share heading remains two lines in its required 120px column. |

### 4. Interactive states and responsiveness

| # | Sev | Component | Identified issue | Root cause | Exact fix | Status and live evidence |
|---|---|---|---|---|---|---|
| I1 | H | Loading states | Loading is plain text ("Loading…"); Weather shows a 520px empty box with "Loading…" below it | No skeleton component | Add `.skeleton{background:var(--bg-elevated);border-radius:6px;animation:pulse 1.2s ease-in-out infinite}` (static under reduced motion); use it for KPI values, chart wrappers (keep their fixed height) and the first 5 table rows | Fixed — Seven delayed-load views showed no numeric placeholders and respected reduced motion. Weather and four other tabular views displayed five skeleton rows. Settled failures cleared the skeletons and showed unavailability. |
| I2 | H | Controls, all pages | Button heights 30–40px and select heights 20–39px; radii 0, 4, 5, 6, 7 and 8px | Every panel styles its own controls | `--control-h:36px;--control-r:6px`; `.content :is(button,select,input:not([type=checkbox])){min-height:var(--control-h);border-radius:var(--control-r)}` | Fixed — All 620 measured buttons, selects and inputs are 36px tall with 6px corners. |
| I3 | H | Products filters | Category and Cohort selects are 20px tall with square corners | Native unstyled `<select>` | Covered by I2 | Fixed — Products Category and Cohort selects are now 36px tall with 6px corners, up from 20px with square corners. |
| I4 | M | Disclosures | `summary` has no hover state; 13px/600 in some places and 12px/400 in others | No shared summary rule | `.content summary{font:600 13px/1.5 var(--font-body)} summary:hover{color:var(--accent)}` | Fixed — Disclosures use 13px and 600 weight. The probe records a hover color change. |
| I5 | M | Selects | No hover state; cursor is `default` | Native default | `select:hover{border-color:var(--border-strong)} select{cursor:pointer}` | Fixed — The probe records a select hover border change and a pointer cursor. |
| I6 | M | Sales tabs | Inactive tab has no hover change | No `:hover` rule | `[role=tab][aria-selected=false]:hover{background:var(--bg-elevated)}` | Fixed — The probe records an inactive Sales tab background change on hover. |
| I7 | M | Table rows | Only the Products and View Sales Data tables highlight on hover | Row hover set per table | `.content tbody tr:hover td{background:#f1f6fa}` | Fixed — The probe records a row background change on Products, Area, the ledger and Weather. |
| I8 | M | KPI cards | They change border and shadow on hover but are not clickable | Hover rule on a static card | Remove `.kpi-card:hover` styling | Fixed — The probe records no hover changes on the Overview and Sales KPI cards. |
| I9 | M | Planning table at 768px | 827px table in a 672px scroller, with no cue that it scrolls | `div.plan-scroll{overflow-x:auto}` only | Fade the right edge with a `mask-image` gradient; keep the first column sticky | Fixed — At 768px, an 827px table scrolls in a 672px region with an edge fade. The first column moved 0px during the scroll, and the fade cleared at the end. |
| I10 | M | View Sales Data at 1024px | Table is 24px wider than its box, so a scrollbar appears on a standard desktop | Fixed column min-widths total 944px | Let Product wrap (`min-width:0`), drop to 920px | Fixed — The compact ledger at 1024px is 920px wide with no horizontal overflow. The baseline was 944px with 24px overflow. |
| I11 | L | Planning: disabled Calculate | Grey-teal disabled button reads as active | `opacity` only | `button:disabled{background:var(--bg-elevated);color:var(--text-muted);cursor:not-allowed}` | Fixed — In a live empty Planning scope, Calculate was disabled with a not-allowed cursor, the elevated background and opacity 1. |
| I12 | L | Planning territory | Default reads "Quezon — unavailable in current source" | Markup default `<option>Quezon</option>` (`prescriptive-planning-runtime.ts:76`) | Default to `all` | Fixed — The initial Planning selector is `all`. The first live shortlist request used that territory and returned HTTP 200. |

## Fix plan

Each phase is checked live before the next one starts. No commit unless you ask.

| Phase | Work | Files | Fixes |
|---|---|---|---|
| 0 | Confirm C1 cause; save live before-screenshots and probe JSON | probe spec | — |
| 1 | Tokens: radius, control height, chart heights, line heights, type scale | `app/overrides.css` (top block) | L3, L4, C6, T5–T7 |
| 2 | Numbers and tables: tabular figures, alignment, column widths, row hover | `overrides.css`, `descriptive-products-runtime.ts`, `area-priority-panel.ts` | T1–T4, T8, T10, I7 |
| 3 | Chart defaults set once, then per-chart fixes | `use-dashboard-runtime.ts`, `forecast-validation-runtime.ts`, `descriptive-products-runtime.ts`, `sales-diagnostics-runtime.ts` | C1–C5, C7–C10, T9 |
| 4 | Controls and states: one control style, hover, disabled, skeletons | `overrides.css`, panels that render "Loading…" | I1–I8, I11 |
| 5 | Page layout fixes | `page-layout.ts`, `overview-analytics-runtime.ts`, `sales-intake-panel.ts`, `prescriptive-planning-runtime.ts` | L1, L2, L5–L10, I9, I10, I12 |
| 6 | Verify and record | tests, `docs/CURRENT_STATE.md`, `docs/TESTING.md` | — |

**Order reason:** tokens first, so later fixes reuse them. Charts before layout, because chart height changes move everything below.

## Acceptance checks (probe re-run, live)

| Check | Target |
|---|---|
| Control heights per page | One value (36px) for buttons, selects and inputs |
| Radii | Cards 10px, controls 6px, tags 999px |
| Numeric text without `tabular-nums` | 0 |
| Table numeric columns not right-aligned, or header/cell alignment mismatch | 0 |
| Chart tick colours and fonts | One colour, 12px |
| Chart heights | Only 240, 300 or 360px (or the hero clamp) |
| Card gutters | 16px in every card grid; 12px between stacked cards |
| Chart wrappers with `data-state="loading"` after load | 0 |
| Sideways page scroll, 768–1920px | 0; table scroll only at ≤1024px with an edge cue |
| Values | Same 12 sample sets as 7 November are identical (`ui-value-sample.spec.ts`) |
| Regression | Live suites 14/14; `ui-simplification-structure.spec.ts` passes |

## Verification result — 10 November 2026

The audit records 37 fixed and five partly fixed issues. The settled Chromium probe
covered nine default pages at 768, 1024, 1280, 1440 and 1920px. It found no page
overflow and no table scroll above 1024px in that scope. All measured table scroll
regions at 768px had an edge cue. The expanded Full Ledger has its own scrollable
region, including at desktop widths, as verified by the existing ledger fixture.

All 12 sampled sets match byte for byte after the samplers wait for ready data.
The full live suite passed 13 cases. The remaining visual case timed out waiting
for browser transitions and passed on focused retry with all 27 captures and the
same accessibility and viewport assertions. Raw evidence is in the local
temporary directory named medshield-ui-qa-20261110-797e5fd3.
See [Testing](TESTING.md#dashboard-presentation-qa--10-november-2026).

## Risks

- **Global control and chart defaults** touch every panel. Existing Playwright pins on sizes or colours may need
  updating; they are run after each phase.
- **C1** is a likely cause, not yet confirmed. Phase 0 checks the live `data-state` first.
- **Skeletons must never show numbers.** Unavailable states stay text, per rule 7.
- `overrides.css` holds your uncommitted edits (line endings only per `git diff --ignore-cr-at-eol`). They are kept.
