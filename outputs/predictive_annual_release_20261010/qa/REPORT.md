# Independent annual projection QA

**PASS for the research artifact contract:** 1,156 artifact and numerical checks, 11 independently rerun fixture tests, and 3 hand-computable tests of the independent ridge math. This is technical verification of unpublished research projections, not business approval or measured 2026 forecasting accuracy.

Projection identity: `a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b`.

The registered input, input sidecar, all ten original comparison artifacts, five evaluated adapter files, model configurations, seed, packages, selection and inherited evaluations match their retained byte or canonical identities. The new annual module matches its pre-fit registration. `verification.json` binds the input, prior run, registration, output run and independent QA code to SHA-256 identities.

All 21 recipes use exactly 72 eligible January 2020–December 2025 values and produce 252 unique January–December 2026 points at true leads 1–12. All 21 have twelve finite predictions. Actuals and both interval bounds remain null, with five dependent development errors explicitly insufficient for calibration. Labels reconcile to 189 elapsed, 21 current-month and 42 future points. Actual UTC generation follows source extraction and registration; the Manila reference date does not backdate issue time.

The inherited `last_value` selection exactly equals the December 2025 target of **₱23,493,882.59** in each of twelve months. Four benchmark recipes were independently reconstructed using Decimal source values. Four ridge recipes were reconstructed with separate NumPy array features and an augmented, unpenalized-intercept least-squares solver, importing no production forecast code. The largest ridge difference is **₱0.000000159**, below the **₱0.01** tolerance fixed before observing outputs. The six-month mean difference is below ₱0.000000001; other benchmarks match exactly.

The fixture suite meaningfully covers exact training and invocation counts, unknown recipe/target contracts, gaps and lost approval, partial/nonfinite/malformed output, convergence warnings, checksums and registration drift, no overwrite, null unsupported intervals, and date semantics. The independent math tests check the unpenalized intercept, a hand-computed shrinkage example and constant-series direct/recursive behavior. Fixtures establish contract behavior, not live cloud acceptance. The retained SARIMA airline warning concerns non-invertible starting seasonal moving-average parameters; it is disclosed and is not a convergence failure.

No defect remains in the checked scope. ETS, Prophet and SARIMA numerical values were checked for identity, finite coherent output and disclosed warnings; they were **not independently refitted**. No new 2026 score, model selection, calibrated interval, approved serving release, warehouse write or procurement outcome is established. The adopted annual release constraint still lacks a source-owner release date, and source causes remain unconfirmed.

Accountable supporting role: QA Engineer. Guidance applied: `.agents/worker-operating-model.md`, `.agents/execution-contract.md`, `.agents/qa-engineer.md`, `.skills/testing-standards.md`, `.skills/analytics-frameworks.md`, `.skills/database-standards.md`, `.skills/coding-standards.md`, and relevant `docs/TESTING.md` / `docs/PREDICTIVE_OPERATIONS.md` contracts. Changes are confined to this `qa/` directory.

Reproduce from the repository root using the existing predictive environment:

```powershell
.\.venv-predictive\Scripts\python.exe outputs/predictive_annual_release_20261010/qa/independent_expected.py --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --output outputs/predictive_annual_release_20261010/qa/reproduced-expected-values.json
.\.venv-predictive\Scripts\python.exe outputs/predictive_annual_release_20261010/qa/verify_annual.py --input outputs/predictive_validation/2026-10-09T13-28-48-501Z/input.json --comparison outputs/predictive_completion_20261009/models/fixed-origin-extended/eac9b508c8f1a28e7a3e3b967cf2189cc20ed0f16d3b70ca21eea0c243282f5a/run.json --run outputs/predictive_annual_release_20261010/models/annual-origin-2025-12-asof-2026-10-10/a0047f8b88958a46152b457770211c53976f769bf24c9a9df097abb00dc6d39b/run.json --expected outputs/predictive_annual_release_20261010/qa/expected-values.json --output outputs/predictive_annual_release_20261010/qa/reproduced-verification.json
.\.venv-predictive\Scripts\python.exe -m unittest services.tests.test_predictive_annual_projection -v
.\.venv-predictive\Scripts\python.exe outputs/predictive_annual_release_20261010/qa/test_independent_math.py
```

Retain the original `expected-values.json` when verifying the chronology assertion; later recomputation establishes numerical reproducibility but cannot precede an already completed fit. The original expected values were frozen before the actual projection run.
