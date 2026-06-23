import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const INPUT_PATH = path.join(ROOT, 'data/medshield/processed/sales_transactions_area_allocated.json.gz');
const OUTPUT_PATH = INPUT_PATH;
const QA_DIR = path.join(ROOT, 'outputs/sales_data_qa_20260623');
const ALLOCATION_DIR = path.join(ROOT, 'outputs/contract_backward_allocation_20260623');
const YEARLY_DIR = path.join(ALLOCATION_DIR, 'yearly_daily_clean_sales');
const FULL_CSV_PATH = path.join(ALLOCATION_DIR, 'sales_transactions_area_allocated_full.csv');

const ADDITIVE_FIELDS = [
  'quantity',
  'total_cost',
  'discount',
  'net_cost',
  'total_trade_price',
  'net_income',
];

const SOURCE_HEAD = process.argv.includes('--source-head');

const CSV_PRIORITY_FIELDS = [
  'date_delivered',
  'year',
  'month',
  'day',
  'dr_number',
  'area',
  'product',
  'quantity',
  'unit_cost',
  'total_cost',
  'discount',
  'net_cost',
  'trade_price_unit',
  'total_trade_price',
  'net_income',
  'margin_pct',
  'quality_status',
  'quality_notes',
  'allocation_status',
  'estimated',
  'original_area',
  'original_product',
  'allocation_method',
  'allocation_confidence',
  'allocation_profile_level',
  'allocation_weight',
  'allocation_child_number',
  'allocation_child_count',
  'embedded_area_amount',
  'allocated_embedded_area_amount',
  'source_workbook',
  'source_sheet',
  'source_row_number',
  'source_hash',
  'business_hash',
  'parent_source_hash',
  'parent_business_hash',
  'input_stage',
  'standardization_applied',
  'duplicate',
  'allocation_profile_rows',
  'allocation_profile_products',
  'sales_acceptance_status',
  'sales_rejection_reason',
];

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';
const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const round6 = (value) => Math.round((Number(value) + Number.EPSILON) * 1_000_000) / 1_000_000;

function readPayload(filePath) {
  if (SOURCE_HEAD) {
    const repoPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
    return JSON.parse(zlib.gunzipSync(execFileSync('git', ['show', `HEAD:${repoPath}`], {
      maxBuffer: 20 * 1024 * 1024,
    }), 'utf8'));
  }
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(filePath), 'utf8'));
}

function writePayload(filePath, payload) {
  fs.writeFileSync(filePath, zlib.gzipSync(JSON.stringify(payload, null, 2)));
}

function getQuality(row) {
  return String(row.quality_status || row.row_quality_status || '').trim().toLowerCase();
}

function getRejectionReasons(row) {
  const reasons = [];
  const quality = getQuality(row);

  if (quality === 'rejected') reasons.push('quality_status_rejected');
  if (isBlank(row.product)) reasons.push('missing_product');
  if (isBlank(row.area)) reasons.push('missing_area');
  if (!isValidDate(row.date_delivered)) reasons.push('missing_or_invalid_date_delivered');
  if (!(Number(row.quantity) > 0)) reasons.push('non_positive_quantity');
  if (!(Number(row.total_trade_price) > 0)) reasons.push('non_positive_total_trade_price');

  return reasons;
}

function summarize(rows) {
  const summary = {
    rows: rows.length,
    unique_products: new Set(),
    unique_areas: new Set(),
    estimated_backward_allocation_rows: 0,
    duplicate_rows: 0,
    by_year: {},
    by_quality_status: {},
  };

  for (const field of ADDITIVE_FIELDS) summary[field] = 0;

  for (const row of rows) {
    if (!isBlank(row.product)) summary.unique_products.add(String(row.product));
    if (!isBlank(row.area)) summary.unique_areas.add(String(row.area));
    if (row.allocation_status === 'estimated_backward_allocation') {
      summary.estimated_backward_allocation_rows += 1;
    }
    if (row.duplicate === true || row.duplicate === 'true') summary.duplicate_rows += 1;

    const year = isValidDate(row.date_delivered) ? String(row.date_delivered).slice(0, 4) : '(missing_date)';
    summary.by_year[year] = (summary.by_year[year] || 0) + 1;

    const quality = getQuality(row) || '(blank)';
    summary.by_quality_status[quality] = (summary.by_quality_status[quality] || 0) + 1;

    for (const field of ADDITIVE_FIELDS) {
      summary[field] += Number(row[field] || 0);
    }
  }

  for (const field of ADDITIVE_FIELDS) summary[field] = round6(summary[field]);
  summary.unique_products = summary.unique_products.size;
  summary.unique_areas = summary.unique_areas.size;
  return summary;
}

function enrichAccepted(row) {
  const date = String(row.date_delivered);
  return {
    ...row,
    year: date.slice(0, 4),
    month: date.slice(5, 7),
    day: date.slice(8, 10),
    sales_acceptance_status: 'accepted_clean_sales',
    sales_rejection_reason: '',
  };
}

function enrichRejected(row, reasons) {
  return {
    ...row,
    sales_acceptance_status: 'excluded_from_clean_sales',
    sales_rejection_reason: reasons.join('; '),
  };
}

function buildFields(rows) {
  const seen = new Set();
  const fields = [];
  for (const field of CSV_PRIORITY_FIELDS) {
    fields.push(field);
    seen.add(field);
  }
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        fields.push(key);
      }
    }
  }
  return fields;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') value = JSON.stringify(value);
  value = String(value);
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function writeCsv(filePath, rows, fields = buildFields(rows)) {
  const lines = [fields.join(',')];
  for (const row of rows) {
    lines.push(fields.map((field) => escapeCsv(row[field])).join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\r\n')}\r\n`);
}

function sortSalesRows(rows) {
  return [...rows].sort((a, b) => (
    String(a.date_delivered || '').localeCompare(String(b.date_delivered || '')) ||
    String(a.area || '').localeCompare(String(b.area || '')) ||
    String(a.product || '').localeCompare(String(b.product || '')) ||
    Number(a.source_row_number || 0) - Number(b.source_row_number || 0)
  ));
}

const payload = readPayload(INPUT_PATH);
const rows = payload.rows || [];
const acceptedRows = [];
const rejectedRows = [];
const rejectionReasons = {};

for (const row of rows) {
  const reasons = getRejectionReasons(row);
  if (reasons.length === 0) {
    acceptedRows.push(enrichAccepted(row));
  } else {
    const rejectedRow = enrichRejected(row, reasons);
    rejectedRows.push(rejectedRow);
    const key = rejectedRow.sales_rejection_reason;
    rejectionReasons[key] = (rejectionReasons[key] || 0) + 1;
  }
}

const sortedAcceptedRows = sortSalesRows(acceptedRows);
const sortedRejectedRows = sortSalesRows(rejectedRows);
const acceptedSummary = summarize(sortedAcceptedRows);
const rejectedSummary = summarize(sortedRejectedRows);

const cleanPayload = {
  metadata: {
    ...payload.metadata,
    dataset_name: 'MedShield Sales - Accepted Clean Sales with Area Summary Backward Allocation',
    cleaning_status: 'accepted_clean_sales_only',
    generated_at: new Date().toISOString(),
    source_dataset_before_sales_qa: SOURCE_HEAD
      ? 'HEAD:data/medshield/processed/sales_transactions_area_allocated.json.gz'
      : 'data/medshield/processed/sales_transactions_area_allocated.json.gz',
    sales_qa_rules: [
      'Exclude rows with quality_status = rejected.',
      'Exclude rows with missing product.',
      'Exclude rows with missing area.',
      'Exclude rows without a valid YYYY-MM-DD date_delivered.',
      'Exclude rows with non-positive quantity.',
      'Exclude rows with non-positive total_trade_price.',
      'Retain warning rows when the row still has product, area, date, quantity, and sales value.',
      'Retain estimated_backward_allocation rows when they satisfy clean-sales rules.',
    ],
    sales_qa_summary: {
      input_rows: rows.length,
      accepted_clean_sales_rows: sortedAcceptedRows.length,
      excluded_rows: sortedRejectedRows.length,
      accepted_summary: acceptedSummary,
      excluded_summary: rejectedSummary,
      exclusion_reasons: rejectionReasons,
    },
  },
  rows: sortedAcceptedRows,
};

fs.mkdirSync(QA_DIR, { recursive: true });
fs.mkdirSync(YEARLY_DIR, { recursive: true });
writePayload(OUTPUT_PATH, cleanPayload);

const allFields = buildFields([...sortedAcceptedRows, ...sortedRejectedRows]);
writeCsv(FULL_CSV_PATH, sortedAcceptedRows, allFields);
writeCsv(path.join(QA_DIR, 'excluded_from_clean_sales.csv'), sortedRejectedRows, allFields);
fs.writeFileSync(
  path.join(QA_DIR, 'clean_sales_acceptance_summary.json'),
  `${JSON.stringify(cleanPayload.metadata.sales_qa_summary, null, 2)}\n`,
);

for (const year of ['2021', '2022', '2023', '2024', '2025']) {
  const yearRows = sortedAcceptedRows.filter((row) => row.year === year);
  writeCsv(path.join(YEARLY_DIR, `sales_transactions_area_allocated_${year}_daily.csv`), yearRows, allFields);
}

console.log(JSON.stringify({
  accepted_clean_sales_rows: sortedAcceptedRows.length,
  excluded_rows: sortedRejectedRows.length,
  accepted_financials: Object.fromEntries(ADDITIVE_FIELDS.map((field) => [field, round2(acceptedSummary[field])])),
  by_year: acceptedSummary.by_year,
  qa_dir: path.relative(ROOT, QA_DIR),
}, null, 2));
