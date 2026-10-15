# Independent forecast error visibility QA

**PASS — 369 checks, zero failures.** The actual forecast markup and display
script were executed in an isolated Chromium page with hand-known synthetic
pairs. There was no app server, network request, warehouse query, model fit,
publication or application build.

The expectations were recorded before the final implementation handoff. Actual
100 with predictions 110 and 90 produces signed errors +10 and −10 and absolute
errors 10. Observed actual/prediction zero remains a scored zero; actual −100 and
prediction −90 retains the signed actual and produces +10. Missing displayed or
backtest actual, a 100-versus-99 mismatch, missing/nonfinite prediction,
history-only rows and future points remain unscored. Table and CSV agree, with
readable UI reasons and explicit CSV reason codes. The lead table uses the same
matching guard. Nonfinite values export unavailable rather than NaN/Infinity.

Four matched hand pairs have MAE 7.5, WAPE 10%, RMSE √75 and mean signed error
2.5. All repeated summary fields remain explicitly historical and carry the
selected evaluation period and scored count, including when attached to a future
row. The implementation reads the selected provider metrics; it does not insert
the separate offline audit score or calculate future accuracy. PHP cards and
headers identify pesos, while other targets retain their own unit.

CSV source checksum, model/run/release identity, units and publication status are
preserved. Formula prefixes, embedded quotes, commas and newlines round-trip
safely; numeric negatives remain numeric. Model/unit HTML injection remains
literal text. Required-source failure clears tables/cards and disables export.
No good/bad business threshold or approval is inferred from a numerical result.

Separately, the Frontend Engineer's final focused Playwright self-review reports
**six tests passed** in 12.3 seconds. Its current code hashes and passed
`.last-run.json` agree with that handoff; this is inherited implementation
self-review, not six tests newly rerun by this QA Engineer. Root separately owns
TypeScript and whitespace verification. Both provided desktop and 390px mobile
screenshots were inspected: historical labels/cards are readable, the monthly
section is open, and wide tables scroll within their containers. These images
contain synthetic fixtures, not measured client performance.

The first independent run's ten failures were verifier expectation mistakes:
UI reasons replace underscores with spaces, a header selector included the
reason column, and a number parser did not remove the non-PHP unit suffix. Those
assertions were corrected without changing runtime or test sources. The initial
failed receipt and corresponding verifier bytes are preserved under
`verification-first.json` and `verify-runtime-first.cjs`; the corrected run is
`verification.json`.

Reproduce the independent check from the repository root:

```powershell
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' outputs/predictive_error_visibility_20261010/qa/verify-runtime.cjs
```

The isolated fixture executes the real HTML/script and CSV export, stubbing only
the chart canvas. The focused frontend tests separately exercise the real chart
and download path. This review verifies display/export contracts and preserved
claim boundaries; it does not establish live warehouse availability, forecast
reliability or business acceptance. A decision-specific maximum MAE and WAPE on
an agreed cohort and leads are still needed to call an error acceptable.

Supporting role: QA Engineer. Current QA role and worker/execution guidance were
reused. Applied `.skills/testing-standards.md` for pre-established hand
expectations, separate evidence and failure classification;
`.skills/analytics-frameworks.md` for matching populations, historical metrics,
signs and missing versus zero; `.skills/frontend-standards.md` for unit labels,
available/unavailable state and table/export agreement;
`.skills/security-standards.md` for actual HTML/CSV escaping boundaries. Current
coding and database-lineage guidance informed source identity and bounded
verification. All QA writes are confined to this directory; runtime and test
sources were reviewed read-only.

No unresolved defects remain in this scope. Root owns documentation, final
sealing and delivery; the client/data owner still owns business error limits and
future actual releases.
