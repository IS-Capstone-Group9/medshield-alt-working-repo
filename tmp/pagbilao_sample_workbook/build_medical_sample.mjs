import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Adrian/projects/medshield1/medshield/outputs/sample_pagbilao_estimated_allocation";
const outputPath = `${outputDir}/sample_pagbilao_estimated_product_allocation.xlsx`;
const previewDir = "C:/Users/Adrian/projects/medshield1/medshield/tmp/pagbilao_sample_workbook/previews_medical";
const font = "Arial";
const navy = "#17365D";
const lightBlue = "#D9EAF7";
const amber = "#FFF2CC";
const red = "#FCE8E6";
const green = "#E2F0D9";
const dark = "#1F2937";

const parentNet = 11567580;
const parentCost = 4229349.44;
const parentGross = 7338230.56;
const historicalNet = 9778600.10;
const historicalCost = 3575263.50;

const products = [
  { name: "SITIXON 1G", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 11, firstYear: 2022, lastYear: 2023, historicalQty: 7876, historicalNet: 1885664, historicalCost: 283536, quantity: 9317, net: 2230643.34, cost: 335408.24, lines: "2022:3146; 2022:3162; 2022:3187; 2022:3369; 2022:3670; 2023:1408; 2023:1510; 2023:2130; 2023:3231; 2023:3357; 2023:3634" },
  { name: "PPE COVER ALL SET", cls: "medical_supply", category: "medical_consumable", confidence: "high", rule: "medical_supply_terms:PPE", occurrences: 2, firstYear: 2022, lastYear: 2022, historicalQty: 1180, historicalNet: 1472240, historicalCost: 247800, quantity: 1396, net: 1741584.05, cost: 293134.42, lines: "2022:3330; 2022:3345" },
  { name: "ISOLATION GOWN", cls: "medical_supply", category: "medical_consumable", confidence: "high", rule: "medical_supply_terms:ISOLATION GOWN", occurrences: 5, firstYear: 2022, lastYear: 2022, historicalQty: 1850, historicalNet: 1252808.60, historicalCost: 240500, quantity: 2188, net: 1482008.01, cost: 284498.90, lines: "2022:3214; 2022:3233; 2022:3239; 2022:3245; 2022:3450" },
  { name: "SHARJVAX 1500 I.U. / 0.7ML", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 14, firstYear: 2022, lastYear: 2023, historicalQty: 738, historicalNet: 1110130, historicalCost: 765240, quantity: 873, net: 1313226.58, cost: 905238.83, lines: "2022:3063; 2022:3112; 2022:3207; 2022:3247; 2022:3947; 2023:1079; 2023:1144; 2023:1548; 2023:2121; 2023:2981; 2023:3251; 2023:3273; 2023:3740; 2023:3834" },
  { name: "DOCOR 250MG VIAL", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 3, firstYear: 2022, lastYear: 2023, historicalQty: 778, historicalNet: 956600, historicalCost: 634920, quantity: 920, net: 1131608.50, cost: 751077.10, lines: "2022:4019; 2023:1320; 2023:2346" },
  { name: "AEROX 500mg", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 5, firstYear: 2023, lastYear: 2023, historicalQty: 3045, historicalNet: 770655, historicalCost: 289275, quantity: 3602, net: 911645.15, cost: 342197.17, lines: "2023:2139; 2023:2191; 2023:3044; 2023:3358; 2023:3759" },
  { name: "SPEEDA 2.5IU/0.5ML", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 1, firstYear: 2024, lastYear: 2024, historicalQty: 110, historicalNet: 767250, historicalCost: 522500, quantity: 130, net: 907617.21, cost: 618090.13, lines: "2024:2868" },
  { name: "DANOXIME 750MG", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 6, firstYear: 2022, lastYear: 2023, historicalQty: 3445, historicalNet: 766680, historicalCost: 105072.50, quantity: 4075, net: 906942.93, cost: 124295.26, lines: "2022:3441; 2022:3621; 2022:3905; 2022:3913; 2023:1466; 2023:1499" },
  { name: "EQUIRAB 200IU/ML (1000IU/5ML) 5ML", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 1, firstYear: 2024, lastYear: 2024, historicalQty: 100, historicalNet: 219500, historicalCost: 170000, quantity: 118, net: 259657.19, cost: 201101.10, lines: "2024:2869" },
  { name: "AHBAY-TOX 40IU/0.5ML IM", cls: "medicine", category: "pharmaceutical_medicine_candidate", confidence: "medium", rule: "dosage_strength_or_form_pattern", occurrences: 4, firstYear: 2024, lastYear: 2024, historicalQty: 249, historicalNet: 212272.50, historicalCost: 144420, quantity: 295, net: 251107.43, cost: 170841.29, lines: "2024:2727; 2024:2734; 2024:2738; 2024:2750" },
  { name: "DISPOSABLE SYRINGE 3CC - COSMED", cls: "medical_supply", category: "medical_consumable", confidence: "high", rule: "medical_supply_terms:SYRINGE|DISPOSABLE", occurrences: 3, firstYear: 2023, lastYear: 2023, historicalQty: 160, historicalNet: 162000, historicalCost: 40000, quantity: 189, net: 191637.65, cost: 47317.90, lines: "2023:1065; 2023:1279; 2023:1376" },
  { name: "IV CANNULA WITH WINGS LUER LOCK G18 1.5X38MM (CATHULA)", cls: "medical_supply", category: "medical_consumable", confidence: "high", rule: "medical_supply_terms:CANNULA", occurrences: 1, firstYear: 2024, lastYear: 2024, historicalQty: 60, historicalNet: 202800, historicalCost: 132000, quantity: 71, net: 239901.96, cost: 156149.10, lines: "2024:2944" },
];

const workbook = Workbook.create();
const allocation = workbook.worksheets.add("Medical Allocation");
const parent = workbook.worksheets.add("Original Parent");
const evidence = workbook.worksheets.add("Product Evidence");
const checks = workbook.worksheets.add("Reconciliation");

for (const sheet of [allocation, parent, evidence, checks]) {
  sheet.showGridLines = false;
  sheet.getRange("A1:AE100").format.font = { name: font, size: 10, color: dark };
  sheet.getRange("A1:AE100").format.verticalAlignment = "center";
}

allocation.tabColor = navy;
parent.tabColor = "#C9B458";
evidence.tabColor = "#6FA8DC";
checks.tabColor = "#548235";

allocation.getRange("A2:AE2").values = [["Pagbilao estimated allocation using actual MedShield medical products"]];
allocation.getRange("A3:AE3").values = [["Every allocated product name exists in the MedShield Government-channel data. The Pagbilao product composition and quantities are estimated because DR RT 0002016 has no itemized source lines."]];
allocation.getRange("A4:B6").values = [["Parent record", "SRC-2025-0234"], ["Original label", "PAGBILAO # 13,500,000"], ["DR / delivery date", "DR RT 0002016 / 2025-01-23"]];
allocation.getRange("D4:E6").values = [["Parent net sales", parentNet], ["Allocated products", products.length], ["Product identities", "Observed in source data"]];
allocation.getRange("G4:H6").values = [["Pagbilao line items verified", "No"], ["Product scope", "8 medicines + 4 medical supplies"], ["Allocation basis", "Government medical basket, 2022–2024"]];
allocation.mergeCells("A2:AE2");
allocation.mergeCells("A3:AE3");
allocation.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
allocation.getRange("A3").format.font = { name: font, size: 10, bold: true, color: "#9C0006" };
allocation.getRange("A4:A6,D4:D6,G4:G6").format.font = { name: font, size: 10, bold: true, color: navy };
allocation.getRange("E4").format.numberFormat = "₱#,##0.00";
allocation.getRange("H4").format = { fill: red, font: { name: font, size: 10, bold: true, color: "#9C0006" } };

const headers = [
  "allocation_line_id", "parent_record_id", "source_year", "source_row_number", "dr_number", "date_delivered", "customer",
  "original_product_label", "allocated_medical_product", "product_class", "product_category", "product_exists_in_dataset",
  "government_channel_evidence", "classification_confidence", "canonical_sku", "sku_mapping_status", "estimated_quantity", "quantity_unit",
  "historical_avg_unit_net", "estimated_contract_unit_net", "estimated_net_sales", "historical_avg_unit_cost", "estimated_contract_unit_cost",
  "estimated_acquisition_cost", "estimated_gross_profit", "allocation_share", "allocation_method", "pagbilao_line_verified", "record_status", "evidence_id", "notes",
];
allocation.getRange("A8:AE8").values = [headers];
for (let index = 0; index < products.length; index += 1) {
  const p = products[index];
  const row = 9 + index;
  allocation.getRange(`A${row}:R${row}`).values = [[
    `EST-MED-SRC-2025-0234-${String(index + 1).padStart(2, "0")}`, "SRC-2025-0234", 2025, 234, "DR RT 0002016",
    new Date("2025-01-23T00:00:00"), "Pagbilao", "PAGBILAO # 13,500,000", p.name, p.cls, p.category, true, true,
    p.confidence, "", "needs_product_master_review", p.quantity, "units",
  ]];
  allocation.getRange(`S${row}`).values = [[Math.round((p.historicalNet / p.historicalQty) * 100) / 100]];
  allocation.getRange(`T${row}`).formulas = [[`=ROUND(U${row}/Q${row},2)`]];
  allocation.getRange(`U${row}`).values = [[p.net]];
  allocation.getRange(`V${row}`).values = [[Math.round((p.historicalCost / p.historicalQty) * 100) / 100]];
  allocation.getRange(`W${row}`).formulas = [[`=ROUND(X${row}/Q${row},2)`]];
  allocation.getRange(`X${row}`).values = [[p.cost]];
  allocation.getRange(`Y${row}`).formulas = [[`=ROUND(U${row}-X${row},2)`]];
  allocation.getRange(`Z${row}`).formulas = [[`=U${row}/'Original Parent'!$K$8`]];
  allocation.getRange(`AA${row}:AE${row}`).values = [[
    "scaled_government_medical_basket_2022_2024", false, "estimated_pagbilao_medical_allocation", `EVID-${String(index + 1).padStart(2, "0")}`,
    "Exact historical MedShield product identity; Pagbilao assignment is an estimate.",
  ]];
}
const finalRow = 8 + products.length;
const allocationTable = allocation.tables.add(`A8:AE${finalRow}`, true, "MedicalAllocationTable");
allocationTable.style = "TableStyleMedium2";
allocation.getRange(`F9:F${finalRow}`).format.numberFormat = "yyyy-mm-dd";
allocation.getRange(`Q9:Q${finalRow}`).format.numberFormat = "#,##0";
allocation.getRange(`S9:Y${finalRow}`).format.numberFormat = "₱#,##0.00";
allocation.getRange(`Z9:Z${finalRow}`).format.numberFormat = "0.00%";
allocation.getRange(`O9:P${finalRow}`).format.fill = amber;
allocation.getRange(`AB9:AC${finalRow}`).format.fill = red;
allocation.freezePanes.freezeRows(8);
allocation.freezePanes.freezeColumns(4);

parent.getRange("A2:N2").values = [["Original Pagbilao parent row"]];
parent.getRange("A3:N3").values = [["The source row is retained unchanged. The ₱13.5 million embedded label is a reference amount; financial reconciliation uses Net CP, Total TP, and gross profit."]];
parent.getRange("A4:N4").values = [["Source: data/medshield/dataset_csv/medshield_data_2025.csv, source CSV line 234"]];
parent.mergeCells("A2:N2"); parent.mergeCells("A3:N3"); parent.mergeCells("A4:N4");
parent.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
parent.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
parent.getRange("A4").format.font = { name: font, size: 9, italic: true, color: "#666666" };
const parentHeaders = ["parent_record_id", "source_file", "source_year", "source_row_number", "area", "dr_number", "date_delivered", "original_product_label", "source_quantity", "embedded_label_amount", "parent_net_sales", "parent_acquisition_cost", "parent_gross_profit", "source_record_status"];
parent.getRange("A7:N7").values = [parentHeaders];
parent.getRange("A8:N8").values = [["SRC-2025-0234", "data/medshield/dataset_csv/medshield_data_2025.csv", 2025, 234, "Government", "DR RT 0002016", new Date("2025-01-23T00:00:00"), "PAGBILAO # 13,500,000", 1, 13500000, parentNet, parentCost, parentGross, "original_parent_preserved"]];
const parentTable = parent.tables.add("A7:N8", true, "OriginalParentTable"); parentTable.style = "TableStyleMedium2";
parent.getRange("G8").format.numberFormat = "yyyy-mm-dd";
parent.getRange("I8").format.numberFormat = "#,##0";
parent.getRange("J8:M8").format.numberFormat = "₱#,##0.00";
parent.freezePanes.freezeRows(7);

evidence.getRange("A2:O2").values = [["Evidence that every allocated product exists in MedShield Government sales"]];
evidence.getRange("A3:O3").values = [["The evidence supports the product identities and price basis. It does not prove that Pagbilao purchased these exact items."]];
evidence.getRange("A4:O4").values = [["Sources: medshield_data_2022.csv, medshield_data_2023.csv, medshield_data_2024.csv, and product_classification_candidates.csv"]];
evidence.mergeCells("A2:O2"); evidence.mergeCells("A3:O3"); evidence.mergeCells("A4:O4");
evidence.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
evidence.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
evidence.getRange("A4").format.font = { name: font, size: 9, italic: true, color: "#666666" };
const evidenceHeaders = ["evidence_id", "source_product_name", "product_class", "product_category", "government_occurrences", "first_year", "last_year", "observed_quantity", "observed_net_sales", "observed_acquisition_cost", "historical_avg_unit_net", "historical_avg_unit_cost", "classification_confidence", "classification_rule", "exact_source_csv_lines"];
evidence.getRange("A7:O7").values = [evidenceHeaders];
for (let index = 0; index < products.length; index += 1) {
  const p = products[index]; const row = 8 + index;
  evidence.getRange(`A${row}:O${row}`).values = [[`EVID-${String(index + 1).padStart(2, "0")}`, p.name, p.cls, p.category, p.occurrences, p.firstYear, p.lastYear, p.historicalQty, p.historicalNet, p.historicalCost, Math.round((p.historicalNet / p.historicalQty) * 100) / 100, Math.round((p.historicalCost / p.historicalQty) * 100) / 100, p.confidence, p.rule, p.lines]];
}
const evidenceTable = evidence.tables.add(`A7:O${7 + products.length}`, true, "ProductEvidenceTable"); evidenceTable.style = "TableStyleMedium2";
evidence.getRange(`H8:H${7 + products.length}`).format.numberFormat = "#,##0.00";
evidence.getRange(`I8:L${7 + products.length}`).format.numberFormat = "₱#,##0.00";
evidence.freezePanes.freezeRows(7);

checks.getRange("A2:F2").values = [["Reconciliation and allocation method"]];
checks.getRange("A3:F3").values = [["The selected 12-product Government medical basket has a historical cost ratio almost identical to the Pagbilao parent, so only proportional scaling is required."]];
checks.mergeCells("A2:F2"); checks.mergeCells("A3:F3");
checks.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
checks.getRange("A3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
checks.getRange("A6:E6").values = [["metric", "parent_value", "estimated_children", "delta", "status"]];
checks.getRange("A7:A9").values = [["Net sales"], ["Acquisition cost"], ["Gross profit"]];
checks.getRange("B7:B9").values = [[parentNet], [parentCost], [parentGross]];
checks.getRange("C7:C9").formulas = [[`=ROUND(SUM('Medical Allocation'!U9:U${finalRow}),2)`], [`=ROUND(SUM('Medical Allocation'!X9:X${finalRow}),2)`], [`=ROUND(SUM('Medical Allocation'!Y9:Y${finalRow}),2)`]];
checks.getRange("D7:D9").formulas = [["=ROUND(C7-B7,2)"], ["=ROUND(C8-B8,2)"], ["=ROUND(C9-B9,2)"]];
checks.getRange("E7:E9").formulas = [["=IF(ABS(D7)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D8)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D9)<=0.01,\"PASS\",\"FAIL\")"]];
const checkTable = checks.tables.add("A6:E9", true, "ReconciliationTable"); checkTable.style = "TableStyleMedium4";
checks.getRange("B7:D9").format.numberFormat = "₱#,##0.00";
checks.getRange("E7:E9").conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#006100" } } });
checks.getRange("E7:E9").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });

checks.getRange("A12:B12").values = [["method input", "value"]];
checks.getRange("A13:B20").values = [
  ["Eligible product scope", "Only medicine and medical_supply products observed in Government sales"],
  ["Historical observation window", "2022–2024"],
  ["Selected historical basket net sales", historicalNet],
  ["Selected historical basket acquisition cost", historicalCost],
  ["Historical basket cost ratio", historicalCost / historicalNet],
  ["Pagbilao parent cost ratio", parentCost / parentNet],
  ["Net-sales scaling factor", parentNet / historicalNet],
  ["Acquisition-cost scaling factor", parentCost / historicalCost],
];
checks.getRange("B15:B16").format.numberFormat = "₱#,##0.00";
checks.getRange("B17:B18").format.numberFormat = "0.0000%";
checks.getRange("B19:B20").format.numberFormat = "0.000000";
checks.getRange("A22:B22").values = [["Interpretation rule", "Product identities are real MedShield medical products; their assignment to this Pagbilao parent remains an estimated allocation until the original itemized document is recovered."]];
checks.mergeCells("B22:F22");
checks.getRange("A22:F22").format = { fill: amber, font: { name: font, size: 10, bold: true, color: "#7F6000" } };

for (const [sheet, ranges] of [[allocation, ["A8:AE8"]], [parent, ["A7:N7"]], [evidence, ["A7:O7"]], [checks, ["A6:E6", "A12:B12"]]]) {
  for (const address of ranges) sheet.getRange(address).format = { fill: navy, font: { name: font, size: 10, bold: true, color: "#FFFFFF" }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: "#FFFFFF" } };
}

allocation.getRange("A:B").format.columnWidth = 22; allocation.getRange("C:D").format.columnWidth = 12; allocation.getRange("E:F").format.columnWidth = 18;
allocation.getRange("G:H").format.columnWidth = 23; allocation.getRange("I:I").format.columnWidth = 42; allocation.getRange("J:N").format.columnWidth = 24;
allocation.getRange("O:P").format.columnWidth = 25; allocation.getRange("Q:R").format.columnWidth = 16; allocation.getRange("S:Z").format.columnWidth = 20;
allocation.getRange("AA:AE").format.columnWidth = 30; allocation.getRange(`8:${finalRow}`).format.rowHeight = 34;
parent.getRange("A:A").format.columnWidth = 20; parent.getRange("B:B").format.columnWidth = 52; parent.getRange("C:N").format.columnWidth = 19; parent.getRange("H:H").format.columnWidth = 28; parent.getRange("7:8").format.rowHeight = 32;
evidence.getRange("A:A").format.columnWidth = 14; evidence.getRange("B:B").format.columnWidth = 62; evidence.getRange("C:C").format.columnWidth = 22; evidence.getRange("D:D").format.columnWidth = 36; evidence.getRange("E:L").format.columnWidth = 22; evidence.getRange("M:M").format.columnWidth = 24; evidence.getRange("N:N").format.columnWidth = 40; evidence.getRange("O:O").format.columnWidth = 90; evidence.getRange(`7:${7 + products.length}`).format.rowHeight = 34;
checks.getRange("A:A").format.columnWidth = 33; checks.getRange("B:D").format.columnWidth = 25; checks.getRange("E:E").format.columnWidth = 14; checks.getRange("B:B").format.wrapText = true; checks.getRange("13:22").format.rowHeight = 34;

workbook.recalculate();
const recon = await workbook.inspect({ kind: "table", range: "Reconciliation!A6:E9", include: "values,formulas", tableMaxRows: 10, tableMaxCols: 8 });
console.log(recon.ndjson);
const sample = await workbook.inspect({ kind: "table", range: `Medical Allocation!I8:AC${finalRow}`, include: "values,formulas", tableMaxRows: 20, tableMaxCols: 21 });
console.log(sample.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 100 }, summary: "final formula error scan" });
console.log(errors.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [["Medical Allocation", `A1:AE${finalRow}`], ["Original Parent", "A1:N8"], ["Product Evidence", `A1:O${7 + products.length}`], ["Reconciliation", "A1:F22"]]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${sheetName.toLowerCase().replaceAll(" ", "_")}.png`, new Uint8Array(await preview.arrayBuffer()));
}
await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, previewDir }));
