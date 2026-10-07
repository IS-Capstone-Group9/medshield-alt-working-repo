import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const base = "C:/Users/Adrian/projects/medshield1/medshield";
const stagingPath = `${base}/tmp/pagbilao_sample_workbook/full_2025_all_contracts_staging.json`;
const outputDir = `${base}/outputs/full_medshield_2025_allocation`;
const outputPath = `${outputDir}/Full_MedShield_2025_with_all_contract_medical_product_allocation.xlsx`;
const previewDir = `${base}/tmp/pagbilao_sample_workbook/previews_full_2025_all_contracts`;
const payload = JSON.parse(await fs.readFile(stagingPath, "utf8"));
const summary = payload.summary;

const font = "Arial";
const navy = "#17365D";
const blue = "#D9EAF7";
const amber = "#FFF2CC";
const red = "#FCE8E6";
const gray = "#E7E6E6";
const dark = "#1F2937";

function columnLetter(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function cellValue(row, header) {
  const value = row[header];
  if (header === "date_delivered" && value) return new Date(`${value}T00:00:00Z`);
  return value ?? "";
}

function valuesFor(rows, headers) {
  return rows.map((row) => headers.map((header) => cellValue(row, header)));
}

async function writeInChunks(sheet, startRowIndex, startColumnIndex, rows, headers, chunkSize = 300) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    sheet.getRangeByIndexes(startRowIndex + offset, startColumnIndex, chunk.length, headers.length).values = valuesFor(chunk, headers);
  }
}

function styleTitle(sheet, lastColumn, title, warning, sourceText) {
  sheet.getRange(`A2:${lastColumn}2`).values = [[title]];
  sheet.getRange(`A3:${lastColumn}3`).values = [[warning]];
  sheet.getRange(`A4:${lastColumn}4`).values = [[sourceText]];
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.mergeCells(`A4:${lastColumn}4`);
  sheet.getRange("A2").format.font = { name: font, size: 15, bold: true, color: navy };
  sheet.getRange("A3").format.font = { name: font, size: 10, bold: true, color: "#9C6500" };
  sheet.getRange("A4").format.font = { name: font, size: 9, italic: true, color: "#595959" };
}

function styleHeader(sheet, range) {
  sheet.getRange(range).format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#FFFFFF" },
  };
}

function setSheetBase(sheet, range = "A1:AZ6000") {
  sheet.showGridLines = false;
  sheet.getRange(range).format.font = { name: font, size: 10, color: dark };
  sheet.getRange(range).format.verticalAlignment = "center";
}

const workbook = Workbook.create();
const summarySheet = workbook.worksheets.add("Summary");
const full = workbook.worksheets.add("Full 2025 Dataset");
const parents = workbook.worksheets.add("Replaced Parents");
const audit = workbook.worksheets.add("Allocation Audit");
const evidence = workbook.worksheets.add("Product Evidence");

for (const sheet of [summarySheet, full, parents, audit, evidence]) setSheetBase(sheet);
summarySheet.tabColor = navy;
full.tabColor = "#2F75B5";
parents.tabColor = "#C9B458";
audit.tabColor = "#548235";
evidence.tabColor = "#6FA8DC";

const fullHeaders = [
  "area", "dr_number", "date_delivered", "product", "qty", "cp", "total_cp", "discount", "net_cp", "tp_unit", "total_tp", "net_income", "margin_pct",
  "source_year", "source_sheet", "source_workbook_row", "source_record_id", "parent_source_record_id", "child_sequence", "original_product_label", "replacement_type", "record_type",
  "product_group", "product_category", "classification_confidence", "classification_rule", "canonical_product_name", "provisional_sku", "sku_status", "product_exists_in_reference_workbook",
  "allocation_method", "allocation_confidence", "reference_id", "reference_year", "reference_sheet", "reference_dr_number", "reference_workbook_rows", "source_cost_missing",
  "parent_financial_anomaly", "product_assignment_verified", "record_status", "notes",
];
const fullLastColumn = columnLetter(fullHeaders.length - 1);
styleTitle(
  full,
  fullLastColumn,
  "Full MedShield 2025 dataset with medical-product allocation",
  "All contract summaries and blank product rows are replaced by estimated children whose product names occur in Sales Report.xlsx. Assignments are modeled, not recovered invoice lines.",
  "Source: Sales Report.xlsx, sheet 2025. Reference products and baskets: actual medical rows in sheets 2021–2025.",
);
full.getRangeByIndexes(5, 0, 1, fullHeaders.length).values = [fullHeaders];
await writeInChunks(full, 6, 0, payload.full_rows, fullHeaders);
const fullLastRow = 6 + payload.full_rows.length;
const fullTable = full.tables.add(`A6:${fullLastColumn}${fullLastRow}`, true, "FullMedShield2025Table");
fullTable.style = "TableStyleMedium2";
styleHeader(full, `A6:${fullLastColumn}6`);
full.getRange(`C7:C${fullLastRow}`).setNumberFormat("yyyy-mm-dd");
full.getRange(`E7:E${fullLastRow}`).setNumberFormat("#,##0.00");
full.getRange(`F7:L${fullLastRow}`).setNumberFormat('"₱"#,##0.00');
full.getRange(`M7:M${fullLastRow}`).setNumberFormat("0.00%");
full.getRange(`N7:P${fullLastRow}`).setNumberFormat("0");
full.getRange(`T7:V${fullLastRow}`).format.fill = blue;
full.getRange(`AE7:AF${fullLastRow}`).format.fill = amber;
full.getRange(`AL7:AN${fullLastRow}`).format.fill = red;
full.freezePanes.freezeRows(6);
full.freezePanes.freezeColumns(4);

const totalRow = fullLastRow + 2;
full.getRange(`A${totalRow}:D${totalRow}`).values = [["GRAND TOTAL — FULL 2025 OUTPUT"]];
full.mergeCells(`A${totalRow}:D${totalRow}`);
full.getRange(`E${totalRow}`).formulas = [[`=ROUND(SUM(E7:E${fullLastRow}),2)`]];
full.getRange(`G${totalRow}:I${totalRow}`).formulas = [[
  `=ROUND(SUM(G7:G${fullLastRow}),2)`,
  `=ROUND(SUM(H7:H${fullLastRow}),2)`,
  `=ROUND(SUM(I7:I${fullLastRow}),2)`,
]];
full.getRange(`K${totalRow}:L${totalRow}`).formulas = [[
  `=ROUND(SUM(K7:K${fullLastRow}),2)`,
  `=ROUND(SUM(L7:L${fullLastRow}),2)`,
]];
full.getRange(`M${totalRow}`).formulas = [[`=IF(I${totalRow}=0,"n.a.",L${totalRow}/I${totalRow})`]];
full.getRange(`A${totalRow}:${fullLastColumn}${totalRow}`).format = {
  fill: navy,
  font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
  borders: { preset: "outside", style: "medium", color: navy },
};
full.getRange(`E${totalRow}`).setNumberFormat("#,##0.00");
full.getRange(`G${totalRow}:L${totalRow}`).setNumberFormat('"₱"#,##0.00');
full.getRange(`M${totalRow}`).setNumberFormat("0.00%");
full.getRange(`${totalRow}:${totalRow}`).format.rowHeight = 32;
full.getRange(`A${totalRow + 1}:${fullLastColumn}${totalRow + 1}`).values = [["Summary row only. It is outside FullMedShield2025Table and must not be ingested as a transaction."]];
full.mergeCells(`A${totalRow + 1}:${fullLastColumn}${totalRow + 1}`);
full.getRange(`A${totalRow + 1}`).format = { fill: amber, font: { name: font, size: 9, italic: true, color: "#7F6000" } };

const parentHeaders = [...fullHeaders, "replacement_child_count"];
const parentLastColumn = columnLetter(parentHeaders.length - 1);
styleTitle(
  parents,
  parentLastColumn,
  "Original 2025 rows replaced by medical-product allocations",
  "These source rows remain here for lineage. They are excluded from Full 2025 Dataset to prevent parent-and-child double counting.",
  "Replacement scope includes Pagbilao, QMC, PESO, other contract/account summaries, and blank or invalid product rows.",
);
parents.getRangeByIndexes(5, 0, 1, parentHeaders.length).values = [parentHeaders];
await writeInChunks(parents, 6, 0, payload.parent_rows, parentHeaders);
const parentLastRow = 6 + payload.parent_rows.length;
const parentTable = parents.tables.add(`A6:${parentLastColumn}${parentLastRow}`, true, "ReplacedParentTable");
parentTable.style = "TableStyleMedium2";
styleHeader(parents, `A6:${parentLastColumn}6`);
parents.getRange(`C7:C${parentLastRow}`).setNumberFormat("yyyy-mm-dd");
parents.getRange(`E7:E${parentLastRow}`).setNumberFormat("#,##0.00");
parents.getRange(`F7:L${parentLastRow}`).setNumberFormat('"₱"#,##0.00');
parents.getRange(`M7:M${parentLastRow}`).setNumberFormat("0.00%");
parents.getRange(`AL7:AN${parentLastRow}`).format.fill = red;
parents.freezePanes.freezeRows(6);
parents.freezePanes.freezeColumns(4);

const auditHeaders = [
  "parent_source_record_id", "source_workbook_row", "area", "dr_number", "date_delivered", "original_product_label", "replacement_type", "parent_qty",
  "parent_total_cp", "parent_discount", "parent_net_sales", "parent_acquisition_cost", "parent_gross_profit", "child_count", "child_total_cp", "child_discount",
  "child_net_sales", "child_acquisition_cost", "child_gross_profit", "total_cp_delta", "discount_delta", "net_delta", "cost_delta", "gross_delta",
  "source_gross_vs_net_less_cost_delta", "reconciliation_status", "allocation_method", "allocation_confidence", "reference_id", "reference_year", "reference_dr_number",
  "match_score", "source_cost_missing", "parent_financial_anomaly", "product_assignment_verified",
];
const auditLastColumn = columnLetter(auditHeaders.length - 1);
styleTitle(
  audit,
  auditLastColumn,
  "Parent-to-child allocation audit",
  "Every replaced parent reconciles to its children for Total CP, discount, net sales, acquisition cost, and gross profit.",
  "Review low-confidence rows, missing source costs, and negative-margin parents before operational use.",
);
audit.getRangeByIndexes(5, 0, 1, auditHeaders.length).values = [auditHeaders];
await writeInChunks(audit, 6, 0, payload.audit_rows, auditHeaders);
const auditLastRow = 6 + payload.audit_rows.length;
const auditTable = audit.tables.add(`A6:${auditLastColumn}${auditLastRow}`, true, "AllContractAllocationAuditTable");
auditTable.style = "TableStyleMedium4";
styleHeader(audit, `A6:${auditLastColumn}6`);
audit.getRange(`E7:E${auditLastRow}`).setNumberFormat("yyyy-mm-dd");
audit.getRange(`H7:H${auditLastRow}`).setNumberFormat("#,##0.00");
audit.getRange(`I7:M${auditLastRow}`).setNumberFormat('"₱"#,##0.00');
audit.getRange(`O7:Y${auditLastRow}`).setNumberFormat('"₱"#,##0.00');
audit.getRange(`AF7:AF${auditLastRow}`).setNumberFormat("0.000000");
audit.getRange(`Z7:Z${auditLastRow}`).conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });
audit.getRange(`AB7:AB${auditLastRow}`).conditionalFormats.add("containsText", { text: "low", format: { fill: amber, font: { bold: true, color: "#7F6000" } } });
audit.getRange(`AG7:AI${auditLastRow}`).format.fill = red;
audit.freezePanes.freezeRows(6);
audit.freezePanes.freezeColumns(6);

const evidenceHeaders = [
  "product", "canonical_product_name", "provisional_sku", "sku_status", "product_group", "product_category", "classification_confidence", "classification_rule",
  "allocation_count", "parent_types", "reference_ids", "reference_years", "reference_dr_numbers", "reference_workbook_rows",
];
const evidenceLastColumn = columnLetter(evidenceHeaders.length - 1);
styleTitle(
  evidence,
  evidenceLastColumn,
  "Medical products used in estimated allocations",
  "Every product below is observed as an actual product row in Sales Report.xlsx. Its assignment to a replaced 2025 parent remains estimated.",
  "The source workbook has no vendor SKU field. provisional_sku is a stable reference key derived from the normalized product name.",
);
evidence.getRangeByIndexes(5, 0, 1, evidenceHeaders.length).values = [evidenceHeaders];
await writeInChunks(evidence, 6, 0, payload.evidence_rows, evidenceHeaders);
const evidenceLastRow = 6 + payload.evidence_rows.length;
const evidenceTable = evidence.tables.add(`A6:${evidenceLastColumn}${evidenceLastRow}`, true, "AllocatedProductEvidenceTable");
evidenceTable.style = "TableStyleMedium2";
styleHeader(evidence, `A6:${evidenceLastColumn}6`);
evidence.freezePanes.freezeRows(6);
evidence.freezePanes.freezeColumns(3);

styleTitle(
  summarySheet,
  "I",
  "Full MedShield 2025 medical-product allocation summary",
  "Financial totals are preserved exactly. Product assignments for replaced rows are estimates based on actual product history in the supplied workbook.",
  "Source: Sales Report.xlsx. Output covers the 2025 sheet and uses medical evidence from sheets 2021–2025.",
);

summarySheet.getRange("A7:E7").values = [["financial_metric", "source_2025", "allocation_output", "delta", "status"]];
summarySheet.getRange("A8:A12").values = [["Total CP"], ["Discount"], ["Net sales"], ["Acquisition cost"], ["Gross profit"]];
summarySheet.getRange("B8:B12").values = [
  [summary.source_totals.total_cp],
  [summary.source_totals.discount],
  [summary.source_totals.net_cp],
  [summary.source_totals.total_tp],
  [summary.source_totals.net_income],
];
summarySheet.getRange("C8:C12").formulas = [
  [`=ROUND(SUM('Full 2025 Dataset'!G7:G${fullLastRow}),2)`],
  [`=ROUND(SUM('Full 2025 Dataset'!H7:H${fullLastRow}),2)`],
  [`=ROUND(SUM('Full 2025 Dataset'!I7:I${fullLastRow}),2)`],
  [`=ROUND(SUM('Full 2025 Dataset'!K7:K${fullLastRow}),2)`],
  [`=ROUND(SUM('Full 2025 Dataset'!L7:L${fullLastRow}),2)`],
];
summarySheet.getRange("D8:D12").formulas = [["=ROUND(C8-B8,2)"], ["=ROUND(C9-B9,2)"], ["=ROUND(C10-B10,2)"], ["=ROUND(C11-B11,2)"], ["=ROUND(C12-B12,2)"]];
summarySheet.getRange("E8:E12").formulas = [
  ['=IF(ABS(D8)<=0.01,"PASS","FAIL")'],
  ['=IF(ABS(D9)<=0.01,"PASS","FAIL")'],
  ['=IF(ABS(D10)<=0.01,"PASS","FAIL")'],
  ['=IF(ABS(D11)<=0.01,"PASS","FAIL")'],
  ['=IF(ABS(D12)<=0.01,"PASS","FAIL")'],
];
styleHeader(summarySheet, "A7:E7");
summarySheet.getRange("B8:D12").setNumberFormat('"₱"#,##0.00');
summarySheet.getRange("E8:E12").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });

summarySheet.getRange("A15:B15").values = [["coverage_metric", "value"]];
summarySheet.getRange("A16:B25").values = [
  ["Original 2025 transaction rows", summary.source_transaction_rows],
  ["Unchanged source product rows", summary.unchanged_product_rows],
  ["Source parents replaced", summary.parent_rows_replaced],
  ["Estimated medical-product child rows", summary.estimated_medical_child_rows],
  ["Full output rows", summary.full_output_rows],
  ["Unique allocated medical products", summary.unique_allocated_medical_products],
  ["Actual medical reference lines", summary.reference_medical_lines],
  ["Actual medical reference baskets", summary.reference_medical_baskets],
  ["Blank products remaining in output", summary.blank_output_products],
  ["Non-product rows remaining in output", summary.non_product_output_rows],
];
styleHeader(summarySheet, "A15:B15");
summarySheet.getRange("B16:B25").setNumberFormat("#,##0");

summarySheet.getRange("D15:E15").values = [["replacement_type", "parent_rows"]];
summarySheet.getRange("D16:E20").values = [
  ["Pagbilao contract", summary.replacement_counts.pagbilao_contract || 0],
  ["QMC contract", summary.replacement_counts.qmc_contract || 0],
  ["PESO contract", summary.replacement_counts.peso_contract || 0],
  ["Other contract or account summary", summary.replacement_counts.other_non_product || 0],
  ["Blank or invalid product", summary.replacement_counts.blank_or_invalid_product || 0],
];
styleHeader(summarySheet, "D15:E15");
summarySheet.getRange("E16:E20").setNumberFormat("#,##0");

summarySheet.getRange("G15:I15").values = [["quality_metric", "value", "meaning"]];
summarySheet.getRange("G16:I19").values = [
  ["Parent reconciliation failures", summary.parent_reconciliation_failures, "Must remain zero"],
  ["Low-confidence parent allocations", summary.low_confidence_allocations, "Review before product-level decisions"],
  ["Parents with missing source cost", summary.source_cost_missing_parents, "Cost remains zero to preserve source totals"],
  ["Negative-margin parents", summary.negative_margin_parents, "Source economics preserved"],
];
styleHeader(summarySheet, "G15:I15");
summarySheet.getRange("H16:H19").setNumberFormat("#,##0");
summarySheet.getRange("G17:I19").format.fill = amber;

summarySheet.getRange("A28:C28").values = [["quantity_metric", "quantity", "interpretation"]];
summarySheet.getRange("A29:C30").values = [
  ["Original source quantity", summary.source_quantity, "Contract summaries usually carry quantity 1"],
  ["Allocated output quantity", summary.output_quantity, "Estimated units from the matched medical products"],
];
styleHeader(summarySheet, "A28:C28");
summarySheet.getRange("B29:B30").setNumberFormat("#,##0.00");

summarySheet.getRange("A33:B33").values = [["method_step", "implementation"]];
summarySheet.getRange("A34:B40").values = [
  ["1. Preserve original evidence", "Keep all 330 replaced source rows on Replaced Parents with their source workbook row."],
  ["2. Restrict eligible products", "Allocate only medicine, medical device, or medical supply names observed in Sales Report.xlsx."],
  ["3. Match contract summaries", "Use the nearest same-channel medical basket based on value, cost ratio, recency, and product count."],
  ["4. Match blank products", "Use a same-delivery medical line when available; otherwise match by area, unit price, quantity, and recency."],
  ["5. Preserve financial totals", "Reconcile Total CP, discount, net sales, acquisition cost, and gross profit to every parent."],
  ["6. Identify products", "Use the observed product name and a deterministic provisional SKU because the source has no vendor SKU field."],
  ["7. Keep uncertainty visible", "Mark every generated child as estimated and retain confidence, reference rows, and source-quality flags."],
];
summarySheet.mergeCells("B33:I33");
for (let row = 34; row <= 40; row += 1) summarySheet.mergeCells(`B${row}:I${row}`);
styleHeader(summarySheet, "A33:I33");

summarySheet.getRange("A43:I43").values = [["Use Full 2025 Dataset for analysis with modeled product allocations. Confirm assignments against invoices, delivery receipts, purchase orders, or contract schedules before treating them as recovered actual line items."]];
summarySheet.mergeCells("A43:I43");
summarySheet.getRange("A43:I43").format = { fill: amber, font: { name: font, size: 10, bold: true, color: "#7F6000" }, wrapText: true };
summarySheet.getRange("43:43").format.rowHeight = 44;

// Readable widths for long analytical tables.
summarySheet.getRange("A:A").format.columnWidth = 38;
summarySheet.getRange("B:C").format.columnWidth = 29;
summarySheet.getRange("D:D").format.columnWidth = 34;
summarySheet.getRange("E:E").format.columnWidth = 16;
summarySheet.getRange("F:F").format.columnWidth = 4;
summarySheet.getRange("G:G").format.columnWidth = 32;
summarySheet.getRange("H:H").format.columnWidth = 16;
summarySheet.getRange("I:I").format.columnWidth = 42;
summarySheet.getRange("B34:I40").format.wrapText = true;
summarySheet.getRange("34:40").format.rowHeight = 30;

full.getRange("A:A").format.columnWidth = 16;
full.getRange("B:B").format.columnWidth = 20;
full.getRange("C:C").format.columnWidth = 14;
full.getRange("D:D").format.columnWidth = 44;
full.getRange("E:M").format.columnWidth = 17;
full.getRange("N:S").format.columnWidth = 22;
full.getRange("T:V").format.columnWidth = 30;
full.getRange("W:AC").format.columnWidth = 26;
full.getRange("AD:AK").format.columnWidth = 24;
full.getRange("AL:AP").format.columnWidth = 26;
full.getRange(`6:${Math.min(fullLastRow, 100)}`).format.rowHeight = 30;

parents.getRange("A:D").format.columnWidth = 22;
parents.getRange("E:M").format.columnWidth = 17;
parents.getRange("N:AQ").format.columnWidth = 25;
parents.getRange("D:D").format.columnWidth = 42;
parents.getRange(`6:${parentLastRow}`).format.rowHeight = 30;

audit.getRange("A:G").format.columnWidth = 26;
audit.getRange("H:Y").format.columnWidth = 20;
audit.getRange("Z:AI").format.columnWidth = 24;
audit.getRange(`6:${auditLastRow}`).format.rowHeight = 30;

evidence.getRange("A:B").format.columnWidth = 45;
evidence.getRange("C:H").format.columnWidth = 27;
evidence.getRange("I:I").format.columnWidth = 18;
evidence.getRange("J:N").format.columnWidth = 48;
evidence.getRange(`6:${evidenceLastRow}`).format.rowHeight = 30;

workbook.recalculate();

const summaryCheck = await workbook.inspect({
  kind: "table",
  range: "Summary!A7:I30",
  include: "values,formulas",
  tableMaxRows: 30,
  tableMaxCols: 12,
});
console.log(summaryCheck.ndjson);
const auditCheck = await workbook.inspect({
  kind: "table",
  range: "Allocation Audit!A6:Z20",
  include: "values",
  tableMaxRows: 20,
  tableMaxCols: 28,
});
console.log(auditCheck.ndjson);
const errorCheck = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errorCheck.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range, fileName] of [
  ["Summary", "A1:I43", "summary.png"],
  ["Full 2025 Dataset", `A1:${fullLastColumn}30`, "full_2025_top.png"],
  ["Full 2025 Dataset", `A${fullLastRow - 3}:M${totalRow + 1}`, "full_2025_total.png"],
  ["Replaced Parents", `A1:${parentLastColumn}25`, "replaced_parents.png"],
  ["Allocation Audit", `A1:${auditLastColumn}25`, "allocation_audit.png"],
  ["Product Evidence", `A1:${evidenceLastColumn}25`, "product_evidence.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${fileName}`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

const saved = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const savedCheck = await saved.inspect({
  kind: "table",
  range: "Summary!A7:E12",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(savedCheck.ndjson);
console.log(JSON.stringify({ outputPath, previewDir, fullLastRow, totalRow, parentLastRow, auditLastRow, evidenceLastRow }));
