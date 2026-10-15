# Analytics lessons review and worker training assessment

Reviewed: 8 October 2026, Asia/Manila. Accountable role: Technical Writer. Supporting reviewers: `chapters_2_3` (Business/Data Analyst), `chapters_4_5` (Data Analyst), `guidance_gap_review` (repository guidance), and `coach_forward_test` (bounded coaching trial).

## Assessment

**Yes: these lessons can help develop our helpers, skills and agents when used as a curated curriculum with corrected examples.** All five decks have useful material. Chapters 2–3 are particularly useful for framing work and establishing data contracts; Chapters 4–5 are useful for analytical reasoning and evaluation. Chapter 1 gives the decision and communication context.

The strongest improvement opportunity is applied practice and feedback. Existing roles already require scope control, quality checks, numerical reconciliation, evidence identity, causal caution and leakage-safe evaluation. Copying the full lessons into every agent would duplicate those rules and import faulty images. A dedicated coach can select the relevant concept, give a concrete task, retain the first response, correct errors and route implementation to an existing specialist.

Readiness decision: **usable for instruction and practice with the corrections below; unsuitable as an unreviewed answer bank or production implementation specification.** No PowerPoint source was edited. Source inspection, checked practice answers and one coaching trial do not establish a measured improvement in agent performance or update model weights.

## Source identity and review coverage

All **415 slides** were reviewed through slide text, available speaker notes and embedded-image inspection. Cover/outcome/closing slides were included. There are 384 image assets across the chapter extracts and 50 contact sheets. Notes were present on 106 slides. Important numerical diagrams were opened at original resolution. Sources remain byte-identical to the extraction manifest.

| Source | Slides read | Slides with notes | Image assets inspected | Source SHA-256 |
|---|---:|---:|---:|---|
| [Chapter 1](Chapter%201%20-%20Introduction%20to%20Analytics%20Application.pptx) | 34/34 | 9 | 38 | `f76fd83645b0743798f54d17103bf245e6e60322612f31389ac19672cf1c18db` |
| [Chapter 2](Chapter%202%20-%20Framing%20Analytics%20Problems.pptx) | 138/138 | 86 | 140 | `26403f141e46c9b6d216120aea06790ba19046596c0b94698d9d61ebcc91dd2c` |
| [Chapter 3](Chapter%203%20-%20Data%20for%20Modern%20Analytics.pptx) | 69/69 | 6 | 57 | `0bb1c9d137217413efdacbdf569da8b902d1ec703ec2a2a6a1d9810477e69041` |
| [Chapter 4](Chapter%204%20-%20Exploratory%20%26%20Diagnostic%20Analytics.pptx) | 106/106 | 3 | 88 | `09b6f9a0c067e7882b906a53d6ea97a05c3b2940fb55b0b29c2cb5c680fd1090` |
| [Chapter 5](Chapter%205%20-%20Predictive%20Analytics.pptx) | 68/68 | 2 | 61 | `2c69ef765698b014ace6ff69d498f65708da93432e5fe9eed1184e6bc05e055d` |

The [manifest](../outputs/lesson_review_20261008/manifest.json) records exact source paths, byte sizes, hashes and counts. Per-slide text/notes/asset mappings are in [Chapter 1](../outputs/lesson_review_20261008/chapter-1/slides.json), [Chapter 2](../outputs/lesson_review_20261008/chapter-2/slides.json), [Chapter 3](../outputs/lesson_review_20261008/chapter-3/slides.json), [Chapter 4](../outputs/lesson_review_20261008/chapter-4/slides.json) and [Chapter 5](../outputs/lesson_review_20261008/chapter-5/slides.json). The [coverage ledger](../outputs/lesson_review_20261008/coverage.csv) maps each slide to its reviewing worker and source hash.

Method limitations: this was a lesson-content review using OOXML extraction and embedded media, not PowerPoint layout/animation QA. GIFs were inspected as still frames. Linked videos on Chapter 1 slide 5 and Chapter 4 slide 57 were not watched. Content inherited from slide masters, animation timing, live product screenshots, source licensing and every secondary citation were not independently reviewed. No native chart caches or nonimage embedded media were found in the inspected slide relationships. A targeted primary-source check was performed for the Chapter 3 slide 59 attribution error; technical corrections also use primary references cited below. No live analytical data, warehouse writes or model training were part of this assessment.

## Whole-lesson topic map

Ranges below cover every slide exactly once within its chapter. They group learning concepts rather than counting decorative images or repeated tables as new material.

| Chapter 1 slides | Reviewed content and learning use |
|---|---|
| 1–7 | Outcomes, flood-response decision case, uncertainty; establish a decision before a tool |
| 8–13 | Data/information/findings/insight, context, origin, transformation, trust and use |
| 14–22 | Storytelling, insight funnel, exploration versus explanation, visual choice and audience |
| 23–26 | Analysis versus analytics, four analytical purposes, evaluation and impact |
| 27–34 | Symptoms/problems, stakeholders, objectives/constraints, decision-driven lifecycle and closing |

| Chapter 2 slides | Reviewed content and learning use |
|---|---|
| 1–7 | Outcomes, NEXUS fulfillment case, framing before tools, analytical chain |
| 8–13 | Framework/methodology/process/lifecycle distinctions and framework families |
| 14–17 | KDD and the data-mining step; preparation and interpretation |
| 18–21 | CRISP-DM phases, iteration, business objectives and deployment |
| 22–25 | SEMMA technical modeling workflow and its scope limits |
| 26–30 | TDSP collaboration, reproducibility, engineering/deployment; framework synthesis |
| 31–39 | INFORMS seven-domain umbrella and complementary iterative practices |
| 40–46 | Business versus analytical framing, analytical amenability and agreement checkpoints |
| 47–55 | Ambiguity, situations, observations, signals, anomalies and evidence |
| 56–68 | Symptoms, needs, problems, opportunities, issues, risks, causes, factors and mechanisms |
| 69–83 | Problem statements, decisions/authority, variables, alternatives, baselines and tool-driven pitfalls |
| 84–96 | Stakeholders, sponsors/users/beneficiaries, data ownership, stewardship, experts and requirements |
| 97–112 | Questions/types, goals/objectives, outputs/outcomes/impact, metrics/KPIs and success criteria |
| 113–118 | KPI trees and worked examples |
| 119–129 | Charter, scope/grain/time, assumptions/dependencies, risks, causal caution, feasibility and NOVA case |
| 130–135 | Framing workshop and NEXUS worked charter |
| 136–138 | Takeaways and closing |

| Chapter 3 slides | Reviewed content and learning use |
|---|---|
| 1–10 | Outcomes/prerequisites, Domain III deliverables, governance and lineage |
| 11–14 | Evidence supply chain and platform capabilities |
| 15–21 | Ingestion/storage/preparation, orchestration/observability, serving/security and AI enablement |
| 22–28 | Big Data and 5Vs, workload-relative scale, veracity and value |
| 29–34 | Decision latency, batch/streaming, event versus processing time and CDC |
| 35–42 | Warehouse/lake/lakehouse, formats/table layers and medallion architecture |
| 43–47 | ETL/ELT, elasticity, separated storage/compute and serverless trade-offs |
| 48–57 | Ownership, mesh/fabric, data products/contracts, catalog/metadata/lineage and semantic metrics |
| 58–62 | Analytics-ready/AI-ready data, multimodal alignment, governance and ethical quotation |
| 63–66 | Architecture decision matrix, sector examples and trends |
| 67–69 | Takeaways and closing |

| Chapter 4 slides | Reviewed content and learning use |
|---|---|
| 1–8 | Outcomes, INFORMS domains, analytical purposes and evidence before methodology |
| 9–23 | EDA boundaries; univariate, bivariate, multivariate and temporal investigation |
| 24–35 | Retrospective diagnosis, localization versus explanation, vocabulary and comparison |
| 36–44 | Drill-down, relationships, decomposition and variance contribution |
| 45–56 | RCA limits, hypotheses, cohorts, triangulation, diagnostic funnel and stopping rule |
| 57–74 | Toolkit references; expected frequency, chi-square, residuals and Cramér's V |
| 75–93 | Historical time-series decomposition, additive/multiplicative examples and remainders |
| 94–106 | Operations, chart choice, AI assistance, takeaways and closing |

| Chapter 5 slides | Reviewed content and learning use |
|---|---|
| 1–7 | Prediction products, causality boundary, target and prediction moment |
| 8–20 | KNN, trees/ensembles, regression, forecasting and moving averages |
| 21–29 | Outputs, baselines, partitions, temporal validation, fit/generalization and drift |
| 30–40 | Confusion matrix, classification errors, threshold/ranking and probability quality |
| 41–48 | Regression, quantile and forecast metrics; decision horizons and metric selection |
| 49–59 | Scenario fit, costs, interpretation, operations and leakage-safe pipelines |
| 60–64 | Churn, sales, fraud and model-policy comparison drills |
| 65–68 | Repeated diagnostic recap and closing |

## What this adds to the current workers

| Training audience | Useful lesson material | Practical outcome | Existing owner remains |
|---|---|---|---|
| Business/framing helpers | Ch1 27–33; Ch2 40–46, 69–96, 101–123 | Decision brief, explicit uncertainty, technical versus business acceptance | Business Analyst |
| Data/metric helpers | Ch2 102–112, 121; Ch3 13–20, 33–34, 55–57 | Grain/units/eligibility contract, quality/freshness checks and reconciliation | Data Analyst / Database Engineer |
| Diagnostic/reporting agents | Ch4 31–56, 61–93 | Localize changes, reconcile contributions, evaluate hypotheses, communicate limits | Data Analyst / BI Specialist |
| Predictive helpers/agents | Ch5 21–32, 39–48, 52–59, 64 | Target/origin/lead contract, baseline, fair validation and leakage prevention | Data Analyst; release owner controls activation |
| Reusable skills | Relevant concept plus corrected example and canonical references | Short instructions with conditional references and actual failure probes | Technical Writer |
| QA/evaluation helpers | Ch2 110–111; Ch5 25–26, 46–48, 58 | Expected-result basis, retained first attempt and comparable trials | QA Engineer; shared execution contract |

The lessons are conceptual support for Backend/Frontend/DevOps/Security work. They do not teach MedShield's handler bridge, service contracts, authentication, secret handling, migrations, recovery or deployment in enough detail to replace the relevant canonical docs.

The dedicated coach adds curriculum ownership, source-to-practice mapping, teach-back, misconception feedback and transfer exercises. It does not replace existing analysts or add another business approval authority. Use [the worker operating model](../.agents/worker-operating-model.md) for routing.

## Corrections before reuse

“Exclude” means the new skill must not use the affected illustration as an authoritative answer. These findings do not alter the source decks; correction notes govern the new training material.

| Source | Finding | Training treatment |
|---|---|---|
| Ch1 11 | States that all variables necessarily share contextual association | Qualify: context can influence variables; shared context does not guarantee nonzero association or a direct relationship |
| Ch1 16, 20–21 | Strong reporting/storytelling split can pressure the learner to supply a complete “why” | Teach evidence-backed narrative while allowing cause and impact to remain unresolved; a persuasive explanation is not causal proof |
| Ch2 16, asset 009 | Imported KDD/data-mining diagram conflicts with the narrower computational-step definition | Use surrounding definitions; exclude the broad diagram as the definition |
| Ch2 20–21, assets 012/013 | Five-stage/partial technical illustrations omit full CRISP-DM scope and suggest generic outlier removal/PCA/DTR | Use slides 18–19's phases; treat methods as conditional and preserve legitimate unusual/repeated source evidence |
| Ch2 114, asset 124 | Subscribers × price is labeled revenue growth | Distinguish level from growth; growth requires a baseline and compatible periods/populations |
| Ch2 116–117 | “10% profit-margin increase” is ambiguous; an example retains “Add text here” placeholders | Specify relative percent versus percentage points; exclude unfinished template text and do not adopt its targets as policy |
| Ch2 118/132, asset 129 | Timely orders divided by delivered orders may exclude overdue undelivered orders | Define due-period eligibility and uncompleted/censored cases before SLA use |
| Ch2 125/130 | Broad anticipated “value” and classroom framing checkpoints | Distinguish organizational benefit from statistical expected value; reuse existing authorization and scope instead of imposing a new permission checkpoint |
| Ch3 17/42 | Generic deduplication advice lacks source-record semantics | Preserve legitimate repeated transactions; distinguish processing retries from repeated source lines |
| Ch3 36–40, 50–54, 61 | Simplified platform/vendor images and an unsupported multimodal screenshot | Use concepts as design criteria, not fixed product capabilities or proof of implemented mesh/multimodal governance |
| Ch3 59 | Quotation is attributed to a different document and differs from official English wording | Exclude from the technical skill; if reused, correct attribution and label the wording a paraphrase; primary references below |
| Ch3 24–27/67 | The chosen 5Vs include value; recap introduces variability | Clarify taxonomy variation rather than teaching an inconsistent recap |
| Ch4 26/30, assets 015/020 | Images state root cause/rain explanation more strongly than the cautious text | Label candidate explanations and require alternatives/corroboration |
| Ch4 62–63, asset 058 | Ambiguous/incorrect column-total notation in expected-frequency formula | Use `E_rc = RowTotal_r × ColumnTotal_c / N`; the displayed worked counts are correct |
| Ch4 89–90 | Rolling means 103/105/107 are labeled annual Y1/Y2/Y3 means | Annual means are 103/111/119; 103/105/107 are successive trailing four-quarter windows |
| Ch5 18, asset 021 | EMA omits `(C−P)` parentheses; WMA does not state normalized weights | Use `P + α(C−P)` with initialization; WMA divides by total weight unless weights sum to one |
| Ch5 23, asset 027 | Malformed overview, wrong metric categories and unrelated accuracy labels | Exclude. TP24/TN17/FP22/FN15 imply 41/78 = 52.564% accuracy; MAE/RMSE/F1 are not proper probability scores |
| Ch5 26, asset 033 | Rotating K-fold diagram trains on future folds despite time-series text | Exclude; teach expanding/sliding origins, train before validation, fold-local preprocessing |
| Ch5 43, asset 047 | Pinball-loss graph reverses error sides for `actual − forecast` | For q=.8, positive/right underprediction has slope .8, negative/left overprediction slope −.2; example losses 8 and 2 are correct |
| Ch5 45/61, assets 048/058 | MASE < 1 is treated as proof of beating a holdout naive model | State training scaling period/seasonality and zero-scale behavior; compare baseline on the same holdout/leads separately |
| Ch5 60, asset 057 | ROC caption says orange B has higher recall while plotted B is lower | Exclude that claim; fixed FPR also does not establish equal review capacity |
| Ch5 60/62, assets 057/059 | “Calibrated” curves sit materially below the identity line | Exclude labels; teach observed frequency versus predicted probability with bins/sample context |
| Ch5 62, asset 059 | One probability-weighted loss formula is used to assign Pass/Review/Block | Compare action-specific loss matrices, prevention effects and residual risk; its arithmetic alone cannot choose an action |
| Ch5 63 | Precision/recall pairs do not reconcile for a common fixed K and positive population | Require counts/capacity/population context or replace values: `precision/recall = N_positive/K` must stay constant |
| Ch5 6 versus 25/64 | Workflow places policy selection after final test, elsewhere before it | Freeze model and operating policy on development evidence before untouched final assessment |
| Ch5 46, asset 049 | Seasonal-naive expression leaves k undefined | Define `k = ceil(h/m)` in `y_(t+h−km)` so the source observation is at/before origin |
| Ch4 71–72; Ch5 33–38, 65–67 | Duplicated material; Chapter 5 recap repeats diagnostic takeaways | Group repetition; use a predictive recap covering baselines, metrics, leakage, policy and holdout evidence |

Supporting primary references for technical corrections: [scikit-learn time-series validation](https://scikit-learn.org/stable/modules/cross_validation.html#time-series-split), [pinball loss](https://scikit-learn.org/stable/modules/model_evaluation.html#pinball-loss), [probability calibration](https://scikit-learn.org/stable/modules/calibration.html), [Forecasting: Principles and Practice accuracy](https://otexts.com/fpp3/accuracy.html) and [seasonal-naive methods](https://otexts.com/fpp3/simple-methods.html).

The Chapter 3 slide 59 idea appears in §10.3 of [Drawing New Maps of Hope, 27 October 2025](https://www.vatican.va/content/leo-xiv/en/apost_letters/documents/20251027-disegnare-nuove-mappe.html), with different official English wording. It is misattributed to [Magnifica Humanitas, 15 May 2026](https://www.vatican.va/content/leo-xiv/en/encyclicals/documents/20260515-magnifica-humanitas.html); that document exists, but the checked phrase is absent. This correction is a supporting reviewer's primary-source check, not a validation of every deck citation.

## Correct examples worth retaining

The supporting analytical reviewer separately recomputed the following displayed examples; values here reflect that inherited review evidence, rather than live MedShield data.

| Example | Recomputed answer basis | Limit |
|---|---|---|
| Ch4 61–74 channel/churn | Expected cells 140/60 per row; chi-square 33.333333; df 2; p about 5.78×10⁻⁸; V .235702; largest cell contribution 45% | Categorical association; sampling assumptions still matter |
| Ch4 67–69 residuals | `.84515, −1.29099; −2.53546, 3.87298; 1.69031, −2.58199` | Cell localization is not proof of causation |
| Ch4 85–91 quarterly decomposition | Trailing MA 103/105/…/119; centered MA 104/106/…/118; seasonal −12/+2/+14/−4 | Annual annotation needs correction; centered smoothing may leak future information |
| Ch4 92 multiplicative exercise | Expected 900/1200/1540/1600; remainder ratios 1/1.05/.95/1.10 | Multiplicative methods need suitable positive values |
| Ch5 42 delivery errors | MAE 4.2; MSE 27.4; RMSE 5.234501; R² .863 | A worked fixture does not establish a deployed model's accuracy |
| Ch5 45 forecast errors | MAE 8.6; RMSE 9.219544; MAPE 6.727106%; signed bias 7.4 | MASE 8.6/11.5=.747826 uses an asserted scale; training history was not supplied |
| Ch5 37 classification | 845/900=.938889, rounded 94% | Aggregate accuracy alone does not establish queue usefulness |

## MedShield adaptations and remaining gaps

Apply [business definitions](../docs/BUSINESS_DEFINITIONS.md), [architecture](../docs/ARCHITECTURE.md), [decisions](../docs/DECISIONS.md), [analytics status](../docs/ANALYTICS.md) and [current state](../docs/CURRENT_STATE.md). Changing approvals, counts and table/model versions stay there and in their receipts; do not hard-code them into reusable coaching rules.

- Historical PHP revenue is distinct from verified medicine quantity. Fulfilled source sales are not unconstrained market demand; unknown packs/identity and stockout censoring need explicit treatment.
- Gross margin is not company net profit. Rate numerator and denominator must use the same eligible population. Preserve signed adjustments, original/adjusted source status and missing versus observed-zero values.
- A weather join needs reviewed geography, consistent time/grain, provider identity and cardinality checks. Official observations, provider proxies and issue-time forecasts have different meanings and availability.
- Chi-square requires suitable counts and observational independence; transaction rows are not automatically independent cases. Inspect sparse expected cells and clustering. Exploratory cell tests require appropriate multiplicity handling; [SciPy's guidance](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.chi2_contingency.html) gives the underlying test constraints.
- Forecast evaluation must use accepted targets/units, origin-available features, actual calendar leads and recency. Centered/full-history decomposition is historical evidence, not automatically a valid feature. Intermittent series, missing periods, zero scaling denominators, delayed labels, group/time leakage, intervals and drift need task-specific checks beyond the lessons.
- Databricks remains the analytical source. Required-source failure produces an explicit unavailable state. Lesson fixtures, generated extracts and local files never become dashboard fallback data.
- User-entered stock/demand remain scenario assumptions. Applicable model/data approvals and verified inventory, on-order/commitments, supplier, lead-time, pack/cost/service/expiry inputs are needed before operational replenishment.
- The decks supply no fine-tuning dataset, agent-specific tool trust design, secret redaction procedure or repeated before/after performance experiment. Existing execution/security contracts supply those relevant boundaries.

## Delivered worker, skill and helpers

The [Analytics Learning Coach](../.agents/analytics-learning-coach.md) owns lesson selection, corrected practice, feedback and training records. It hands business decisions, metrics, reporting meaning, implementation and QA to the existing owners. It is routed through the worker matrix and does not automatically launch agents.

The [analytics lesson coaching skill](../.skills/analytics-lesson-coaching/SKILL.md) adds concise curriculum routing and essential correction rules. Its metadata describes the skill; application-level automatic discovery was not verified. Repository guidance links it explicitly.

Nine [learner cases](../.skills/analytics-lesson-coaching/references/practice-cases.md) have separate [assessor notes](../.skills/analytics-lesson-coaching/references/assessor-notes.md): decision framing, shared metric eligibility/YoY, join cardinality, diagnostic contribution/claims, classifier errors, forecast leads/leakage, window semantics, unavailable-source/scenario behavior, and categorical association. Inputs are clearly synthetic. The expected results use independent arithmetic and project contracts.

The [inspection helper](../.skills/analytics-lesson-coaching/scripts/inspect_lessons.py) hashes PPTX sources and extracts slide-linked content/media without editing decks or following links. It refuses an existing evidence folder. Standard-library extraction works without PowerPoint; image previews use Pillow. It is a curriculum helper, not a production analytics input.

## Verification and use

The [verification receipt](../outputs/lesson_review_20261008/verification.json) records source checks, coverage, local links, skill validation, helper probes and practice arithmetic. The [forward-test record](../outputs/lesson_review_20261008/forward-test.md) preserves the actual fresh worker's coaching response, feedback scope and limitations.

The bounded coaching request supplied an incorrect margin denominator, shuffled monthly revenue modeling, realized future rainfall, training-only accuracy, procurement claims and a proposed local CSV fallback. The worker identified these issues and calculated the shared-population margin correctly. This tests instruction usability on one task; there was no baseline/control or repeated comparable trial. A performance improvement remains **not verified**. The nine-case curriculum has checked keys; all nine learner assessments were not executed.

| Delivery criterion | Result | Actual check / limitation |
|---|---|---|
| All five source decks inventoried, slide content covered and corrections recorded | Pass | OOXML text parity for 415 slides; source/media SHA-256 checks; root/supporting reviewers' content inspection and coverage ledger |
| Worker/skill connected to existing routing with clear ownership | Pass | Self-review of worker matrix, analytics framework and new Process entries; owned/new local links resolved |
| Skill structure and numerical practice keys valid | Pass | Bundled `quick_validate.py` succeeded; separate arithmetic checked margin, YoY, join/segment bases, classifier, calendar leads, windows and association keys |
| Reusable inspection helper works and preserves evidence | Pass | Five-deck initial extraction; fresh final Chapter 1 extraction/previews in a temporary folder; missing-input rejection and existing-output refusal |
| Worker behavior improved compared with previous instructions | Not verified | One independent draft-stage coaching trial only; no baseline/repeated comparison; final follow-up reviewer stopped at a usage limit |

Executed verification command: `python -X utf8 outputs/lesson_review_20261008/verify_review.py`. No application build or production analytics check was run because this delivery changes instructions and an offline lesson helper.

The initial link scan exposed this receipt's not-yet-created output path and five pre-existing obsolete runbook links in `docs/DOCUMENTATION_INDEX.md`. The [initial failed receipt](../outputs/lesson_review_20261008/verification-initial.json) is retained. The final scan checks all owned lesson/worker/skill links and verifies the three index links added by this task, while recording those five unchanged baseline issues separately. Those unrelated runbook entries were not repaired or counted as passed. The fresh helper probe additionally verifies the final helper changes; the earlier extraction remains source review evidence.

Recommended use: choose a relevant case, capture the learner's first response, assess it against the answer basis, give feedback and use a fresh equivalent case for transfer. For a claim that revised agents perform better, follow the controlled, repeated trial requirements and five-dimension rubric in [the execution contract](../.agents/execution-contract.md#evaluating-worker-instruction-changes). Keep failed attempts and critical failures visible; corrected retries do not replace first-attempt results.

Acceptance for this delivery is complete when the source review/coverage and correction register exist, the new worker/skill are linked into repository routing, practice keys reconcile, and local helper/link checks pass. Runtime analytical release, model training and procurement are outside this delivery. No application build is needed for these instruction changes.
