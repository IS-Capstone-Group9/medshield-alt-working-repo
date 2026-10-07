import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/Adrian/projects/medshield1/medshield/outputs/sample_pagbilao_estimated_allocation/sample_pagbilao_estimated_product_allocation.xlsx";
const file = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(file);
const result = await workbook.inspect({
  kind: "table",
  range: "Reconciliation!A6:E9",
  include: "values,formulas",
  tableMaxRows: 10,
  tableMaxCols: 8,
});
console.log(result.ndjson);
