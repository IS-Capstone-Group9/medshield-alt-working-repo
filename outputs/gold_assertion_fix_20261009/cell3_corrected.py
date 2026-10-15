# Cell 3 — Keep one fact per accepted source record and govern each metric separately.
def has_rule(code):
    return F.coalesce(F.array_contains(F.col("quality_rule_codes"), code), F.lit(False))


fact = (
    clean
    .join(
        manifest.select("source_workbook", "source_data_status", "source_adjustment_policy"),
        "source_workbook",
        "left",
    )
    .withColumn("sales_fact_id", F.col("source_record_id"))
    .withColumn("normalized_product", F.upper(F.trim(F.regexp_replace("product", r"\s+", " "))))
    .withColumn("normalized_area", F.upper(F.trim(F.regexp_replace("area", r"\s+", " "))))
    .join(product_reference, "normalized_product", "left")
    .join(product_policy, "normalized_product", "left")
    .join(area_policy, "normalized_area", "left")
    .join(transaction_policy, "source_record_id", "left")
    .withColumn("product_key", F.sha2("normalized_product", 256))
    .withColumn("area_key", F.sha2("normalized_area", 256))
    .withColumn("date_key", F.date_format("date_delivered", "yyyyMMdd").cast("int"))
    .withColumn("month_start", F.trunc("date_delivered", "month").cast("date"))
    .withColumn("calendar_year", F.year("date_delivered"))
    .withColumn("is_contract_label", F.col("normalized_product").rlike(CONTRACT_PREFIX_PATTERN))
    .withColumn("is_adjusted_source", F.col("source_data_status") != "ORIGINAL_SOURCE_EXPORT")
    .withColumn("resolution_policy", F.lit(catalog["RESOLUTION_POLICY"]))
    .withColumn("transaction_evidence_sha256", F.lit(TRANSACTION_EVIDENCE_SHA256))
    .withColumn("catalog_helper_sha256", F.lit(CATALOG_HELPER_SHA256))
    .withColumn("is_low_trust_2017", (F.col("calendar_year") == 2017) | (F.col("data_source_year") == 2017))
    .withColumn("is_historical_backfill_candidate", F.col("disposition") == "KEEP_HISTORICAL_BACKFILL_CANDIDATE")
    .withColumn("is_product_ranking_candidate", F.col("product_scope_status").isin(
        "PRODUCT_MASTER_PENDING", "NONMEDICAL_REFERENCE_REQUIRES_REVIEW",
        "MEDICINE_APPROVED", "MEDICAL_SUPPLY_APPROVED", "MEDICAL_EQUIPMENT_APPROVED", "NON_MEDICAL_APPROVED"))
    .withColumn("is_quantity_observation_eligible", F.col("quantity").isNotNull()
        & ~has_rule("2017_QUANTITY_CANDIDATES_DISAGREE") & ~has_rule("INVALID_OR_MISSING_QUANTITY"))
    .withColumn("is_gross_sales_eligible", F.col("gross_sales").isNotNull() & ~has_rule("GROSS_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_net_sales_eligible", F.col("net_sales").isNotNull() & ~has_rule("NET_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_acquisition_cost_eligible", F.col("total_acquisition_cost").isNotNull() & ~has_rule("TRANSFER_VALUE_FORMULA_MISMATCH"))
    .withColumn("is_gross_margin_eligible", F.col("gross_margin_amount").isNotNull()
        & F.col("is_net_sales_eligible") & F.col("is_acquisition_cost_eligible") & ~has_rule("GROSS_MARGIN_FORMULA_MISMATCH"))
    .withColumn("is_positive_delivery_quantity_eligible", F.col("is_quantity_observation_eligible")
        & (F.col("quantity") > 0) & F.col("is_product_ranking_candidate") & (F.col("item_kind") != "service"))
    .withColumn("is_return_quantity_eligible", F.col("is_quantity_observation_eligible") & (F.col("quantity") < 0))
    .withColumn("return_quantity_abs", F.when(F.col("is_return_quantity_eligible"), F.abs("quantity")))
    .withColumn("is_provisional_product_demand_eligible", F.col("is_positive_delivery_quantity_eligible")
        & (F.col("product_scope_status") == "PRODUCT_MASTER_PENDING")
        & ~F.col("is_low_trust_2017") & ~F.col("is_historical_backfill_candidate"))
    .withColumn("is_approved_medical_demand_eligible", F.col("is_positive_delivery_quantity_eligible")
        & F.col("is_medical_product_approved")
        & F.col("transaction_evidence").isin("original_source_detail", "independently_verified_detail")
        & (F.col("item_kind") == "physical_product") & (F.col("identity_status") == "approved")
        & ~F.col("is_low_trust_2017")
        & ~F.col("is_historical_backfill_candidate"))
    .withColumn("is_external_analysis_candidate", F.col("is_approved_medical_demand_eligible")
        & F.col("is_external_geography_candidate"))
    .withColumn("external_join_status", F.lit("STATION_DISEASE_GEOGRAPHY_AND_PERIOD_COVERAGE_NOT_VALIDATED"))
    .withColumn("is_external_join_ready", F.lit(False))
    .withColumn("financial_review_required", F.col("net_sales").isNull() | (F.col("net_sales") <= 0)
        | ~F.col("is_net_sales_eligible"))
    .withColumn("transaction_quantity_status", F.when(F.col("quantity").isNull(), "MISSING_QUANTITY")
        .when(F.col("quantity") < 0, "RETURN_OR_CREDIT_CANDIDATE")
        .when(F.col("quantity") == 0, "ZERO_REPORTED_QUANTITY").otherwise("POSITIVE_REPORTED_QUANTITY"))
    .withColumn("contract_prefix", F.when(F.col("is_contract_label"), F.trim(F.regexp_extract("normalized_product", r"^([^#]+)\s*#", 1))))
    .withColumn("contract_label_group_key", F.when(F.col("is_contract_label"), F.sha2("normalized_product", 256)))
    .withColumn("product_reference_sha256", F.lit(REFERENCE_SHA256))
    .withColumn("publication_status", F.lit(PUBLICATION_STATUS))
    .withColumn("policy_version", F.lit(POLICY_VERSION))
)
# Catalog-only migration uses the same reviewed contract as packaging and validation.
assert catalog_contract["proposed"] == {
    "product_master_sha256": PRODUCT_MASTER_SHA256,
    "transaction_evidence_sha256": TRANSACTION_EVIDENCE_SHA256,
    "catalog_helper_sha256": CATALOG_HELPER_SHA256,
    "area_mapping_sha256": AREA_MAPPING_SHA256,
}, "Reference bytes changed since contract preparation"
catalog_base = spark.sql(f"SELECT * FROM {GOLD_SCHEMA}.sales_restart_fact_candidate VERSION AS OF {catalog_contract['baseline_fact_version']}")
assert dataset_of(catalog_base, "catalog predecessor") == DATASET_ID, "Catalog predecessor dataset differs from current source"
assert set(catalog_base.columns) == set(catalog_contract["predecessor_columns"]), "Predecessor schema changed"
catalog_identity = catalog_base.select(*catalog_contract["baseline_identity"]).distinct().collect()
assert len(catalog_identity) == 1 and catalog_identity[0].asDict() == catalog_contract["baseline_identity"], "Predecessor identity changed"
same_keys(catalog_base, fact, ["source_record_id"], "Catalog migration cannot add/delete transactions")
if category_decisions is not None:
    assert set(category_decisions) == product_labels, "Acceptance must exactly cover predecessor/product labels"
    # Reporting categories cannot change measured quantities or any demand gate.
    # Retain these predecessor gates before rebuilding the analytical marts.
    preserved_demand = publication_contract_api["PRESERVED_DEMAND_FIELDS"]
    retained = catalog_base.select("source_record_id", *[F.col(name).alias("preserved_" + name) for name in preserved_demand])
    fact = fact.join(retained, "source_record_id", "inner")
    for name in preserved_demand:
        fact = fact.withColumn(name, F.col("preserved_" + name)).drop("preserved_" + name)
    expected_rows = []
    predecessor_labels = catalog_base.select("normalized_product", "product_scope_status", "is_contract_label").distinct().collect()
    assert len(predecessor_labels) == len(product_labels), "Predecessor contains conflicting label scopes"
    for row in predecessor_labels:
        expected = publication_contract_api["expected_category_metadata"](row.asDict(), category_decisions[row["normalized_product"]])
        expected_rows.append({"normalized_product": row["normalized_product"], **{"expected_" + key: value for key, value in expected.items()}})
    expected_policy = spark.createDataFrame(expected_rows)
    checked = fact.join(expected_policy, "normalized_product", "inner")
    same_keys(fact, checked, ["source_record_id"], "Category comparison omitted a fact")
    for name in ("product_category", "category_status", "display_category", "product_scope_status", "catalog_evidence_source"):
        assert checked.filter(~F.col(name).eqNullSafe(F.col("expected_" + name))).limit(1).count() == 0, "Unexpected calculated category transition: " + name
catalog_compare = (fact.withColumn("area_mapping_sha256", F.lit(AREA_MAPPING_SHA256))
    .withColumn("product_master_sha256", F.lit(PRODUCT_MASTER_SHA256))
    .withColumn("medical_supplies_in_scope", F.lit(INCLUDE_MEDICAL_SUPPLIES))
    .withColumn("gold_published_at", F.current_timestamp()))
assert set(catalog_compare.columns) == set(catalog_base.columns), "Catalog publication cannot add or remove fact columns"
assert {f.name: f.dataType for f in catalog_compare.schema} == {f.name: f.dataType for f in catalog_base.schema}, "Fact field types changed"
catalog_preserved_fields = catalog_contract["immutable_fields"]
assert [(f.name, f.dataType) for f in catalog_base.select(*catalog_preserved_fields).schema] == [(f.name, f.dataType) for f in catalog_compare.select(*catalog_preserved_fields).schema], "Immutable field types changed"
assert catalog_base.select(*catalog_preserved_fields).exceptAll(catalog_compare.select(*catalog_preserved_fields)).limit(1).count() == 0, "Immutable source/financial/catalog contract changed"
assert catalog_compare.select(*catalog_preserved_fields).exceptAll(catalog_base.select(*catalog_preserved_fields)).limit(1).count() == 0, "Immutable source/financial/catalog contract changed"
assert_unique(fact, ["sales_fact_id"], "Gold fact")
same_keys(clean, fact, ["source_record_id"], "Gold must preserve exactly the Silver survivors")
eligibility_nulls = F.lit(False)
for column in fact.columns:
    if column.startswith("is_"):
        eligibility_nulls = eligibility_nulls | F.col(column).isNull()
assert fact.filter(eligibility_nulls).limit(1).count() == 0, "Gold eligibility flags must not be null"
assert fact.filter(
    (F.col("data_source_year") == 2025) & F.col("is_contract_label")
).limit(1).count() == 0, "The reviewed 2025 replacement must contain zero contract-parent labels."
assert fact.filter(
    (F.col("data_source_year") == 2025) & ~F.col("is_adjusted_source")
).limit(1).count() == 0, "The adjusted-source provenance flag is missing from 2025 facts."
assert fact.filter("is_approved_medical_demand_eligible = true").filter(
    ~F.col("is_medical_product_approved") | F.col("is_contract_label")
    | (F.col("transaction_evidence") == "adjusted_estimated_source") | (F.col("item_kind") != "physical_product")
    | F.col("canonical_sku").isNull() | F.col("unit_of_measure").isNull()
    | F.col("is_low_trust_2017") | F.col("is_historical_backfill_candidate")
    | (F.col("quantity") <= 0)
).count() == 0, "Approved medical demand contains an ineligible source, identity or quantity"
# Category-only publication retains the predecessor demand gates exactly. Validate
# their original scope here; accepted reporting scope is checked against the receipt.
# Ordinary/draft runs still require the current PRODUCT_MASTER_PENDING scope.
provisional_demand_guard = catalog_base if category_decisions is not None else fact
assert provisional_demand_guard.filter("is_provisional_product_demand_eligible = true").filter(
    F.col("is_low_trust_2017") | F.col("is_historical_backfill_candidate")
    | (F.col("product_scope_status") != "PRODUCT_MASTER_PENDING") | (F.col("quantity") <= 0)
).count() == 0, "Provisional demand eligibility conflicts with its original scope, trust status or quantity"
display(fact.groupBy("product_scope_status", "transaction_quantity_status").count().orderBy("product_scope_status"))
