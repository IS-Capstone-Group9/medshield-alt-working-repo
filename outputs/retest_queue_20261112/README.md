# Queued re-tests, registered 12 November 2026

Three retired models get one fair second chance on **months no study has seen** (after September 2026). The test plans
were frozen in `run.py` before any such month existed; `registration.sha256` holds the fingerprints. Do not edit `run.py`:
any change needs a new registration.

| Test | Model | Why it has a real chance | Pass rule |
|---|---|---|---|
| R1 | ETS (project's `stable_ets`, seasonal) on routine sales | Tied best on the total; routine sales are steadier | Standard win rule vs mean_6 |
| R2 | 80% ranges on routine sales | Ranges failed because large orders widened errors | Coverage 75–85% |
| R3 | TSB on approved families, discontinued families dropped | Families cut its bias from +77% to +18% | Standard win rule vs mean_6 |

Each needs **at least 12 new months** before it can be judged. Until then the runner reports `PENDING` and scores nothing
(checked on 12 Nov 2026: all three `PENDING (0/12 new months)`). A synthetic future series confirmed the scoring runs end
to end; that check is not evidence.

## When new data arrives

1. Load the new months through the Databricks intake, and confirm history through 2026-09 is unchanged.
2. Save the `GET /api/sales/sales-streams` response as JSON, and export family-month net PHP (`family,period,net_php`).
3. Run from the repository root:

```
python -X utf8 outputs/retest_queue_20261112/run.py --streams <streams.json> --families <families.csv>
```

4. Record the outcome in `docs/MODEL_REGISTER.md`. A pass makes the model a candidate only; a failure is final.
