# Dashboard UI QA — implementation plan, 10 November 2026

**Source of issues:** [UI_QA_AUDIT_20261110.md](UI_QA_AUDIT_20261110.md), with IDs L1–L10, C1–C10, T1–T10 and I1–I12.
**Accountable role:** Frontend Engineer (`.agents/frontend-engineer.md`, `.skills/frontend-standards.md`).
**Supporting role:** QA Engineer for checks (`.agents/qa-engineer.md`).
**Out of scope:** values, formulas, API, Databricks, evidence labels, Limit lines, wording.

## Ground rules

- Presentation only. If a fix needs a data or logic change, stop and report it.
- Put each style change in `frontend/app/overrides.css` under one new block headed `/* UI QA 2026-11-10 */`, at the end of the file. Don't edit the old rules in place, so the block can be reverted in one step.
- Never run `npm run build` while `next dev` is running.
- The working tree holds other people's uncommitted work. Don't revert, reformat or stage it.
- Keep CRLF line endings in files that already use them.
- Don't commit unless asked.
- Live screenshots and probe output go outside Git, because they show client figures.

## Phase 0: Baseline and confirm the chart glow (C1)

1. Run the probe and save the before-state:
   `MEDSHIELD_QA_OUT=<folder outside git> npx playwright test e2e/ui-qa-probe.spec.ts --workers=1`
2. Save the value sample with `MEDSHIELD_SAMPLE_OUT=<before> npx playwright test e2e/ui-value-sample.spec.ts --workers=1`.
3. **Confirm C1:** in the live browser, read `data-state` and the `::after` background on every `.chart-wrap` after the page loads.
   - If any wrapper still reads `loading`, C1's cause is confirmed.
   - If not, find what paints the amber tint before fixing it.
4. **Done when:** the before folders exist and C1's cause is written down.

## Phase 1: Tokens

1. Add these to `:root`:
   `--radius-card:10px; --radius-control:6px; --control-h:36px; --chart-sm:240px; --chart-md:300px; --chart-lg:360px; --lh-tight:1.2; --lh-body:1.5; --text-title:20px; --text-card-title:16px; --text-section:14px`.
2. **Cards (L3, L4):**
   `.kpi-card, .chart-card, .analytics-output-hub, .dashboard-filter-panel {border-radius:var(--radius-card) !important; box-shadow:none !important}`
3. **Chart heights (C6):** map the four height classes onto the three height tokens, so `.h300` is 300 and not 310. Hero charts use `height:clamp(260px,26vw,var(--chart-lg))` (C7).
4. **Type (T5–T7):**
   - Page title 20px, card title 16px, section title 14px, all Inter 700.
   - Buttons and labels 600, values 700.
   - Line height: `--lh-tight` for values and headings, `--lh-body` for everything else.
5. **Done when:** the probe shows one card radius, no card shadows, only 240, 300 or 360px chart heights (or the hero clamp), and at most 6 font sizes per page.

## Phase 2: Numbers and tables

1. **Tabular digits (T1, T2):** apply `font-variant-numeric:tabular-nums !important` to `.kpi-value`, `[class*="status-value"]`, `[class*="metric-value"]` and all `td`.
2. **Alignment (T3, T4):**
   - Add a `num` class to numeric `th` and `td` where the table is built (`descriptive-products-runtime.ts`, `area-priority-panel.ts`).
   - `th.num, td.num {text-align:right}`. Every other column is left-aligned, header and cell alike.
   - In the Area table, Region and Observed ABC become left-aligned.
3. **Products column widths (T3, T10):** `table-layout:fixed` with these widths:

   | Column | Width |
   |---|---|
   | Rank | 56px |
   | Net sales | 140px |
   | Share | 120px |
   | ABC | 180px |
   | Details | 120px |

   Product name takes the rest. Header target: one line, 40px or less.
4. **Labels (T8):** table heads and form labels use sentence case; only KPI labels stay uppercase.
5. **Row hover (I7):** `.content tbody tr:hover td {background:#f1f6fa}`.
6. **Done when:** the probe reports zero numeric text without tabular digits, zero numeric columns that aren't right-aligned, and zero header/cell alignment mismatches.

## Phase 3: Charts

1. **Shared defaults (C4, C5):** set them once in `frontend/hooks/use-dashboard-runtime.ts`, next to the existing chart font setting:
   ```ts
   Chart.defaults.color = '#3f6377'
   Chart.defaults.font.size = 12
   Chart.defaults.scale.ticks.padding = 8
   Chart.defaults.scale.grid.color = '#e3ecf2'
   Chart.defaults.plugins.legend.position = 'top'
   Chart.defaults.plugins.legend.align = 'end'
   ```
   Then remove the per-chart `ticks.color`, `title.color` and legend-position overrides that fight these defaults. Keep the series colours.
2. **Glow (C1):** apply the fix confirmed in Phase 0, usually `wrap.dataset.state = 'ready'` after render. Also add `.chart-wrap[data-state="ready"]::after {content:none}`.
3. **Forecast chart (C2, C3, T9):**
   - Join the last actual to the first estimate, on the estimate dataset only.
   - Shade the forecast months with a light box, `rgba(18,109,161,.05)`, without adding a plugin dependency.
   - Remove the x-axis title.
   - Fix `fmtTarget` so negatives read `−₱7,353,357.60`.
4. **Products chart (C8):**
   - Put value labels at the bar end in dark text.
   - Set `x.min = 0` when no negative bar is drawn.
   - Negative adjustments stay in the table and the existing disclosure.
5. **Sales movement chart (C9):** label one tick per year (January only).
6. **Overview chart (C10):** the legend moves to the top through the defaults.
7. **Done when:**
   - Every chart reports the same tick colour and 12px font.
   - No wrapper stays at `data-state="loading"`.
   - The Forecast line is continuous into the estimates.
   - The value sample still matches.

## Phase 4: Controls and states

1. **Control size (I2, I3):**
   `.content :is(button, select, input:not([type=checkbox]):not([type=radio]):not([type=file])) {min-height:var(--control-h); border-radius:var(--radius-control)}`
2. **Hover states (I4–I6):**
   - `summary`: 600 13px, colour changes to `var(--accent)` on hover.
   - `select`: `cursor:pointer`, border colour changes on hover.
   - Inactive tabs: background changes on hover.
3. **Static cards (I8):** remove the hover styling from `.kpi-card`.
4. **Disabled (I11):** `button:disabled {background:var(--bg-elevated); color:var(--text-muted); cursor:not-allowed; opacity:1}`.
5. **Skeletons (I1):**
   - Add a `.skeleton` class with a pulse animation, which is static under `prefers-reduced-motion`.
   - While data is loading, apply it to KPI values, chart wrappers (keeping their fixed height) and the first 5 table rows.
   - Remove it on ready and on unavailable. An unavailable state keeps its text and never shows a number or placeholder value.
   - Fix the Weather empty 520px box the same way.
6. **Done when:**
   - Every page shows one control height and one control radius.
   - Hover changes are recorded for summary, select, tab and row.
   - The unavailable-state tests still pass.

## Phase 5: Page layout

| Fix | Change |
|---|---|
| L1 | Planning: add top margin to the "Review scenario inputs" heading, plus an empty-row message in `#planInputs` when there are no products |
| L2 | Data Source: wrap groups in `display:grid; gap:var(--space-3)`, cap fields at `max-width:560px`, and put buttons in a wrapping `.btn-row`. Touch only layout markup in `sales-intake-panel.ts`, not its logic |
| L5 | Every card grid gets a 16px gap, and stacked cards a 12px gap |
| L6, L7 | Overview and Area cards: `align-items:start`, and remove `margin-top:auto` from the action buttons |
| L8 | Move the Overview provenance strip into the trend card footer. Its labels must stay visible |
| L9 | View Sales Data: show the financial scope inside the standard filter card, `max-width:320px` |
| L10 | Sales and Area: move the trailing disclosures into one `.dashboard-supporting-evidence` card through `page-layout.ts` |
| I9 | Planning table: right-edge fade cue and a sticky first column while it scrolls |
| I10 | View Sales Data at 1024px: let the Product column wrap so the table fits |
| I12 | Planning territory defaults to `all` (`prescriptive-planning-runtime.ts:76`) |

**Done when:** these issues no longer appear in the probe and screenshots at 1024, 1440 and 1920px.

## Phase 6: Verify and record

From `frontend/`:

```bash
npx tsc --noEmit
npm run lint
MEDSHIELD_QA_OUT=<after> npx playwright test e2e/ui-qa-probe.spec.ts --workers=1
MEDSHIELD_SAMPLE_OUT=<after> npx playwright test e2e/ui-value-sample.spec.ts --workers=1
npx playwright test e2e/ui-simplification-structure.spec.ts e2e/analytics-output-hub.spec.ts e2e/sales-diagnostics.spec.ts e2e/overview-analytics-sections.spec.ts --workers=2
npx playwright test e2e/step3-visual-acceptance.spec.ts e2e/step3-accessibility-live.spec.ts e2e/system-first-live.spec.ts --workers=1
```

From the repo root: `node frontend/e2e/dashboard-script-bindings.cjs`.

Compare the before and after value samples exactly. Every one must match.

**Build:** run it only with `next dev` stopped, then restart the server with the same command.

**Records:**
- Add a short dashboard entry to `docs/CURRENT_STATE.md` and the probe command to `docs/TESTING.md`.
- Mark each audit row in `UI_QA_AUDIT_20261110.md` fixed, partly fixed or not fixed, with evidence.
- Add a dated turn record to the project memory vault.

## Acceptance

All targets in the audit's "Acceptance checks" table, re-measured live. If a target can't be met, report the measured value and leave the target as it is.
