# Product-master and finance review handoff

Prepared 27 September 2026 from the read-only [publication audit](../publication_readiness/2026-09-26T17-04-39-531Z/README.md). This is a prioritized review list, not an approval or an uploaded product master. Dataset: `b1d48fb58a6d8bdfcfc8db303cfa87141e36ddb7af8b489049adb95fb75943c4`. Recollect evidence if the warehouse dataset or source/mapping versions change.

## Product owner: review highest sales value first

Use [product_review_queue.csv](product_review_queue.csv). The queue contains the audit's top 25 labels without canonical SKU identity, ranked by eligible net sales; it is a starting shortlist, not the complete product inventory. Start with SPEEDA 2.5IU/0.5ML, PROHAB 10MG/ML 20ML, BUPIRIGHT 5MG/ML 0.5% IN 8% 4ML, SITIXON 1G, and MONOWEL 1G IV.

For each source label, confirm canonical SKU, strength, dosage form, pack, medical/nonmedical scope, and matching source evidence. Record the reviewer and decision in the queue. Do not infer medicine identity from sales value or an ambiguous name. Then expand to remaining labels; handle nonmedical and hashtag labels explicitly. Transfer approved decisions into the actual product-master template only after review, validate uniqueness and fields, and rebuild Gold under the approved change process. Do not upload this review queue as the master.

## Finance/data owner: resolve monetary and source-period risks

Use [finance_review_queue.csv](finance_review_queue.csv). Start with missing net sales (880 rows), transfer formula mismatch (1,792), gross value formula mismatch (1,424), missing gross margin (137), and the low-trust 2017/source-year/backfill groups. Counts overlap and must not be added as unique transactions.

Inspect source-record examples before accepting, excluding, or correcting a value. Retain source IDs/checksums and the reason for each decision. Validate dash-discount and derived-value policies separately; a documented transformation is not automatically an erroneous transaction. Negative sales/quantities may be returns or credits and require business evidence, not blanket deletion.

Confirm source completeness for all years, especially 2017/2018/2019 with 5/2/3 unobserved months. Record whether missing periods reflect no activity or missing source coverage. Preserve gaps until supported; do not invent zeros.

## Acceptance record

Bind decisions to dataset ID, source manifest, mapping hashes, reviewer, date, and evidence hash. After approved corrections, rerun Gold reconciliation and dashboard checks. Product identity, financial definitions, geographic/external joins, and trained-model approval remain separate gates. These files contain no recorded owner approvals.
