export type DiagnosticScope = {
  start_date: string
  end_date: string
  product_id?: string | null
  area?: string | null
  sector?: string | null
  region?: string | null
  territory?: string | null
  category?: string | null
  label?: string
  expected_release?: Record<string, unknown>
}
export type DiagnosticFinancial = {
  revenue: number | null; income: number | null; margin_revenue_basis: number | null
  margin_pct: number | null; negative_sales: number | null; rows: number
  net_sales_eligible_rows: number; gross_margin_eligible_rows: number
  original_source_rows: number; adjusted_estimated_rows: number; unresolved_product_rows: number
}
export type DiagnosticContribution = {
  key: string; label: string; current: number | null; prior: number | null; delta: number | null
  contribution_pct: number | null; comparison_status: string; identity_status?: string
  current_financial: DiagnosticFinancial; prior_financial: DiagnosticFinancial
}
export type DiagnosticDimension = 'month' | 'product' | 'area' | 'sector'
export type SalesDiagnostics = {
  release: { dataset_id: string; fact_delta_version: number; policy_version: string; [key: string]: unknown }
  source: { system_of_record: string; [key: string]: unknown }
  scope: DiagnosticScope & { prior_start_date: string; prior_end_date: string }
  totals: { current: number | null; prior: number | null; delta: number | null; growth_pct: number | null
    comparison_status: string; matched_months: number; expected_months: number
    current_rows: number; prior_rows: number; current_eligible_rows: number; prior_eligible_rows: number
    current_financial: DiagnosticFinancial; prior_financial: DiagnosticFinancial }
  coverage: { missing_current_months: string[]; missing_prior_months: string[]; unmatched_months: string[]
    partial_boundary_months: string[]; coverage_status: string }
  contributions: Record<DiagnosticDimension, DiagnosticContribution[]> & { evidence?: DiagnosticContribution[] }
  causal_status: string
  limitations: string[]
}
