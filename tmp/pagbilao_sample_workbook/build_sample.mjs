import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/Adrian/projects/medshield1/medshield/outputs/sample_pagbilao_estimated_allocation";
const outputPath = `${outputDir}/sample_pagbilao_estimated_product_allocation.xlsx`;
const previewDir = "C:/Users/Adrian/projects/medshield1/medshield/tmp/pagbilao_sample_workbook/previews";
const font = "Arial";
const navy = "#17365D";
const blue = "#D9EAF7";
const lightBlue = "#EAF3F8";
const amber = "#FFF2CC";
const red = "#FCE8E6";
const green = "#E2F0D9";
const gray = "#E7E6E6";
const dark = "#1F2937";

const workbook = Workbook.create();
const allocation = workbook.worksheets.add("Estimated Allocation");
const parent = workbook.worksheets.add("Original Parent");
const history = workbook.worksheets.add("Historical Basis");
const checks = workbook.worksheets.add("Reconciliation");

for (const sheet of [allocation, parent, history, checks]) {
  sheet.showGridLines = false;
  sheet.getRange("A1:AA80").format.font = { name: font, size: 10, color: dark };
  sheet.getRange("A1:AA80").format.verticalAlignment = "center";
}

allocation.tabColor = navy;
parent.tabColor = "#C9B458";
history.tabColor = "#6FA8DC";
checks.tabColor = "#548235";

// Original source row, retained unchanged.
parent.getRange("A2:N2").values = [["Original Pagbilao source row"]];
parent.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
parent.getRange("A3:N3").values = [["The source record is preserved exactly. The amount embedded in the label is not used as net sales; reconciliation uses the source Net CP, Total TP, and gross profit fields."]];
parent.getRange("A3:N3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
parent.getRange("A4:N4").values = [["Source: data/medshield/dataset_csv/medshield_data_2025.csv, source CSV line 234"]];
parent.getRange("A4:N4").format.font = { name: font, size: 9, italic: true, color: "#666666" };
parent.mergeCells("A2:N2");
parent.mergeCells("A3:N3");
parent.mergeCells("A4:N4");

const parentHeaders = [
  "parent_record_id", "source_file", "source_year", "source_row_number", "area",
  "dr_number", "date_delivered", "original_product_label", "source_quantity",
  "embedded_label_amount", "parent_net_sales", "parent_acquisition_cost",
  "parent_gross_profit", "source_record_status",
];
parent.getRange("A7:N7").values = [parentHeaders];
parent.getRange("A8:N8").values = [[
  "SRC-2025-0234", "data/medshield/dataset_csv/medshield_data_2025.csv", 2025, 234,
  "Government", "DR RT 0002016", new Date("2025-01-23T00:00:00"),
  "PAGBILAO # 13,500,000", 1, 13500000, 11567580, 4229349.44, 7338230.56,
  "original_parent_preserved",
]];
const parentTable = parent.tables.add("A7:N8", true, "OriginalParentTable");
parentTable.style = "TableStyleMedium2";
parent.getRange("G8:G8").format.numberFormat = "yyyy-mm-dd";
parent.getRange("I8:I8").format.numberFormat = "#,##0";
parent.getRange("J8:M8").format.numberFormat = '₱#,##0.00';
parent.freezePanes.freezeRows(7);

// Historical evidence uses real MedShield product strings and observed prices.
history.getRange("A2:I2").values = [["Historical basis for the estimated products"]];
history.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
history.getRange("A3:I3").values = [["These products genuinely occur in prior MedShield Government sales. The sample extrapolates their historical mix; it does not claim they were the actual contents of DR RT 0002016."]];
history.getRange("A3:I3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
history.getRange("A4:I4").values = [["Sources: data/medshield/dataset_csv/medshield_data_2022.csv; medshield_data_2023.csv; outputs/contract_backward_allocation_20260623/estimated_child_rows.csv"]];
history.getRange("A4:I4").format.font = { name: font, size: 9, italic: true, color: "#666666" };
history.mergeCells("A2:I2");
history.mergeCells("A3:I3");
history.mergeCells("A4:I4");
const historyHeaders = [
  "historical_product", "observed_occurrences", "first_year", "last_year",
  "observed_quantity", "median_selling_price", "median_acquisition_price",
  "historical_allocation_weight", "source_csv_lines",
];
history.getRange("A7:I7").values = [historyHeaders];
history.getRange("A8:I12").values = [
  ["CORRECTION TAPE JOY", 8, 2023, 2023, 260, 146.5, 16, 0.33003860631123916, "2023:1588; 1743; 1805; 1886; 1894; 1931; 2874; 3123"],
  ["JACKIE DISINFECT SPRAY 500ML", 4, 2023, 2023, 47, 269, 230, 0.14693405158406464, "2023:1887; 1889; 2143; 3450"],
  ["HARD COPY SUB#20 SHORT", 3, 2022, 2023, 405, 210, 141, 0.16550701506503573, "2022:3844; 2023:1737; 2868"],
  ["TRASH BAG - BLACK - MEDIUM", 6, 2022, 2023, 131, 199, 20, 0.20897695379166284, "2022:3989; 3992; 2023:1550; 1843; 1951; 3089"],
  ["RECORD BOOK 300PP", 4, 2023, 2023, 120, 115, 68, 0.1485433732479977, "2023:1594; 1745; 1812; 2882"],
];
const historyTable = history.tables.add("A7:I12", true, "HistoricalBasisTable");
historyTable.style = "TableStyleMedium2";
history.getRange("E8:E12").format.numberFormat = "#,##0";
history.getRange("F8:G12").format.numberFormat = '₱#,##0.00';
history.getRange("H8:H12").format.numberFormat = "0.00%";
history.freezePanes.freezeRows(7);

// Estimated replacement lines.
allocation.getRange("A2:AA2").values = [["Sample Pagbilao estimated product allocation"]];
allocation.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
allocation.getRange("A3:AA3").values = [["Offline sample only. Product names are historically observed; quantities and financial splits are modeled estimates. No line is a verified invoice item."]];
allocation.getRange("A3:AA3").format.font = { name: font, size: 10, bold: true, color: "#9C0006" };
allocation.getRange("A4:B5").values = [
  ["Parent record", "SRC-2025-0234"],
  ["Original label", "PAGBILAO # 13,500,000"],
];
allocation.getRange("D4:E5").values = [
  ["Parent net sales", 11567580],
  ["Estimated child lines", 5],
];
allocation.getRange("G4:H5").values = [
  ["Actual line items verified", "No"],
  ["Intended use", "Offline analytical basis"],
];
allocation.getRange("A4:A5,D4:D5,G4:G5").format.font = { name: font, size: 10, bold: true, color: navy };
allocation.getRange("E4").format.numberFormat = '₱#,##0.00';
allocation.getRange("H4").format = { fill: red, font: { name: font, size: 10, bold: true, color: "#9C0006" } };
allocation.getRange("A6:AA6").values = [["The embedded ₱13.5 million label is a reference amount. The child lines reconcile to the source row's ₱11,567,580 Net CP, ₱4,229,349.44 Total TP, and ₱7,338,230.56 gross profit."]];
allocation.getRange("A6:AA6").format.font = { name: font, size: 9, italic: true, color: "#595959" };
allocation.mergeCells("A2:AA2");
allocation.mergeCells("A3:AA3");
allocation.mergeCells("A6:AA6");

const allocationHeaders = [
  "estimated_line_id", "parent_record_id", "source_year", "source_row_number", "dr_number",
  "date_delivered", "customer_or_area", "original_product_label", "estimated_product_name",
  "product_class", "product_subcategory", "candidate_product_key", "canonical_sku",
  "sku_mapping_status", "estimated_quantity", "quantity_unit", "estimated_unit_selling_price",
  "estimated_net_sales", "estimated_unit_acquisition_cost", "estimated_acquisition_cost",
  "estimated_gross_profit", "allocation_share", "allocation_method", "allocation_confidence",
  "actual_line_item_verified", "record_status", "notes",
];
allocation.getRange("A8:AA8").values = [allocationHeaders];

const products = [
  ["EST-SRC-2025-0234-01", "CORRECTION TAPE JOY", "non_medical", "office_stationery", "CAND-PROD-0001", 26060, 3817790.00, 399461.87],
  ["EST-SRC-2025-0234-02", "JACKIE DISINFECT SPRAY 500ML", "non_medical", "janitorial_cleaning", "CAND-PROD-0002", 6318, 1699542.00, 1392157.56],
  ["EST-SRC-2025-0234-03", "HARD COPY SUB#20 SHORT", "non_medical", "office_stationery", "CAND-PROD-0003", 9117, 1914570.00, 1231549.86],
  ["EST-SRC-2025-0234-04", "TRASH BAG - BLACK - MEDIUM", "non_medical", "janitorial_cleaning", "CAND-PROD-0004", 12148, 2417452.00, 232763.95],
  ["EST-SRC-2025-0234-05", "RECORD BOOK 300PP", "non_medical", "office_stationery", "CAND-PROD-0005", 14942, 1718226.00, 973416.20],
];

for (let index = 0; index < products.length; index += 1) {
  const row = 9 + index;
  const [lineId, productName, productClass, subcategory, candidateKey, quantity, netSales, acquisitionCost] = products[index];
  allocation.getRange(`A${row}:P${row}`).values = [[
    lineId, "SRC-2025-0234", 2025, 234, "DR RT 0002016", new Date("2025-01-23T00:00:00"),
    "Pagbilao", "PAGBILAO # 13,500,000", productName, productClass, subcategory,
    candidateKey, "", "needs_product_master_review", quantity, "units",
  ]];
  allocation.getRange(`Q${row}`).formulas = [[`=R${row}/O${row}`]];
  allocation.getRange(`R${row}`).values = [[netSales]];
  allocation.getRange(`S${row}`).formulas = [[`=T${row}/O${row}`]];
  allocation.getRange(`T${row}`).values = [[acquisitionCost]];
  allocation.getRange(`U${row}`).formulas = [[`=R${row}-T${row}`]];
  allocation.getRange(`V${row}`).formulas = [[`=R${row}/'Original Parent'!$K$8`]];
  allocation.getRange(`W${row}:AA${row}`).values = [[
    "same_area_same_channel_prior_3y_product_mix", "medium", false,
    "estimated_not_verified", "Historical product identity; estimated quantity and financial allocation.",
  ]];
}
const allocationTable = allocation.tables.add("A8:AA13", true, "EstimatedAllocationTable");
allocationTable.style = "TableStyleMedium2";
allocation.getRange("F9:F13").format.numberFormat = "yyyy-mm-dd";
allocation.getRange("O9:O13").format.numberFormat = "#,##0";
allocation.getRange("Q9:U13").format.numberFormat = '₱#,##0.00';
allocation.getRange("V9:V13").format.numberFormat = "0.00%";
allocation.getRange("M9:N13").format.fill = amber;
allocation.getRange("Y9:Z13").format.fill = red;
allocation.freezePanes.freezeRows(8);
allocation.freezePanes.freezeColumns(4);

// Reconciliation and method.
checks.getRange("A2:E2").values = [["Reconciliation and method"]];
checks.getRange("A2").format.font = { name: font, size: 14, bold: true, color: navy };
checks.getRange("A3:E3").values = [["The sample passes financial reconciliation but remains estimated because the source contract line items have not been verified."]];
checks.getRange("A3:E3").format.font = { name: font, size: 10, italic: true, color: "#595959" };
checks.mergeCells("A2:E2");
checks.mergeCells("A3:E3");
checks.getRange("A6:E6").values = [["metric", "parent_value", "estimated_children", "delta", "status"]];
checks.getRange("A7:A9").values = [["Net sales"], ["Acquisition cost"], ["Gross profit"]];
checks.getRange("B7:B9").formulas = [["='Original Parent'!K8"], ["='Original Parent'!L8"], ["='Original Parent'!M8"]];
checks.getRange("C7:C9").formulas = [["=SUM('Estimated Allocation'!R9:R13)"], ["=SUM('Estimated Allocation'!T9:T13)"], ["=SUM('Estimated Allocation'!U9:U13)"]];
checks.getRange("D7:D9").formulas = [["=C7-B7"], ["=C8-B8"], ["=C9-B9"]];
checks.getRange("E7:E9").formulas = [["=IF(ABS(D7)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D8)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D9)<=0.01,\"PASS\",\"FAIL\")"]];
const checkTable = checks.tables.add("A6:E9", true, "ReconciliationTable");
checkTable.style = "TableStyleMedium4";
checks.getRange("B7:D9").format.numberFormat = '₱#,##0.00';
checks.getRange("E7:E9").conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#006100" } } });
checks.getRange("E7:E9").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });

checks.getRange("A12:B12").values = [["Method step", "Implementation in this sample"]];
checks.getRange("A13:B18").values = [
  ["1. Preserve parent", "The original row remains unchanged on Original Parent."],
  ["2. Select product identities", "Use the five historically observed products selected by the existing comparable-history allocation."],
  ["3. Estimate quantities", "Divide each historical allocation share by the observed median selling price and round to whole units."],
  ["4. Reconcile net sales", "Adjust the final line by ₱104 so child net sales equal the parent exactly."],
  ["5. Reconcile acquisition cost", "Scale observed acquisition-price estimates proportionally so child acquisition cost equals the parent exactly."],
  ["6. Restrict interpretation", "Every child remains estimated, medium confidence, unverified, and pending product-master review."],
];
checks.getRange("A20:B20").values = [["Decision rule", "Do not describe these lines as actual invoice products unless the original Pagbilao source document confirms them."]];
checks.getRange("A20:B20").format = { fill: amber, font: { name: font, size: 10, bold: true, color: "#7F6000" } };
for (let row = 13; row <= 18; row += 1) checks.mergeCells(`B${row}:E${row}`);
checks.mergeCells("B20:E20");

// Consistent header and structural styling.
for (const [sheet, ranges] of [
  [allocation, ["A8:AA8"]],
  [parent, ["A7:N7"]],
  [history, ["A7:I7"]],
  [checks, ["A6:E6", "A12:B12"]],
]) {
  for (const address of ranges) {
    sheet.getRange(address).format = {
      fill: navy,
      font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: "#FFFFFF" },
    };
  }
}

// Widths and row sizes.
allocation.getRange("A:A").format.columnWidth = 22;
allocation.getRange("B:B").format.columnWidth = 18;
allocation.getRange("C:D").format.columnWidth = 12;
allocation.getRange("E:F").format.columnWidth = 17;
allocation.getRange("G:H").format.columnWidth = 24;
allocation.getRange("I:I").format.columnWidth = 32;
allocation.getRange("J:N").format.columnWidth = 24;
allocation.getRange("O:P").format.columnWidth = 15;
allocation.getRange("Q:V").format.columnWidth = 19;
allocation.getRange("W:AA").format.columnWidth = 28;
allocation.getRange("8:13").format.rowHeight = 32;

parent.getRange("A:A").format.columnWidth = 20;
parent.getRange("B:B").format.columnWidth = 52;
parent.getRange("C:N").format.columnWidth = 19;
parent.getRange("H:H").format.columnWidth = 28;
parent.getRange("7:8").format.rowHeight = 32;

history.getRange("A:A").format.columnWidth = 34;
history.getRange("B:H").format.columnWidth = 18;
history.getRange("I:I").format.columnWidth = 58;
history.getRange("7:12").format.rowHeight = 32;

checks.getRange("A:A").format.columnWidth = 26;
checks.getRange("B:D").format.columnWidth = 24;
checks.getRange("E:E").format.columnWidth = 14;
checks.getRange("B:B").format.wrapText = true;
checks.getRange("13:20").format.rowHeight = 36;

workbook.recalculate();

const keyCheck = await workbook.inspect({
  kind: "table",
  range: "Reconciliation!A6:E9",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(keyCheck.ndjson);

const allocationCheck = await workbook.inspect({
  kind: "table",
  range: "Estimated Allocation!A8:V13",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 22,
});
console.log(allocationCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range] of [
  ["Estimated Allocation", "A1:AA13"],
  ["Original Parent", "A1:N8"],
  ["Historical Basis", "A1:I12"],
  ["Reconciliation", "A1:E20"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  const safe = sheetName.toLowerCase().replaceAll(" ", "_");
  await fs.writeFile(`${previewDir}/${safe}.png`, new Uint8Array(await preview.arrayBuffer()));
}

await fs.mkdir(outputDir, { recursive: true });
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(JSON.stringify({ outputPath, previewDir }));
