import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const stagingPath = "C:/Users/Adrian/projects/medshield1/medshield/tmp/pagbilao_sample_workbook/full_2025_staging.json";
const outputDir = "C:/Users/Adrian/projects/medshield1/medshield/outputs/pagbilao_medical_allocation_2025";
const outputPath = `${outputDir}/medshield_2025_with_pagbilao_medical_allocation.xlsx`;
const previewDir = "C:/Users/Adrian/projects/medshield1/medshield/tmp/pagbilao_sample_workbook/previews_full_2025";
const payload = JSON.parse(await fs.readFile(stagingPath, "utf8"));
const summary = payload.summary;

const font = "Arial";
const navy = "#17365D";
const blue = "#D9EAF7";
const amber = "#FFF2CC";
const red = "#FCE8E6";
const green = "#E2F0D9";
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

function valuesFor(rows, headers) {
  return rows.map((row) => headers.map((header) => row[header] ?? ""));
}

async function writeInChunks(sheet, startRowIndex, startColumnIndex, rows, headers, chunkSize = 400) {
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    sheet.getRangeByIndexes(startRowIndex + offset, startColumnIndex, chunk.length, headers.length).values = valuesFor(chunk, headers);
  }
}

function styleTitle(sheet, lastColumn, title, subtitle, sourceLine) {
  sheet.getRange(`A2:${lastColumn}2`).values = [[title]];
  sheet.getRange(`A3:${lastColumn}3`).values = [[subtitle]];
  sheet.getRange(`A4:${lastColumn}4`).values = [[sourceLine]];
  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.mergeCells(`A3:${lastColumn}3`);
  sheet.mergeCells(`A4:${lastColumn}4`);
  sheet.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
  sheet.getRange("A3").format.font = { name: font, size: 10, bold: true, color: "#9C0006" };
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

const workbook = Workbook.create();
const full = workbook.worksheets.add("Full 2025 Dataset");
const parents = workbook.worksheets.add("Pagbilao Parents");
const audit = workbook.worksheets.add("Allocation Audit");
const evidence = workbook.worksheets.add("Product Evidence");
const method = workbook.worksheets.add("Method and Summary");

for (const sheet of [full, parents, audit, evidence, method]) {
  sheet.showGridLines = false;
  sheet.getRange("A1:AJ5000").format.font = { name: font, size: 10, color: dark };
  sheet.getRange("A1:AJ5000").format.verticalAlignment = "center";
}
full.tabColor = navy;
parents.tabColor = "#C9B458";
audit.tabColor = "#548235";
evidence.tabColor = "#6FA8DC";
method.tabColor = "#7030A0";

const fullHeaders = [
  "area", "dr_number", "date_delivered", "product", "qty", "cp", "total_cp", "discount", "net_cp", "tp_unit", "total_tp", "net_income", "margin_pct",
  "source_year", "source_csv_line", "source_record_id", "parent_source_record_id", "original_product_label", "record_type", "product_group", "product_category",
  "classification_confidence", "product_exists_in_dataset", "allocation_method", "allocation_confidence", "reference_basket_id", "reference_year", "reference_dr_number",
  "reference_source_lines", "parent_financial_anomaly", "pagbilao_line_verified", "canonical_sku", "sku_mapping_status", "record_status", "notes",
];
const fullLastColumn = columnLetter(fullHeaders.length - 1);
styleTitle(
  full,
  fullLastColumn,
  "Full MedShield 2025 dataset with Pagbilao medical-product allocation",
  "All 136 PAGBILAO # summary rows are replaced in this sheet by estimated child lines using actual historical Government medical transaction baskets. Parent rows are retained separately for lineage.",
  "Source: data/medshield/dataset_csv/medshield_data_2025.csv; reference baskets: Government medical rows from 2022–2024.",
);
full.getRangeByIndexes(5, 0, 1, fullHeaders.length).values = [fullHeaders];
await writeInChunks(full, 6, 0, payload.full_rows, fullHeaders);
const fullLastRow = 6 + payload.full_rows.length;
const fullTable = full.tables.add(`A6:${fullLastColumn}${fullLastRow}`, true, "Full2025AllocationTable");
fullTable.style = "TableStyleMedium2";
styleHeader(full, `A6:${fullLastColumn}6`);
full.getRange(`E7:E${fullLastRow}`).format.numberFormat = "#,##0.00";
full.getRange(`F7:L${fullLastRow}`).format.numberFormat = "₱#,##0.00";
full.getRange(`M7:M${fullLastRow}`).format.numberFormat = "0.00%";
full.getRange(`N7:O${fullLastRow}`).format.numberFormat = "0";
full.getRange(`AF7:AG${fullLastRow}`).format.fill = amber;
full.getRange(`AD7:AE${fullLastRow}`).format.fill = red;
full.freezePanes.freezeRows(6);
full.freezePanes.freezeColumns(4);

const parentHeaders = [...fullHeaders, "replacement_child_count"];
const parentLastColumn = columnLetter(parentHeaders.length - 1);
styleTitle(
  parents,
  parentLastColumn,
  "Original 2025 Pagbilao parent rows",
  "These 136 source rows are preserved for audit and are excluded from the Full 2025 Dataset sheet to prevent parent-and-child double counting.",
  "Each parent links to its estimated medical children through source_record_id and parent_source_record_id.",
);
parents.getRangeByIndexes(5, 0, 1, parentHeaders.length).values = [parentHeaders];
await writeInChunks(parents, 6, 0, payload.parent_rows, parentHeaders);
const parentLastRow = 6 + payload.parent_rows.length;
const parentTable = parents.tables.add(`A6:${parentLastColumn}${parentLastRow}`, true, "PagbilaoParentTable");
parentTable.style = "TableStyleMedium2";
styleHeader(parents, `A6:${parentLastColumn}6`);
parents.getRange(`E7:E${parentLastRow}`).format.numberFormat = "#,##0.00";
parents.getRange(`F7:L${parentLastRow}`).format.numberFormat = "₱#,##0.00";
parents.getRange(`M7:M${parentLastRow}`).format.numberFormat = "0.00%";
parents.getRange(`AD7:AE${parentLastRow}`).format.fill = red;
parents.freezePanes.freezeRows(6);
parents.freezePanes.freezeColumns(4);

const auditHeaders = [
  "parent_source_record_id", "source_csv_line", "dr_number", "date_delivered", "original_product_label", "parent_net_sales", "parent_acquisition_cost", "parent_gross_profit",
  "child_count", "child_net_sales", "child_acquisition_cost", "child_gross_profit", "net_delta", "cost_delta", "gross_delta", "reconciliation_status",
  "reference_basket_id", "reference_year", "reference_dr_number", "reference_product_count", "reference_net_sales", "reference_cost_ratio", "parent_cost_ratio",
  "net_scale_factor", "cost_scale_factor", "unit_cost_adjustment_factor", "match_score", "allocation_confidence", "parent_financial_anomaly",
];
const auditLastColumn = columnLetter(auditHeaders.length - 1);
styleTitle(
  audit,
  auditLastColumn,
  "Pagbilao parent-to-child allocation audit",
  "Every parent must reconcile to its children. Low-confidence rows are caused by anomalous source economics or a weak historical-basket match, not by reconciliation failure.",
  "Review parent_financial_anomaly, match_score, and unit_cost_adjustment_factor before using an estimate operationally.",
);
audit.getRangeByIndexes(5, 0, 1, auditHeaders.length).values = [auditHeaders];
await writeInChunks(audit, 6, 0, payload.audit_rows, auditHeaders);
const auditLastRow = 6 + payload.audit_rows.length;
const auditTable = audit.tables.add(`A6:${auditLastColumn}${auditLastRow}`, true, "AllocationAuditTable");
auditTable.style = "TableStyleMedium4";
styleHeader(audit, `A6:${auditLastColumn}6`);
audit.getRange(`F7:H${auditLastRow}`).format.numberFormat = "₱#,##0.00";
audit.getRange(`J7:O${auditLastRow}`).format.numberFormat = "₱#,##0.00";
audit.getRange(`U7:U${auditLastRow}`).format.numberFormat = "₱#,##0.00";
audit.getRange(`V7:W${auditLastRow}`).format.numberFormat = "0.0000%";
audit.getRange(`X7:AA${auditLastRow}`).format.numberFormat = "0.000000";
audit.getRange(`P7:P${auditLastRow}`).conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#006100" } } });
audit.getRange(`P7:P${auditLastRow}`).conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });
audit.getRange(`AC7:AC${auditLastRow}`).format.fill = red;
audit.freezePanes.freezeRows(6);
audit.freezePanes.freezeColumns(5);

const evidenceHeaders = [
  "product", "product_group", "product_category", "classification_confidence", "classification_rule", "allocation_count",
  "reference_basket_ids", "reference_years", "reference_dr_numbers", "source_lines",
];
const evidenceLastColumn = columnLetter(evidenceHeaders.length - 1);
styleTitle(
  evidence,
  evidenceLastColumn,
  "Evidence for allocated medical-product identities",
  "Every product below occurs in an actual 2022–2024 MedShield Government transaction used as a reference basket.",
  "Product identity evidence does not verify that Pagbilao purchased the product; the allocation remains estimated.",
);
evidence.getRangeByIndexes(5, 0, 1, evidenceHeaders.length).values = [evidenceHeaders];
await writeInChunks(evidence, 6, 0, payload.evidence_rows, evidenceHeaders);
const evidenceLastRow = 6 + payload.evidence_rows.length;
const evidenceTable = evidence.tables.add(`A6:${evidenceLastColumn}${evidenceLastRow}`, true, "ProductEvidenceTable");
evidenceTable.style = "TableStyleMedium2";
styleHeader(evidence, `A6:${evidenceLastColumn}6`);
evidence.freezePanes.freezeRows(6);
evidence.freezePanes.freezeColumns(2);

styleTitle(
  method,
  "H",
  "Method, coverage, and financial reconciliation",
  "This workbook is an offline derived dataset. It has not been loaded into the application, Databricks, or GitHub.",
  "The original Pagbilao parent rows remain estimates until itemized delivery receipts, invoices, purchase orders, or contract schedules are recovered.",
);
method.getRange("A6:E6").values = [["financial_metric", "source_2025", "full_output", "delta", "status"]];
method.getRange("A7:A9").values = [["Net sales"], ["Acquisition cost"], ["Gross profit"]];
method.getRange("B7:B9").values = [[summary.source_net_sales], [summary.source_acquisition_cost], [summary.source_gross_profit]];
method.getRange("C7:C9").formulas = [[`=ROUND(SUM('Full 2025 Dataset'!I7:I${fullLastRow}),2)`], [`=ROUND(SUM('Full 2025 Dataset'!K7:K${fullLastRow}),2)`], [`=ROUND(SUM('Full 2025 Dataset'!L7:L${fullLastRow}),2)`]];
method.getRange("D7:D9").formulas = [["=ROUND(C7-B7,2)"], ["=ROUND(C8-B8,2)"], ["=ROUND(C9-B9,2)"]];
method.getRange("E7:E9").formulas = [["=IF(ABS(D7)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D8)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D9)<=0.01,\"PASS\",\"FAIL\")"]];
styleHeader(method, "A6:E6");
method.getRange("B7:D9").format.numberFormat = "₱#,##0.00";
method.getRange("E7:E9").conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#006100" } } });
method.getRange("E7:E9").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });

method.getRange("A12:B12").values = [["coverage_metric", "value"]];
styleHeader(method, "A12:B12");
method.getRange("A13:B23").values = [
  ["Original 2025 transaction rows", summary.source_transaction_rows],
  ["Unchanged non-Pagbilao rows", summary.non_pagbilao_original_rows],
  ["Pagbilao parent rows replaced", summary.pagbilao_parent_rows_replaced],
  ["Estimated Pagbilao medical child rows", summary.estimated_pagbilao_child_rows],
  ["Full output rows", summary.full_output_rows],
  ["Unique allocated medical products", summary.unique_allocated_medical_products],
  ["Reference Government medical baskets", summary.reference_basket_count],
  ["Parent reconciliation failures", summary.parent_reconciliation_failures],
  ["Negative-margin Pagbilao parents", summary.negative_margin_pagbilao_parents],
  ["Low-confidence parent allocations", summary.low_confidence_allocations],
  ["Product groups used", "medicine, medical_device, medical_supply"],
];

method.getRange("A26:B26").values = [["method_step", "implementation"]];
styleHeader(method, "A26:B26");
method.getRange("A27:B33").values = [
  ["1. Preserve source", "Keep all non-Pagbilao 2025 transactions and store all 136 removed parents on Pagbilao Parents."],
  ["2. Restrict eligible products", "Use only medicine, medical_device, or medical_supply identities observed in Government transactions."],
  ["3. Build actual baskets", "Group 2022–2024 Government medical lines by their real DR and delivery date."],
  ["4. Match each parent", "Choose the closest basket by parent value, acquisition-cost ratio, recency, and suitable product count."],
  ["5. Scale the basket", "Scale reference quantities and line values to the parent; adjust rounding on the largest line."],
  ["6. Reconcile", "Require child net sales, acquisition cost, and gross profit to equal the original parent to the cent."],
  ["7. Flag uncertainty", "Mark every child unverified; mark negative-margin or weak-match allocations low confidence."],
];
method.getRange("A36:B36").values = [["Decision rule", "Use the Full 2025 Dataset for offline analysis only. Product names are real; Pagbilao assignments remain modeled until itemized source documents are recovered."]];
method.mergeCells("B36:H36");
method.getRange("A36:H36").format = { fill: amber, font: { name: font, size: 10, bold: true, color: "#7F6000" } };

// Readable widths. Wide data sheets are designed for filtering and horizontal scrolling.
full.getRange("A:A").format.columnWidth = 16; full.getRange("B:B").format.columnWidth = 20; full.getRange("C:C").format.columnWidth = 16; full.getRange("D:D").format.columnWidth = 44;
full.getRange("E:M").format.columnWidth = 17; full.getRange("N:Q").format.columnWidth = 22; full.getRange("R:R").format.columnWidth = 34; full.getRange("S:Y").format.columnWidth = 27;
full.getRange("Z:AC").format.columnWidth = 23; full.getRange("AD:AE").format.columnWidth = 20; full.getRange("AF:AI").format.columnWidth = 28; full.getRange(`6:${Math.min(fullLastRow, 80)}`).format.rowHeight = 32;

parents.getRange("A:D").format.columnWidth = 22; parents.getRange("E:M").format.columnWidth = 17; parents.getRange("N:AJ").format.columnWidth = 25; parents.getRange("D:D").format.columnWidth = 38; parents.getRange(`6:${parentLastRow}`).format.rowHeight = 32;
audit.getRange("A:E").format.columnWidth = 28; audit.getRange("F:O").format.columnWidth = 20; audit.getRange("P:AC").format.columnWidth = 24; audit.getRange(`6:${auditLastRow}`).format.rowHeight = 32;
evidence.getRange("A:A").format.columnWidth = 52; evidence.getRange("B:F").format.columnWidth = 25; evidence.getRange("G:J").format.columnWidth = 56; evidence.getRange(`6:${evidenceLastRow}`).format.rowHeight = 32;
method.getRange("A:A").format.columnWidth = 38; method.getRange("B:D").format.columnWidth = 28; method.getRange("E:E").format.columnWidth = 16; method.getRange("B:B").format.wrapText = true; method.getRange("13:36").format.rowHeight = 38;

workbook.recalculate();
const summaryCheck = await workbook.inspect({ kind: "table", range: "Method and Summary!A6:E23", include: "values,formulas", tableMaxRows: 30, tableMaxCols: 8 });
console.log(summaryCheck.ndjson);
const auditCheck = await workbook.inspect({ kind: "table", range: "Allocation Audit!A6:P18", include: "values", tableMaxRows: 20, tableMaxCols: 18 });
console.log(auditCheck.ndjson);
const errorCheck = await workbook.inspect({ kind: "match", searchTerm: "#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan excluding literal source #REF! product values" });
console.log(errorCheck.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [
  ["Full 2025 Dataset", `A1:${fullLastColumn}35`],
  ["Allocation Audit", `A1:${auditLastColumn}25`],
  ["Product Evidence", `A1:${evidenceLastColumn}25`],
  ["Method and Summary", "A1:H36"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName.toLowerCase().replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

const savedBlob = await FileBlob.load(outputPath);
const savedWorkbook = await SpreadsheetFile.importXlsx(savedBlob);
const savedCheck = await savedWorkbook.inspect({ kind: "table", range: "Method and Summary!A6:E9", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 8 });
console.log(savedCheck.ndjson);
console.log(JSON.stringify({ outputPath, previewDir, fullLastRow, auditLastRow, evidenceLastRow }));
