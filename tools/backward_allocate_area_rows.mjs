import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const INPUT_PATH = path.join(
  ROOT,
  "data",
  "medshield",
  "processed",
  "sales_transactions.json.gz",
);
const OUTPUT_PATH = path.join(
  ROOT,
  "data",
  "medshield",
  "processed",
  "sales_transactions_area_allocated.json.gz",
);
const AUDIT_PATH = path.join(
  ROOT,
  "data",
  "medshield",
  "processed",
  "sales_area_allocation_audit.json",
);

const AREA_LABELS = new Map([
  ["ABOITIZ", "Aboitiz"],
  ["GULANG GULANG", "Gulang Gulang"],
  ["MARINDUQUE", "Marinduque"],
  ["PADRE BURGOS", "Padre Burgos"],
  ["PAGBILAO", "Pagbilao"],
  ["PESO", "PESO"],
  ["PESO PROVINCIAL", "PESO Provincial"],
  ["PHO", "PHO"],
  ["PPDC", "PPDC"],
  ["PPOC", "PPOC"],
  ["PROVINCIAL TOURISM OFFICE", "Provincial Tourism Office"],
  ["QMC", "QMC"],
  ["TOURISM", "Tourism"],
]);

const ADDITIVE_FIELDS = [
  ["quantity", 6],
  ["total_cost", 2],
  ["discount", 2],
  ["net_cost", 2],
  ["total_trade_price", 2],
  ["net_income", 2],
];

function readDataset() {
  return JSON.parse(zlib.gunzipSync(fs.readFileSync(INPUT_PATH)).toString("utf8"));
}

function sourceYear(row) {
  if (
    row.year !== null &&
    row.year !== undefined &&
    String(row.year).trim() !== "" &&
    Number.isFinite(Number(row.year))
  ) {
    return Number(row.year);
  }
  const match = String(row.source_workbook ?? "").match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function dateTime(row) {
  const value = Date.parse(row.date_delivered);
  return Number.isFinite(value) ? value : null;
}

function channel(drNumber) {
  const normalized = String(drNumber ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/^DR([A-Z]+)/);
  return match ? match[1].slice(0, 2) : "UNKNOWN";
}

function parseAreaSummary(row) {
  const product = String(row.product ?? "").trim();
  const separator = product.indexOf("#");
  if (separator < 1) {
    return null;
  }

  const rawLabel = product.slice(0, separator).trim().toUpperCase();
  const canonicalLabel = AREA_LABELS.get(rawLabel);
  if (!canonicalLabel) {
    return null;
  }

  const amountMatch = product
    .slice(separator + 1)
    .match(/(?:A-\s*)?([\d,]+(?:\.\d+)?)/i);

  return {
    rawLabel,
    canonicalLabel,
    embeddedAmount: amountMatch
      ? Number(amountMatch[1].replaceAll(",", ""))
      : null,
  };
}

function buildCandidatePool(rows, targetIndexes) {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row, index }) =>
        !targetIndexes.has(index) &&
        String(row.product ?? "").trim() &&
        ["valid", "warning"].includes(row.quality_status) &&
        !row.duplicate,
    );
}

function isPriorCandidate(candidate, target) {
  const candidateYear = sourceYear(candidate);
  const targetYear = sourceYear(target);
  const candidateDate = dateTime(candidate);
  const targetDate = dateTime(target);

  if (candidateYear === null || targetYear === null || candidateYear > targetYear) {
    return false;
  }

  if (targetDate !== null && candidateDate !== null) {
    if (candidateDate >= targetDate) {
      return false;
    }
    return targetDate - candidateDate <= 3 * 365.25 * 24 * 60 * 60 * 1000;
  }

  // Invalid/missing target dates are restricted to earlier source years.
  return candidateYear < targetYear;
}

function aggregateProfile(candidates, targetDate, level) {
  const products = new Map();

  for (const { row } of candidates) {
    const product = String(row.product).trim();
    const candidateDate = dateTime(row);
    const value = Math.abs(
      Number(row.net_cost) ||
        Number(row.total_cost) ||
        Number(row.total_trade_price) ||
        0,
    );
    const recencyWeight =
      targetDate !== null && candidateDate !== null
        ? Math.max(
            0.05,
            Math.exp(
              -(targetDate - candidateDate) /
                (365.25 * 24 * 60 * 60 * 1000),
            ),
          )
        : 1;

    const current = products.get(product) ?? {
      product,
      weightedValue: 0,
      weightedFrequency: 0,
      rowCount: 0,
    };
    current.weightedValue += Math.log1p(value) * recencyWeight;
    current.weightedFrequency += recencyWeight;
    current.rowCount += 1;
    products.set(product, current);
  }

  const profile = [...products.values()];
  const totalValue =
    profile.reduce((sum, item) => sum + item.weightedValue, 0) || 1;
  const totalFrequency =
    profile.reduce((sum, item) => sum + item.weightedFrequency, 0) || 1;

  for (const item of profile) {
    item.score =
      0.65 * (item.weightedValue / totalValue) +
      0.35 * (item.weightedFrequency / totalFrequency);
  }

  profile.sort(
    (left, right) =>
      right.score - left.score || left.product.localeCompare(right.product),
  );

  return {
    level,
    poolRows: candidates.length,
    poolProducts: profile.length,
    profile: profile.slice(0, 30),
  };
}

function selectProfile(target, candidates) {
  const targetArea = String(target.area ?? "");
  const targetChannel = channel(target.dr_number);
  const targetDate = dateTime(target);
  const prior = candidates.filter(({ row }) => isPriorCandidate(row, target));

  const levels = [
    {
      name: "same_area_same_channel_prior_3y",
      predicate: ({ row }) =>
        String(row.area ?? "") === targetArea &&
        channel(row.dr_number) === targetChannel,
    },
    {
      name: "same_area_prior_3y",
      predicate: ({ row }) => String(row.area ?? "") === targetArea,
    },
    {
      name: "same_channel_prior_3y",
      predicate: ({ row }) => channel(row.dr_number) === targetChannel,
    },
    {
      name: "all_prior_history",
      predicate: () => true,
    },
  ];

  for (const level of levels) {
    const matches = prior.filter(level.predicate);
    if (new Set(matches.map(({ row }) => row.product)).size >= 5) {
      return aggregateProfile(matches, targetDate, level.name);
    }
  }

  throw new Error(
    `No sufficient prior product profile for ${target.source_workbook}:${target.source_row_number}`,
  );
}

function stableUnit(seed, product) {
  const digest = crypto
    .createHash("sha256")
    .update(`${seed}|${product}`)
    .digest();
  const integer = digest.readUInt32BE(0);
  return (integer + 1) / (0xffffffff + 2);
}

function selectProducts(profile, seed, count = 5) {
  const selected = profile
    .map((item) => ({
      ...item,
      selectionKey: -Math.log(stableUnit(seed, item.product)) / item.score,
    }))
    .sort(
      (left, right) =>
        left.selectionKey - right.selectionKey ||
        left.product.localeCompare(right.product),
    )
    .slice(0, Math.min(count, profile.length));

  const scoreTotal = selected.reduce((sum, item) => sum + item.score, 0) || 1;
  return selected.map((item) => ({
    ...item,
    weight: item.score / scoreTotal,
  }));
}

function allocateExact(value, weights, decimals) {
  const numericValue = Number(value) || 0;
  const scale = 10 ** decimals;
  const totalUnits = Math.round(numericValue * scale);
  const sign = totalUnits < 0 ? -1 : 1;
  const absoluteUnits = Math.abs(totalUnits);

  const allocations = weights.map((weight, index) => {
    const raw = absoluteUnits * weight;
    const base = Math.floor(raw);
    return { index, units: base, remainder: raw - base };
  });

  let unitsLeft =
    absoluteUnits - allocations.reduce((sum, item) => sum + item.units, 0);
  allocations
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    )
    .slice(0, unitsLeft)
    .forEach((item) => {
      item.units += 1;
      unitsLeft -= 1;
    });

  return allocations
    .sort((left, right) => left.index - right.index)
    .map((item) => (sign * item.units) / scale);
}

function sumFields(rows) {
  const totals = {};
  for (const [field] of ADDITIVE_FIELDS) {
    totals[field] = rows.reduce(
      (sum, row) => sum + (Number(row[field]) || 0),
      0,
    );
  }
  return totals;
}

function roundedDelta(left, right, decimals) {
  const scale = 10 ** decimals;
  return Math.round((left - right) * scale) / scale;
}

function assertParentReconciliation(parent, children) {
  for (const [field, decimals] of ADDITIVE_FIELDS) {
    const scale = 10 ** decimals;
    const parentUnits = Math.round((Number(parent[field]) || 0) * scale);
    const childUnits = Math.round(
      children.reduce((sum, child) => sum + (Number(child[field]) || 0), 0) *
        scale,
    );
    if (parentUnits !== childUnits) {
      throw new Error(
        `Parent reconciliation failed for ${parent.source_workbook}:${parent.source_row_number} field ${field}`,
      );
    }
  }
}

function allocateRow(parent, parsedArea, profileResult) {
  const seed =
    parent.source_hash ??
    `${parent.source_workbook}|${parent.source_row_number}|${parent.product}`;
  const products = selectProducts(profileResult.profile, seed);
  const weights = products.map((item) => item.weight);
  const allocations = Object.fromEntries(
    ADDITIVE_FIELDS.map(([field, decimals]) => [
      field,
      allocateExact(parent[field], weights, decimals),
    ]),
  );
  const embeddedAllocations =
    parsedArea.embeddedAmount === null
      ? products.map(() => null)
      : allocateExact(parsedArea.embeddedAmount, weights, 2);

  const children = products.map((item, childIndex) => {
    const child = {
      ...parent,
      area: parsedArea.canonicalLabel,
      product: item.product,
      quantity: allocations.quantity[childIndex],
      total_cost: allocations.total_cost[childIndex],
      discount: allocations.discount[childIndex],
      net_cost: allocations.net_cost[childIndex],
      total_trade_price: allocations.total_trade_price[childIndex],
      net_income: allocations.net_income[childIndex],
      allocation_status: "estimated_backward_allocation",
      allocation_confidence:
        profileResult.poolProducts >= 100 ? "medium" : "low",
      allocation_method:
        "prior_comparable_product_mix_value_frequency_blend",
      allocation_profile_level: profileResult.level,
      allocation_profile_rows: profileResult.poolRows,
      allocation_profile_products: profileResult.poolProducts,
      allocation_weight: item.weight,
      allocation_child_number: childIndex + 1,
      allocation_child_count: products.length,
      original_area: parent.area,
      original_product: parent.product,
      embedded_area_amount: parsedArea.embeddedAmount,
      allocated_embedded_area_amount: embeddedAllocations[childIndex],
      parent_source_hash: parent.source_hash,
      parent_business_hash: parent.business_hash,
      estimated: true,
    };

    child.unit_cost =
      child.quantity === 0 ? 0 : child.total_cost / child.quantity;
    child.trade_price_unit =
      child.quantity === 0 ? 0 : child.total_trade_price / child.quantity;
    child.margin_pct =
      child.net_cost === 0 ? 0 : child.net_income / child.net_cost;
    child.source_hash = crypto
      .createHash("sha256")
      .update(`${seed}|allocation|${childIndex + 1}|${item.product}`)
      .digest("hex");
    child.business_hash = crypto
      .createHash("sha256")
      .update(
        [
          child.area,
          child.dr_number,
          child.date_delivered,
          child.product,
          child.quantity,
          child.net_cost,
          child.total_trade_price,
        ].join("|"),
      )
      .digest("hex");
    child.standardization_applied = [
      ...(Array.isArray(parent.standardization_applied)
        ? parent.standardization_applied
        : []),
      `area summary "${parent.product}" backward-allocated without changing additive totals`,
    ];

    return child;
  });

  assertParentReconciliation(parent, children);
  return children;
}

function main() {
  const dataset = readDataset();
  const targets = dataset.rows
    .map((row, index) => ({ row, index, parsed: parseAreaSummary(row) }))
    .filter(({ parsed }) => parsed !== null);
  const targetIndexes = new Set(targets.map(({ index }) => index));
  const candidates = buildCandidatePool(dataset.rows, targetIndexes);
  const targetMap = new Map(targets.map((target) => [target.index, target]));
  const adjustedRows = [];
  const allocationAudit = [];

  for (let index = 0; index < dataset.rows.length; index += 1) {
    const target = targetMap.get(index);
    if (!target) {
      adjustedRows.push(dataset.rows[index]);
      continue;
    }

    const profileResult = selectProfile(target.row, candidates);
    const children = allocateRow(target.row, target.parsed, profileResult);
    adjustedRows.push(...children);
    allocationAudit.push({
      area_label: target.parsed.canonicalLabel,
      original_area: target.row.area,
      original_product: target.row.product,
      embedded_area_amount: target.parsed.embeddedAmount,
      source_workbook: target.row.source_workbook,
      source_row_number: target.row.source_row_number,
      dr_number: target.row.dr_number,
      date_delivered: target.row.date_delivered,
      original_quality_status: target.row.quality_status,
      allocation_profile_level: profileResult.level,
      allocation_profile_rows: profileResult.poolRows,
      allocation_profile_products: profileResult.poolProducts,
      allocated_products: children.map((child) => ({
        product: child.product,
        weight: child.allocation_weight,
        quantity: child.quantity,
        net_cost: child.net_cost,
        total_trade_price: child.total_trade_price,
        net_income: child.net_income,
        allocated_embedded_area_amount:
          child.allocated_embedded_area_amount,
      })),
    });
  }

  const originalTotals = sumFields(dataset.rows);
  const adjustedTotals = sumFields(adjustedRows);
  const reconciliation = Object.fromEntries(
    ADDITIVE_FIELDS.map(([field, decimals]) => [
      field,
      {
        original: originalTotals[field],
        adjusted: adjustedTotals[field],
        delta: roundedDelta(adjustedTotals[field], originalTotals[field], decimals),
      },
    ]),
  );
  const failedFields = Object.entries(reconciliation).filter(
    ([, result]) => result.delta !== 0,
  );
  if (failedFields.length > 0) {
    throw new Error(
      `Overall reconciliation failed: ${failedFields
        .map(([field, result]) => `${field}=${result.delta}`)
        .join(", ")}`,
    );
  }

  const output = {
    metadata: {
      ...dataset.metadata,
      dataset_name: `${dataset.metadata.dataset_name} - Area Summary Backward Allocation`,
      source_dataset: path.relative(ROOT, INPUT_PATH).replaceAll("\\", "/"),
      transformation:
        "Recognized area-summary rows were replaced with deterministic product-level estimates using only prior comparable transactions.",
      generated_at: new Date().toISOString(),
      area_summary_rows_replaced: targets.length,
      estimated_child_rows_created: adjustedRows.length - dataset.rows.length + targets.length,
      original_row_count: dataset.rows.length,
      adjusted_row_count: adjustedRows.length,
      reconciliation,
      warnings: [
        "Estimated products are planning approximations, not recovered invoice facts.",
        "The source dataset was not modified.",
        "All additive quantity and financial totals reconcile exactly at their stored precision.",
      ],
    },
    rows: adjustedRows,
  };

  fs.writeFileSync(OUTPUT_PATH, zlib.gzipSync(JSON.stringify(output)));
  fs.writeFileSync(
    AUDIT_PATH,
    JSON.stringify(
      {
        metadata: output.metadata,
        allocations: allocationAudit,
      },
      null,
      2,
    ),
  );

  console.log(
    JSON.stringify(
      {
        output: path.relative(ROOT, OUTPUT_PATH),
        audit: path.relative(ROOT, AUDIT_PATH),
        areaSummaryRowsReplaced: targets.length,
        originalRowCount: dataset.rows.length,
        adjustedRowCount: adjustedRows.length,
        reconciliation,
      },
      null,
      2,
    ),
  );
}

main();
