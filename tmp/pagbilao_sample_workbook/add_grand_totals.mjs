import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "C:/Users/Adrian/projects/medshield1/medshield/outputs/pagbilao_medical_allocation_2025/medshield_2025_with_pagbilao_medical_allocation.xlsx";
const outputPath = "C:/Users/Adrian/projects/medshield1/medshield/outputs/pagbilao_medical_allocation_2025/medshield_2025_with_pagbilao_medical_allocation_and_totals.xlsx";
const previewDir = "C:/Users/Adrian/projects/medshield1/medshield/tmp/pagbilao_sample_workbook/previews_full_2025";
const source = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(source);
const full = workbook.worksheets.getItem("Full 2025 Dataset");
const totals = workbook.worksheets.add("Grand Totals");

const font = "Arial";
const navy = "#17365D";
const blue = "#D9EAF7";
const amber = "#FFF2CC";
const green = "#E2F0D9";
const red = "#FCE8E6";
const fullLastRow = 4413;
const parentLastRow = 142;
const totalRow = fullLastRow + 2;

// Visible grand total below the full analytical table. It is outside the Excel table to prevent double counting.
full.getRange(`A${totalRow}:D${totalRow}`).values = [["GRAND TOTAL — ALL 2025 ANALYTICAL ROWS"]];
full.mergeCells(`A${totalRow}:D${totalRow}`);
full.getRange(`E${totalRow}`).formulas = [[`=ROUND(SUM(E7:E${fullLastRow}),2)`]];
full.getRange(`G${totalRow}:I${totalRow}`).formulas = [[`=ROUND(SUM(G7:G${fullLastRow}),2)`, `=ROUND(SUM(H7:H${fullLastRow}),2)`, `=ROUND(SUM(I7:I${fullLastRow}),2)`]];
full.getRange(`K${totalRow}:L${totalRow}`).formulas = [[`=ROUND(SUM(K7:K${fullLastRow}),2)`, `=ROUND(SUM(L7:L${fullLastRow}),2)`]];
full.getRange(`M${totalRow}`).formulas = [[`=IFERROR(L${totalRow}/I${totalRow},0)`]];
full.getRange(`A${totalRow}:AI${totalRow}`).format = {
  fill: navy,
  font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#FFFFFF" },
};
full.getRange(`E${totalRow}`).format.numberFormat = "#,##0.00";
full.getRange(`G${totalRow}:L${totalRow}`).format.numberFormat = "₱#,##0.00";
full.getRange(`M${totalRow}`).format.numberFormat = "0.00%";
full.getRange(`${totalRow}:${totalRow}`).format.rowHeight = 34;
full.getRange(`A${totalRow + 1}:AI${totalRow + 1}`).values = [["Summary row only; it is outside Full2025AllocationTable and must not be ingested as a transaction."]];
full.mergeCells(`A${totalRow + 1}:AI${totalRow + 1}`);
full.getRange(`A${totalRow + 1}`).format = { fill: amber, font: { name: font, size: 9, italic: true, color: "#7F6000" } };

totals.showGridLines = false;
totals.getRange("A1:I40").format.font = { name: font, size: 10, color: "#1F2937" };
totals.getRange("A2:I2").values = [["2025 Grand Totals"]];
totals.getRange("A3:I3").values = [["Financial totals reconcile exactly between the original 2025 source and the allocation-enabled output."]];
totals.getRange("A4:I4").values = [["Pagbilao parent quantity counts contract lines; child quantity estimates medical units, so quantity is expected to change. The parent sheet preserves every original value."]];
totals.mergeCells("A2:I2");
totals.mergeCells("A3:I3");
totals.mergeCells("A4:I4");
totals.getRange("A2").format.font = { name: font, size: 16, bold: true, color: navy };
totals.getRange("A3").format.font = { name: font, size: 10, bold: true, color: "#006100" };
totals.getRange("A4").format.font = { name: font, size: 9, italic: true, color: "#595959" };

totals.getRange("A7:I7").values = [["dataset_component", "row_count", "total_cp", "discount", "net_sales", "acquisition_cost", "gross_profit", "gross_margin", "total_quantity"]];
totals.getRange("A8:A12").values = [
  ["Full 2025 analytical output"],
  ["Unchanged non-Pagbilao rows"],
  ["Estimated Pagbilao medical children"],
  ["Original Pagbilao parents (lineage)"],
  ["Original 2025 source before replacement"],
];
totals.getRange("B8:B12").formulas = [
  [`=COUNTA('Full 2025 Dataset'!P7:P${fullLastRow})`],
  [`=COUNTIF('Full 2025 Dataset'!S7:S${fullLastRow},"original_sales_row")`],
  [`=COUNTIF('Full 2025 Dataset'!S7:S${fullLastRow},"estimated_pagbilao_medical_child")`],
  [`=COUNTA('Pagbilao Parents'!P7:P${parentLastRow})`],
  [`=B9+B11`],
];
for (const [column, sourceColumn] of [["C", "G"], ["D", "H"], ["E", "I"], ["F", "K"], ["G", "L"]]) {
  totals.getRange(`${column}8`).formulas = [[`=ROUND(SUM('Full 2025 Dataset'!${sourceColumn}7:${sourceColumn}${fullLastRow}),2)`]];
  totals.getRange(`${column}9`).formulas = [[`=ROUND(SUMIF('Full 2025 Dataset'!S7:S${fullLastRow},"original_sales_row",'Full 2025 Dataset'!${sourceColumn}7:${sourceColumn}${fullLastRow}),2)`]];
  totals.getRange(`${column}10`).formulas = [[`=ROUND(SUMIF('Full 2025 Dataset'!S7:S${fullLastRow},"estimated_pagbilao_medical_child",'Full 2025 Dataset'!${sourceColumn}7:${sourceColumn}${fullLastRow}),2)`]];
  totals.getRange(`${column}11`).formulas = [[`=ROUND(SUM('Pagbilao Parents'!${sourceColumn}7:${sourceColumn}${parentLastRow}),2)`]];
  totals.getRange(`${column}12`).formulas = [[`=ROUND(${column}9+${column}11,2)`]];
}
totals.getRange("H8:H12").formulas = [["=IFERROR(G8/E8,0)"], ["=IFERROR(G9/E9,0)"], ["=IFERROR(G10/E10,0)"], ["=IFERROR(G11/E11,0)"], ["=IFERROR(G12/E12,0)"]];
totals.getRange("I8:I12").formulas = [
  [`=ROUND(SUM('Full 2025 Dataset'!E7:E${fullLastRow}),2)`],
  [`=ROUND(SUMIF('Full 2025 Dataset'!S7:S${fullLastRow},"original_sales_row",'Full 2025 Dataset'!E7:E${fullLastRow}),2)`],
  [`=ROUND(SUMIF('Full 2025 Dataset'!S7:S${fullLastRow},"estimated_pagbilao_medical_child",'Full 2025 Dataset'!E7:E${fullLastRow}),2)`],
  [`=ROUND(SUM('Pagbilao Parents'!E7:E${parentLastRow}),2)`],
  ["=ROUND(I9+I11,2)"],
];

totals.getRange("A15:E15").values = [["reconciliation_metric", "original_source", "allocation_output", "delta", "status"]];
totals.getRange("A16:A18").values = [["Net sales"], ["Acquisition cost"], ["Gross profit"]];
totals.getRange("B16:B18").formulas = [["=E12"], ["=F12"], ["=G12"]];
totals.getRange("C16:C18").formulas = [["=E8"], ["=F8"], ["=G8"]];
totals.getRange("D16:D18").formulas = [["=ROUND(C16-B16,2)"], ["=ROUND(C17-B17,2)"], ["=ROUND(C18-B18,2)"]];
totals.getRange("E16:E18").formulas = [["=IF(ABS(D16)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D17)<=0.01,\"PASS\",\"FAIL\")"], ["=IF(ABS(D18)<=0.01,\"PASS\",\"FAIL\")"]];

for (const range of ["A7:I7", "A15:E15"]) {
  totals.getRange(range).format = {
    fill: navy,
    font: { name: font, size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#FFFFFF" },
  };
}
totals.getRange("B8:B12").format.numberFormat = "#,##0";
totals.getRange("C8:G12").format.numberFormat = "₱#,##0.00";
totals.getRange("H8:H12").format.numberFormat = "0.00%";
totals.getRange("I8:I12").format.numberFormat = "#,##0.00";
totals.getRange("B16:D18").format.numberFormat = "₱#,##0.00";
totals.getRange("E16:E18").conditionalFormats.add("containsText", { text: "PASS", format: { fill: green, font: { bold: true, color: "#006100" } } });
totals.getRange("E16:E18").conditionalFormats.add("containsText", { text: "FAIL", format: { fill: red, font: { bold: true, color: "#9C0006" } } });
totals.getRange("A8:I8").format.fill = blue;
totals.getRange("A12:I12").format.fill = amber;
totals.getRange("A:A").format.columnWidth = 42;
totals.getRange("B:B").format.columnWidth = 16;
totals.getRange("C:G").format.columnWidth = 23;
totals.getRange("H:H").format.columnWidth = 18;
totals.getRange("I:I").format.columnWidth = 18;
totals.getRange("7:18").format.rowHeight = 32;
totals.freezePanes.freezeRows(7);

workbook.recalculate();
const check = await workbook.inspect({ kind: "table", range: "Grand Totals!A7:I18", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 10 });
console.log(check.ndjson);

await fs.mkdir(previewDir, { recursive: true });
for (const [sheetName, range, name] of [
  ["Grand Totals", "A1:I18", "grand_totals.png"],
  ["Full 2025 Dataset", `A${fullLastRow - 3}:M${totalRow + 1}`, "full_2025_grand_total_row.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
  await fs.writeFile(`${previewDir}/${name}`, new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const saved = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const savedCheck = await saved.inspect({ kind: "table", range: "Grand Totals!A7:I18", include: "values,formulas", tableMaxRows: 20, tableMaxCols: 10 });
console.log(savedCheck.ndjson);
console.log(JSON.stringify({ outputPath, totalRow }));
