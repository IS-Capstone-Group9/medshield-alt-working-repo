# Four medicine proposals — 8 October 2026

Accountable role: Data Analyst; validation is self-review. Local preparation only.
Both 4,561-row, 29-column CSV copies are 4,751,328 bytes, SHA-256
`ad6d74d4fc24cda3217f3612fb92cb417278fdbde20dc45c15725b99897df12c`.

## Evidence and decisions

- Locaine 50ML, Locaine 2% 50ML and Eurocaine now propose `medicine` and
  `physical_product`, with the named brand. Quezon City purchase order 2405070
  (20 May 2024), PDF page 2, lists these as alternative lidocaine hydrochloride
  brands in a 2%, 50 mL presentation. This independently supports the category
  proposal. Missing historical concentration, dosage form and container values
  remain missing. The alternatives are not merged into one SKU.
- Sanoxin-1000 now proposes `medicine`, `physical_product`, brand SANOXIN,
  strength 1000MG and powder for injection. AMB Pharma's catalog PDF page 8
  identifies Sanoxin 1000 as cefoxitin sodium 1000 mg powder for injection.
  Strength and form are explicitly catalog-supported proposals; they do not
  establish the exact presentation sold in a historical transaction.

The downloaded, unchanged primary sources and their SHA-256 hashes are recorded
in `evidence.json`. Both relevant pages were rendered and visually checked.
No prices, aliases, reviewer/date, canonical SKU, historical sales-unit, pack,
identity approval or forecast eligibility were fabricated or changed.

## Verification

`verify.py` separately compared every cell against `before.csv`, validated the
master and draft rules, checked identical deployment bytes, and compared resolved
metadata for all 4,561 labels. Only the four selected rows changed. Only
`category_status` and `catalog_evidence_source` differ in resolved metadata; all
immutable resolved values remain equal. Categories remain Unclassified in the
runtime until category approval. Zero approvals and zero forecast-eligible rows.

The artifact-tool builder imported and inspected the CSV and rendered the four
rows before and after editing. The skill's operation marker initially failed
because its listed bundle path was stale; the installed marker was located and
run successfully after the edit. That workflow timing failure is recorded here;
it does not replace the independent cell and byte validation.

## Cloud limitations

The read-only `cloud-check.ts` checks captured version readability, retention
properties, latest versions, Workspace access and Jobs access. Workspace and Jobs
each returned HTTP 403. No cloud writes, reference uploads or notebook runs occur
in this check. Readable versions alone do not prove a recovery rehearsal.
See `cloud-check.json` for the actual checked versions and outcomes.

The previous publication descriptor is preserved as
`catalog_publication.before.json`. A fresh read-only preparation binds the new
CSV hash to its predecessor and dependencies. The generated dated package
remains non-executable until controlled maintenance, preservation of deployed
sources/references and isolated recovery rehearsal are verified by an operator
with the required access. Keep the serving fact pin unchanged.
