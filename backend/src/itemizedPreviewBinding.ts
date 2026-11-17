// Server-only validation pins; never used as analytical fallback values.
export const ITEMIZED_PREVIEW_BINDING = {
  "batchId": "original_fd95b9e3abab028c8e41",
  "datasetId": "e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10",
  "policy": "original_source_layers_v1_candidate_only",
  "receiptTable": "workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_receipt",
  "itemizedTable": "workspace.medshield_original_gold_20261026.original_fd95b9e3abab028c8e41_itemized_candidates",
  "receiptSha256": "d69414d3bb72c706bba30f24489074e4677f403277e18c64bb8d2e643b0012dd",
  "keysSha256": "da74cc50c67e22fd33928f5ca3faaebc3e21a6e1b76f7f169829bf6515d8c580",
  "expectedRecords": 40171,
  "expectedEligibleRecords": 39286,
  "expectedNet": "638015351.530000",
  "expectedGoldReceipt": {
    "record_id": "gold_receipt",
    "dataset_id": "e87cae21986db32bcade298d69e652236be9db65f2685db51355003f1439ff10",
    "pipeline_policy": "original_source_layers_v1_candidate_only",
    "pipeline_code_sha256": "17c7c0c474aeab41271936874d5560b2ecc07fbd702a6d3b330b6706a6a07372",
    "acceptance_manifest_sha256": "49f87290a0919701a6e657ee0938e5fa1efee9bbd595ce1f5c03d097106f179d",
    "physical_lines": 62065,
    "source_files": 10,
    "batch_id": "original_fd95b9e3abab028c8e41",
    "accepted_master_sha256": "470afb59b6ef3f720c54c3d1bb27345ae1629665917b361c10362f8fb2d9f74c",
    "itemized": {
      "records": 40171,
      "technically_eligible_records": 39286,
      "technically_eligible_net_php": "638015351.530000"
    },
    "contracts": {
      "records": 352,
      "technically_eligible_records": 352,
      "technically_eligible_net_php": "118330249.950000"
    },
    "financial": {
      "records": 40523,
      "technically_eligible_records": 39638,
      "technically_eligible_net_php": "756345601.480000"
    },
    "contract_product_breakdown": "unavailable",
    "contract_physical_quantity": null,
    "business_financial_release_approved": false
  }
} as const
