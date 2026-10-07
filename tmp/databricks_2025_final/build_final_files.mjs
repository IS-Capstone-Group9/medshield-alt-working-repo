import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const medshieldRoot = path.resolve(import.meta.dirname, "..", "..");
const sourceCsv = path.join(
  medshieldRoot,
  "outputs",
  "full_medshield_2025_allocation",
  "medshield_data_2025_databricks_ready.csv",
);
const outputDir = path.join(medshieldRoot, "outputs", "2025_databricks_final");
const outputCsv = path.join(outputDir, "medshield_data_2025.csv");
const outputXlsx = path.join(outputDir, "medshield_data_2025.xlsx");
const previewPath = path.join(import.meta.dirname, "medshield_data_2025_preview.png");

await fs.mkdir(outputDir, { recursive: true });
const csvText = await fs.readFile(sourceCsv, "utf8");

// The CSV is already normalized for the current 13-column Silver contract.
// Save it with the exact production filename expected by 01_sales_bronze.py.
await fs.writeFile(outputCsv, csvText, "utf8");

const workbook = await Workbook.fromCSV(csvText, { sheetName: "2025" });
const sheet = workbook.worksheets.getItem("2025");
const used = sheet.getUsedRange(true);
const values = used.values;

if (values.length !== 4550) {
  throw new Error(`Expected 4,550 CSV rows including preamble/header; found ${values.length}.`);
}
if (values.some((row) => row.length !== 13)) {
  throw new Error("Every Excel row must contain exactly 13 columns.");
}

const expectedHeader = [
  "Area", "DR Number", "Date Delivered", "Product", " Qty ", " CP ",
  " Total CP ", " Disc ", " Net CP ", " TP/UNIT ", " TOTAL TP ",
  " Net Income ", "%",
];
if (JSON.stringify(values[5]) !== JSON.stringify(expectedHeader)) {
  throw new Error(`Unexpected 2025 header: ${JSON.stringify(values[5])}`);
}

sheet.freezePanes.freezeRows(6);
sheet.getRange("A1:M4550").format.font = { name: "Arial", size: 10, color: "#1F2937" };
sheet.getRange("A1:M3").format.font = { name: "Arial", size: 11, bold: true, color: "#1F2937" };
sheet.getRange("A6:M6").format = {
  fill: "#1F4E78",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "outside", style: "thin", color: "#A7B7C7" },
};
sheet.getRange("A6:M4550").format.verticalAlignment = "center";
sheet.getRange("A1:A4550").format.columnWidth = 18;
sheet.getRange("B1:B4550").format.columnWidth = 18;
sheet.getRange("C1:C4550").format.columnWidth = 15;
sheet.getRange("D1:D4550").format.columnWidth = 75;
sheet.getRange("E1:M4550").format.columnWidth = 16;
sheet.getRange("A6:M6").format.rowHeight = 24;

workbook.recalculate();

const inspection = await workbook.inspect({
  kind: "region",
  sheetId: "2025",
  range: "A1:M10",
  include: "values,formulas",
  maxChars: 5000,
  tableMaxRows: 10,
  tableMaxCols: 13,
});
console.log(inspection.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "2025",
  range: "A1:M20",
  scale: 1,
  format: "png",
});
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputXlsx);

// Reopen the exported workbook so the saved file, rather than only the in-memory
// workbook, is part of the verification.
const savedWorkbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputXlsx));
const savedSheet = savedWorkbook.worksheets.getItem("2025");
const savedValues = savedSheet.getUsedRange(true).values;
if (savedValues.length !== values.length || savedValues.some((row) => row.length !== 13)) {
  throw new Error("Saved Excel dimensions differ from the source CSV.");
}
if (JSON.stringify(savedValues[5]) !== JSON.stringify(expectedHeader)) {
  throw new Error("Saved Excel header differs from the source CSV.");
}

console.log(JSON.stringify({
  outputCsv,
  outputXlsx,
  sheet: "2025",
  rowsIncludingPreambleAndHeader: values.length,
  transactionRows: values.length - 6,
  columns: values[5].length,
}, null, 2));
