# Risks

Last reviewed: 2026-09-25

| Risk | Consequence | Control | Current state |
|---|---|---|---|
| Candidate data described as approved | Unsupported capstone or business claims | Preserve `_candidate`, provenance, dataset ID, policy version, and named approvals | Open |
| Contract allocation treated as observed SKU sales | False product demand | Preserve parent-child allocation lineage and estimated flags; reconcile totals | Open review |
| Derived buyer/geography mapping treated as source-recorded | Misleading sector/territory conclusions | Trace to controlled reference and display mapping basis/confidence | Implemented mapping; owner approval open |
| Financial field misinterpretation | Incorrect revenue or profit KPIs | Use approved definitions and finance reconciliation | Definition documented; approval open |
| PAGASA/NASA/DOH conflation | False official or predictive claims | Keep providers, periods, proxies, and join eligibility separate | Enforced in current contracts |
| Silent local/mock fallback | Users see stale or fabricated analytics | Fail closed when Databricks is unavailable | Implemented |
| Warehouse latency or cold start | Slow login/filter interactions | Gateway query cache, bounded concurrency, narrower SQL, visible loading states | Mitigated; monitor |
| Secrets exposed to browser or Git | Data/workspace compromise | Server-only variables, HTTPS host validation, scoped tokens | Required control |
| Scenario outputs treated as procurement decisions | Financial/operational harm | Require visible assumptions and human review; no purchase execution | Implemented boundary |
| Documentation drift | Team implements against obsolete architecture or totals | Maintain `CURRENT_STATE.md` and this audit index with every contract change | Addressed by 2026-09-25 audit |
