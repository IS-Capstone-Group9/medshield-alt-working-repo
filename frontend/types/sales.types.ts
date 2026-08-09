export type SalesTransaction = {
  year: number | null
  area: string | null
  dr_number: string | null
  date_delivered: string | null
  product: string | null
  quantity: number
  unit_cost: number
  total_cost: number
  discount: number
  net_cost: number
  trade_price_unit: number
  total_trade_price: number
  net_income: number
  margin_pct: number
  quality_status: 'valid' | 'warning' | 'rejected'
  quality_notes: string
  source_sheet: string
  source_row_number: number
}

export type SalesDatasetStatus = {
  dataset_name: string
  source_file: string
  checksum: string
  received_at: string
  cleaning_status: string
  quality_summary: {
    input_stage: string
    rows_extracted: number
    rows_accepted: number
    rows_rejected: number
    rows_with_warnings: number
    duplicate_rows: number
    valid_rows: number
    years: Record<string, number>
    source_period_start: string | null
    source_period_end: string | null
    standardizations: Record<string, number>
    issues: Record<string, number>
    columns_received: string[]
    unique_products?: number
    unique_dr_numbers?: number
    sku_count?: number
    merge_strategy?: string
    merged_years?: string[]
  }
  canonical_columns: string[]
}

export type SalesPage = {
  metadata: SalesDatasetStatus
  rows: SalesTransaction[]
  pagination: {
    page: number
    page_size: number
    page_count: number
    total_rows: number
  }
  filters: {
    year: string
    search: string
    quality_status: string
  }
}

export type SalesSummary = {
  sums: {
    quantity?: number
    total_cost?: number
    net_cost?: number
    total_trade_price?: number
    net_income?: number
  }
  averages: {
    quantity?: number
    unit_cost?: number
    net_income?: number
    margin_pct?: number
  }
  counts: {
    rows?: number
    accepted_rows?: number
    sku_count?: number
    unique_dr_numbers?: number
  }
  top: {
    area?: string
    product?: string
  }
}

export type SalesUploadResult = {
  dataset: {
    file_name: string
    input_stage: string
    cleaning_status: string
    checksum: string
  }
  quality: SalesDatasetStatus['quality_summary']
  persistence: {
    local: {
      persisted: boolean
      path: string
      merge_strategy?: string
      years_replaced?: string[]
      total_rows?: number
    }
    warehouse: { configured: boolean; persisted: boolean; message?: string; pipeline_run_key?: number }
  }
}
