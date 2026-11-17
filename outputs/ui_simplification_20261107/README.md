# Dashboard simplification — verification packet, 7 November 2026

Checked against base commit `36aa42b` plus the uncommitted working tree. That tree also
holds separate, unfinished intake and pipeline work from another session. Nothing was
committed. No backend, API, Databricks, formula, forecast or approval code was changed
by this task. One line of intake help text in `sales-intake-panel.ts` was reworded.

**Handling:** `live-before/`, `live-final/` and the two `*-values/` folders hold real client
sales figures, and the screenshots show the signed-in account's email. They are git-ignored,
so they stay on this computer. The numbers in this README are the shareable record.

## What this packet proves

Live, signed-in measurement of the final code against `36aa42b`, using the same audit on the
same live data. The old version ran on temporary ports (frontend 3100, gateway 5100), which
were stopped afterwards. The dev servers on 3000 and 5000 were not touched.

## Live before and after at 1440×900

Sources: `live-before/audit-1440.json`, `live-final/audit-1440.json`.

| Page | Height before | Height after | Target | Words before | Words after | Cut | First KPI | First chart | Charts | Longest paragraph |
|---|---|---|---|---|---|---|---|---|---|---|
| Overview | 5,416 | 1,592 | 1,600 | 711 | 304 | 57% | 474 | 644 | 1 | 20 |
| Sales Diagnostics | 2,475 | 1,724 | 1,800 | 375 | 219 | **42%** | 478 | **789** | 2 | 18 |
| Products | 3,145 | 1,934 | 2,000 | 880 | 390 | 56% | n/a | **696** | 1 | 18 |
| Area | 2,267 | 1,521 | 1,600 | 607 | 366 | **40%** | n/a | n/a | 0 | 23 |
| Forecast | 6,682 | 1,663 | 1,800 | 1,885 | 339 | 82% | n/a | 635 | 1 | 24 |
| Planning | 2,162 | 1,489 | 1,600 | 456 | 351 | **23%** | n/a | n/a | 0 | 22 |
| Data Source | 1,571 | 1,118 | none | 376 | 207 | **45%** | n/a | n/a | 0 | 18 |
| View Sales Data | 1,760 | 1,414 | none | 611 | 493 | **19%** | **658** | n/a | 0 | 13 |
| Weather | 1,527 | 1,257 | none | 176 | 102 | **42%** | n/a | n/a | 0 | 6 |
| All pages | | | | 6,077 | 2,771 | 54% | | | | |

Bold values miss a target. At 390px, total words fell 61%, and Forecast went from 10,942 to
2,600px. The old Products chart had not loaded in the 1440 measurement, so its before height
and words are probably understated.

## Acceptance results

| # | Check | Result |
|---|---|---|
| 1 | First KPI within 480px | **Partly met.** Overview and Sales pass; View Sales Data is 658 |
| 2 | Main chart within 650px | **Partly met.** Overview and Forecast pass; Sales 789, Products 696 |
| 3 | Page height targets | **Met** on all six pages with a target |
| 4 | Charts on load | **Met** |
| 5 | 50% fewer words, no paragraph over 25 words | **Partly met.** 54% overall, but 6 pages miss it individually. Paragraphs pass, longest 24 |
| 6 | No visible hash | **Met** |
| 7 | Evidence labels stay visible | **Met** in the structure tests and the reviewed pages |
| 8 | Spacing and text | **Partly met.** Text is at least 12px at both widths. Overview uses 10 font sizes, Sales and Area 7, target 6. Earlier spacing misses were not reworked |
| 9 | Layout | **Met at the measured widths**, 1440 and 390. Other widths in 320–1440 were not measured live |
| 10 | Behaviour kept | **Met.** Live suites 14 of 14, including nine-page accessibility |
| 11 | Numbers unchanged | **Met for the sample.** 12 of 12 identical. See below |

The enforced audit (`live-audit-enforced.log`) fails on exactly the 9 bold target misses above
that it enforces: 6 word counts, 2 chart positions and 1 KPI position. No target was loosened.
The user accepted these misses on 7 November 2026, recorded as decision 012 in
`docs/DECISIONS.md`.

## Numbers unchanged

`live-before-values/` and `live-final-values/` were compared exactly. All match: Overview and
Sales KPIs and chart data, Overview trend CSV, top 10 product table rows, the full product CSV
(5,623 rows), Area metrics and table, and Forecast metrics, chart data and CSV. Lines naming a
generation time were removed from the CSVs first. Both versions used the same gateway code.

## Regression results on the final code

| Check | Result |
|---|---|
| Frontend types, lint | Pass (lint does not cover `e2e/`) |
| Production build | Pass, in an isolated copy without env files. `production-build.log` |
| Live suites: step 3 visual, step 3 accessibility, system-first | 14 passed. `live-suites-after.log` |
| Fixture Playwright specs (42 files) | 212 passed, 5 skipped, 37 failed. `fixture-suite-final-live-fixes.log` |
| Contract scripts (33) | 26 pass, 6 cannot run, 1 stale. `contracts-final/` |
| Saved evidence and test results | Scanned; the password appears in no file |

Other live spec files were not run. Several need `MEDSHIELD_E2E_FACT_VERSION`, which was left
blank. `fixture-suite-all-specs-no-login.log` is a wider run made before the login existed,
and is not evidence for live behaviour.

Only the 2 accessibility tests failed on the first live run. Their expand-everything loop could
never finish, because the new one-at-a-time sections close each other. The test now lifts
those groups so the audit still covers everything open.

### What the live pages exposed

Synthetic data could not show these. All were fixed:

- Area repeated two long sentences in the header and panel. The panel copies are now hidden
  on screen, and the longer limits moved to "Unallocated labels and evidence limits".
- Overview's Forecast card ran to 31 words and stretched its row. Its estimate moved to that
  card's "Scope and interpretation".
- Forecast's bold finding repeated the header, and the export note took a line even when
  the export worked. The note now shows only when it explains a disabled export.
- The Sales "Current finding" was a chart caption. It now leads with the recorded trend.
- View Sales Data used 9–10px labels, and phone tables and disclosures were under 12px.
- "About this sales view" sat above the KPIs, because it is created after the layout step.

### Separate code review

A read-only reviewer checked the diff before the live pass. All findings were confirmed in
the code, fixed and pinned by tests, except where noted.

| # | Defect | Fix |
|---|---|---|
| 1 | Sales: a stray statement dropped the daily "gross-profit evidence is unavailable" text, and the cue had moved into a closed note | Text restored; the visible subtitle now states it in daily views |
| 2 | Products: page count used 20 rows while pages show 10, so rows 21–32 were unreachable by paging | Page count uses 10 |
| 3 | Filters: Contracts Only hid "Financial release pending" and "contract detail is unavailable" | Only the untouched default guidance is hidden |
| 4 | Forecast: the header lost "Evaluation scope" because of the stricter displayed rule | This reading may come from its closed method note |
| 5 | Overview: changing buyer sector moved the card and dropped keyboard focus | The card moves only when out of place |
| 6 | Overview: a label inside a label polluted the "Show" control's accessible name | The two controls are siblings |
| 7 | Header: popovers ignored Escape and outside clicks, Escape failed after clicking a disabled item, and the summary export left the menu open | All fixed. Tested except the disabled-item path, approximated by Escape with focus on the page body |

Removing Help's objectives section also removed its note that adviser approval is not
recorded. This follows the recorded decision to take the capstone score out of Help. The
statement stays in `docs/CURRENT_STATE.md`.

Reported as already present at `36aa42b`, not fixed here: Overview's dashed and triangle
estimates have no label on the chart beyond the legend, and the trend subtitle holds only
the period.

### The 37 fixture failures are not regressions

The same 37 failed before and after the live fixes.

| Count | Cause | Evidence |
|---|---|---|
| 27 | Also fail on an export of `36aa42b`: 21 from `Unknown isolated module: ./financial-scope`, the rest from older pins | `head-baseline.log` |
| 9 | Retained evidence files are absent from this checkout | so1-panel 5, workflow-completion 2, historical-comparison 1, planning-release-integrity 1 |
| 1 | `analytics-output-performance` compares against a frozen hub copy that already differed from `36aa42b`; passes in current-source parity mode | Label logic absent from the frozen file |

### Contract scripts

- `abc`, `regional-forecast` and `tournament` need a fixture path, and `dated-capacity`
  and `planning-capacity` need the tsx loader, per `docs/TESTING.md`. All five pass that way.
- **Cannot run, evidence absent:** `confirmed-area`, `original-research`, `original-so1`,
  `product-commercial`, `rolling-research`, `unit-research`.
- **Stale:** `source-recheck` expects "Direct dashboard uploads are unavailable", which is
  already absent at `36aa42b` and no longer matches the controlled intake. Its owner should
  update the assertion. `e2e/qa-remediation-live.spec.ts:33` has the same stale pin.

## Not verified

- Client comprehension. Project notes record that the walkthrough was skipped by the user.
- Screen-reader use. Automated accessibility checks passed, but no screen reader was used.
- The Forecast line from the 5 November capture did not appear at the default live view.
  Other display windows were not checked, so its cause is unknown.
- Live layout at widths other than 1440 and 390.
- Values outside the sample above, and filters other than the defaults.

## Repeating these runs

`frontend/.env.e2e.local` holds the login. Load it into the environment, then from `frontend/`:

```bash
MEDSHIELD_AUDIT_OUT=../outputs/ui_simplification_20261107/live-final npx playwright test e2e/ui-simplification-audit.spec.ts --workers=1
MEDSHIELD_SAMPLE_OUT=<folder> npx playwright test e2e/ui-value-sample.spec.ts --workers=1
npx playwright test e2e/step3-visual-acceptance.spec.ts e2e/step3-accessibility-live.spec.ts e2e/system-first-live.spec.ts --workers=1
```

Add `MEDSHIELD_AUDIT_ENFORCE=1` and `MEDSHIELD_AUDIT_BASELINE=<before folder>` to enforce the
budgets. The gateway only accepts ports 3000 and 5000 by default, so an old-version run needs
its own gateway with `CORS_ALLOWED_ORIGINS` set to that frontend's address.
