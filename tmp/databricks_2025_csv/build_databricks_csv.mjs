import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const inputPath = path.join(
  repoRoot,
  "outputs",
  "full_medshield_2025_allocation",
  "Full_MedShield_2025_with_all_contract_medical_product_allocation.xlsx",
);
const outputDir = path.join(repoRoot, "outputs", "full_medshield_2025_allocation");
const outputPath = path.join(outputDir, "medshield_data_2025_databricks_ready.csv");

const blob = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(blob);
const sheet = workbook.worksheets.getItem("Full 2025 Dataset");

// The first 13 columns are the original MedShield sales layout. The remaining
// columns are allocation/audit metadata and stay in the review workbook.
// Rows 7:4576 are the 4,570 records in FullMedShield2025Table. The workbook
// intentionally places a display-only grand total below that table.
const matrix = sheet.getRange("A6:M4576").values;
const dataRows = matrix
  .slice(1)
  .filter((row) => row.some((value) => value !== null && value !== undefined && value !== ""));

const expectedHeaders = [
  "Area",
  "DR Number",
  "Date Delivered",
  "Product",
  " Qty ",
  " CP ",
  " Total CP ",
  " Disc ",
  " Net CP ",
  " TP/UNIT ",
  " TOTAL TP ",
  " Net Income ",
  "%",
];

function excelDateToIso(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return text;
}

function csvField(value) {
  let text;
  if (value === null || value === undefined) text = "";
  else if (typeof value === "number") text = Number.isFinite(value) ? String(value) : "";
  else if (value instanceof Date) text = value.toISOString().slice(0, 10);
  else text = String(value);
  text = text.replace(/[\r\n]+/g, " ");
  return /[",]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const normalizedRows = dataRows.map((row) => {
  const values = row.slice(0, 13);
  values[2] = excelDateToIso(values[2]);
  // The workbook stores margin as a ratio (for example 0.367415). The sales
  // CSV contract stores percentage points, which Silver divides by 100.
  if (values[12] !== null && values[12] !== undefined && values[12] !== "") {
    const percent = Number(values[12]) * 100;
    if (!Number.isFinite(percent)) throw new Error(`Invalid margin ratio: ${values[12]}`);
    values[12] = `${percent.toFixed(4)}%`;
  }
  // Sales Report.xlsx stores this source date as Excel serial 45,913. The
  // allocation workbook lost the display value, but the original 2025 export
  // and all adjacent lines for the same DR resolve it to 2025-09-13.
  if (
    !values[2] &&
    String(values[1] ?? "").trim() === "DR MS 03259" &&
    String(values[3] ?? "").trim() === "MICROPORE 1X10 2.5CMX9.1M (3M)" &&
    Number(values[6]) === 23238
  ) {
    values[2] = "2025-09-13";
  }
  return values;
});

// Silver intentionally quarantines exact business duplicates. Consolidate
// byte-for-byte duplicate line items so their value remains in the analytical
// total. The allocation workbook retains the original child-level lineage.
const additiveColumns = [4, 6, 7, 8, 10, 11];
function multiplied(value, count) {
  if (value === null || value === undefined || value === "") return value;
  const result = Number(value) * count;
  if (!Number.isFinite(result)) throw new Error(`Invalid numeric value: ${value}`);
  return Number(result.toFixed(6));
}

function consolidateExactRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    // Key on the exact serialized values seen by the CSV parser. Some workbook
    // numeric cells differ below JavaScript's displayed precision but serialize
    // to the same pipeline value.
    const key = JSON.stringify(row.map(csvField));
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { row: [...row], count: 1 });
      continue;
    }
    existing.count += 1;
  }
  const result = [];
  for (const { row, count } of groups.values()) {
    if (count > 1) {
      for (const column of additiveColumns) row[column] = multiplied(row[column], count);
    }
    result.push(row);
  }
  return result;
}

let pipelineRows = normalizedRows;
let previousLength;
do {
  previousLength = pipelineRows.length;
  pipelineRows = consolidateExactRows(pipelineRows);
} while (pipelineRows.length < previousLength);

const outputRows = [
  ["MEDSHIELD PHARMA CORP", ...Array(12).fill("")],
  ["SALES SUMMARY REPORT", ...Array(12).fill("")],
  ["AS OF DECEMBER 2025", ...Array(12).fill("")],
  Array(13).fill(""),
  Array(13).fill(""),
  expectedHeaders,
  ...pipelineRows,
];

if (dataRows.length !== 4570) {
  throw new Error(`Expected 4,570 data rows, found ${dataRows.length}.`);
}
if (pipelineRows.some((row) => !String(row[3] ?? "").trim())) {
  throw new Error("The pipeline CSV still contains a blank product value.");
}

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  outputPath,
  outputRows.map((row) => row.map(csvField).join(",")).join("\n") + "\n",
  "utf8",
);

console.log(JSON.stringify({
  outputPath,
  workbookRows: dataRows.length,
  pipelineRows: pipelineRows.length,
  exactDuplicateRowsConsolidated: dataRows.length - pipelineRows.length,
}, null, 2));
