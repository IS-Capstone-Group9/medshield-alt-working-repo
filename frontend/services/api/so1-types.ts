export type So1FinancialSummary={gross_profit_php:number|null;margin_revenue_basis_php:number|null;margin_eligible_records:number;margin_pct:number|null;margin_record_coverage_pct:number|null;formula:string;scope:string}
export type So1Month = { period: string; revenue: number | null; records: number; eligible_records: number; adjusted_records: number;
  gross_profit_php?:number|null;margin_revenue_basis_php?:number|null;margin_eligible_records?:number;margin_pct?:number|null;margin_record_coverage_pct?:number|null }
export type So1Point = { period: string; observed: number; trend: number; seasonal: number; residual: number; scenario: string; comparison_segment: string }
type Description = { trend_direction: string; seasonal_peak_month: number }
type Comparison = { reference: Description; candidate: Description; normalized_trend_mae_pct: number | null; material_flags: string[] }
export type So1Comparison = { segment_id: string; area: string; start: string; end: string; months: number; days: number;
  assumed_zero_days: number; stress_uplift_pct: number; monthly_vs_daily: Comparison; zero_vs_missing_sale_stress: Comparison; monthly_fit_context_check: Comparison }
export type So1Response = {
  schema_version: 'medshield.so1.view.v1'; checksum: string; source_sha256: string;
  scope: { area: string; year: string; buyer_scope: string; independent_of_topbar: boolean; start: string; end: string;contracts_excluded?:boolean;geographic_approval?:string };
  options: { years: string[]; areas: { area: string; mapping: Record<string, string | null> | null }[] };
  release: { dataset_id: string; fact_delta_version: number; policy_version: string; financial_publication?: { publication_id: string } };
  source: { system_of_record: string; table: string; version: number; source_reconciled: boolean;
    financial?:{table:string;delta_version:number;policy:string;sql_sha256:string;rows_sha256:string;source_reconciled:boolean} };
  months: So1Month[]; components: So1Point[]; comparisons: So1Comparison[];
  yoy: { base_year: string; target_year: string; common_months: string[]; base_revenue: number | null; target_revenue: number | null; change: number | null; growth_pct: number | null }[];
  contributions?:{area:string;base_year:string;target_year:string;common_months:string[];base_revenue:number;target_revenue:number;change:number;company_change:number;missing_label_months:string[];basis:string}[];
  contribution_scope?:string;
  financial_summary?:So1FinancialSummary;
  financial_yoy?:{base_year:string;target_year:string;common_margin_months:string[];base:So1FinancialSummary;target:So1FinancialSummary;gross_profit_change_php:number|null}[];
  mapping: Record<string, string | null> | null;
  daily_months: { period: string; days: number; recorded_eligible_revenue?: number; assumed_zero_no_recorded_transaction?: number; unknown_whole_month?: number; unknown_ineligible_revenue?: number }[];
  limits: string[]; interpretation: string; candidate_status: string;
  protocol: { daily_period: number; monthly_period: number; hypothetical_blank_day_sales_fraction: string };
}
