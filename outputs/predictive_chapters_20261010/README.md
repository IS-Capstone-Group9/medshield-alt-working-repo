# Step 3 predictive sections for Chapters 4 and 5

The [editable Word research draft](../../docs/chapters/MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.docx)
and [matching Markdown](../../docs/chapters/MedShield_Predictive_Chapter_4_5_Research_Draft_20261010.md)
provide the predictive results, discussion, conclusions and recommendations for
integration into the wider manuscript. They contain all 21 saved model
configurations, peso and percentage errors, direction analysis, source and
evaluation limitations, separately generated 2026 projections and local evidence
references. Existing Chapter 4 and combined Chapter 4/5 Word files are preserved.

**Guided Step 3's predictive writing deliverable is complete once the separate
content and visual reviews and delivery checks pass.** The full Chapters 4 and 5
still require integration of descriptive, system and scenario evidence, final
institutional formatting and academic/client review. No new business acceptance,
operational activation, model fit or application change is supplied by this task.
Step 2's maximum acceptable MAE/WAPE remain unset.

## Ownership and acceptance

Accountable role: Technical Writer. Supporting Data Analyst extracted source and
model facts; a separate Technical Writer reviewed prose and claims; a separate
QA Engineer checked numerical and DOCX parity. Root owns integration and manual
visual review. Numerical claims are derived from saved JSON, including the
complete comparison table; a corrected transcription in a supporting handoff
was never used as the authoring source.

The plan was to read the current chapter guidance and existing drafts, preserve
them, author a bounded predictive insert, compare every reported value to
independent source expectations, render and inspect all pages, then update the
documentation index and dated current state. For example, the draft distinguishes
the audit's December 2024 last-value origin from the annual projection's December
2025 origin. Missing 2026 actuals remain missing rather than receiving an accuracy
or business acceptance score.

Business impact is a defensible research write-up for the client/adviser. Analytics
impact is presentation of inherited evidence with unchanged source, model and
selection identities. Application architecture, database schema, authentication,
secrets, deployment and operating services are unaffected. No application build,
model fitting or warehouse write is needed for this writing task.

Acceptance checks cover all 21 displayed metric rows, direction sums and narrative
numbers; source hashes and preserved document hashes; complete Markdown, structured
manuscript and Word content parity; original O3 and acceptance/timing boundaries;
local links, tables, headings and figure; and all eight rendered pages. Numerical
expected results were frozen independently before authoring. See the [QA
report](qa/REPORT.md), [authoring receipt](authoring-receipt.json), [manual visual
review](render/visual-review.json) and [delivery record](delivery.json).

## Reproduction and recovery

The builder uses the bundled workspace Python and python-docx, with no model or
gateway imports. Its actual executable and command are in the authoring receipt.
It refuses existing outputs unless explicitly revising its own hash-matched
drafts; the first authored versions are retained under `authoring-first/`.
Do not rerun it into this completed packet. Later manuscript changes need their
own dated revision and new content and visual review.

The first builder invocation failed a bracket syntax check before creating any
document; the corrected invocation succeeded. The first complete authoring was
subsequently revised for two reader corrections: scope-table punctuation and
records dated through each origin in the frozen snapshot. This retained
historical-availability uncertainty and changed no numerical result.

The packaged `render_docx.py` was attempted and failed before conversion because
`soffice.exe` was absent. PowerShell Word automation encountered interface and
parameter marshaling errors. Native VBScript automation then exported the Word
document read-only and invisibly, without changing registry settings or using
installed LibreOffice. Bundled Python/PDFium rasterized all eight pages. Both
root and the independent reviewer inspected every page. PDF/PNG files are
internal QA artifacts; the editable Word draft is the user deliverable.

Successful render commands from the repository root:

```powershell
cscript //nologo outputs/predictive_chapters_20261010/render_word.vbs
& 'C:/Users/Adrian/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -X utf8 outputs/predictive_chapters_20261010/rasterize_pages.py
```

Applied skills: `.skills/documentation-standards.md` for canonical wording and
draft placement; `.skills/analytics-frameworks.md` for comparable errors, temporal
evidence and claim limits; `.skills/testing-standards.md` for independent numeric
expectations and proportionate checks; `.skills/coding-standards.md` for the
offline builder; `.skills/technology-stack.md` for unchanged runtime boundaries;
supporting database-lineage guidance for frozen source identity; and the
documents skill for editable Word structure, rendering and every-page review.
Worker/execution contracts and each supporting role informed their assignments.

Next owner: the study authors integrate the predictive insert with the full
manuscript and obtain adviser/client review. The data owner supplies the next
annual release when available; the analyst then performs a separately scoped
actuals and timing review. No confirmed annual release date is invented.
