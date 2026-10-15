/** Shared analytical typography and bounded chart sizes, applied after the legacy skin. */
export const DESCRIPTIVE_CHART_STYLE = String.raw`
.chart-card .chart-header { gap: 10px 16px; align-items: flex-start; }
.chart-card .chart-title { margin: 0; line-height: 1.35; overflow-wrap: anywhere; }
.chart-card .chart-subtitle { line-height: 1.55; overflow-wrap: anywhere; }
.descriptive-measure-control { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; font-size: 12px; color: var(--text-secondary); }
.descriptive-measure-control select, .sales-measure-control select { max-width: 100%; min-width: 0; padding: 7px 9px; border: 1px solid var(--border-color, #cbd5e1); border-radius: 5px; background: var(--bg-card, white); color: var(--text-primary); font: inherit; }
.descriptive-measure-control select:focus-visible, .sales-measure-control select:focus-visible { outline: 3px solid #f1b84b; outline-offset: 2px; }
.descriptive-measure-control select:disabled, .sales-measure-control select:disabled { opacity: .65; }
#overviewTrendReading { margin-bottom: 12px; }
.chart-card .chart-method { margin-top: 12px; font-size: 12px; line-height: 1.6; color: var(--text-secondary); }
.chart-card .chart-method summary { cursor: pointer; font-weight: 600; color: var(--text-primary); }
.chart-card .chart-method p { margin: 10px 0; overflow-wrap: anywhere; }
.chart-card .chart-method .table-responsive-wrap { max-height: 320px; overflow: auto; }
#salesMovementCard { margin-bottom: 20px; }
#page-products .chart-grid-2 { align-items: start; }
.analytical-output-summary { padding: 16px 18px; margin: 0 0 20px; border: 1px solid #cbd9e6; border-left: 4px solid #1e3a5f; border-radius: 8px; background: #f5f9fc; }
.analytical-output-takeaway, .analytical-finding { font-size: 14px; font-weight: 600; line-height: 1.6; color: var(--text-primary); overflow-wrap: anywhere; }
.analytical-output-scope, .analytical-output-review, .analytical-review-prompt { font-size: 12px; line-height: 1.6; color: var(--text-secondary); margin-top: 6px; overflow-wrap: anywhere; }
.analytical-output-notes { margin-top: 10px; font-size: 12px; line-height: 1.6; color: var(--text-secondary); }
.analytical-output-notes summary { cursor: pointer; font-weight: 600; }
.analytical-output-notes p { margin-top: 8px; }
#page-overview .overview-decision-kpis { grid-template-columns: repeat(4, minmax(0, 1fr)); }
#page-overview .overview-decision-kpis .kpi-card { min-width: 0; min-height: 0; justify-content: flex-start; gap: 6px; padding: 16px 18px !important; }
#page-overview .overview-decision-kpis .kpi-card-header { margin-bottom: 0; }
#page-overview .overview-decision-kpis .overview-kpi-note { margin-top: 2px; }
#page-overview .overview-decision-kpis .kpi-label { font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
#page-overview .overview-decision-kpis .kpi-value { font-size: clamp(22px, 2.1vw, 30px); line-height: 1.3; overflow-wrap: anywhere; }
.overview-kpi-note { font-size: 11px; line-height: 1.6; color: var(--text-secondary); margin-top: 10px; overflow-wrap: anywhere; }
.overview-publication-strip { display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px 24px; padding: 12px 16px; border: 1px solid var(--border-color, #dce4ec); border-radius: 8px; font-size: 11px; line-height: 1.6; margin-bottom: 16px; background: white; }
.overview-publication-strip details { flex: 1 0 100%; }
.overview-publication-strip summary { cursor: pointer; }
.overview-publication-strip details p { margin-top: 8px; max-width: 100ch; }
#page-products .product-analytical-layout { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 20px; align-items: start; margin-bottom: 20px; }
#page-products .product-analytical-layout > .chart-card { min-width: 0; margin: 0; }
#page-products .product-abc-stack { display: grid; gap: 20px; min-width: 0; }
#page-products .product-abc-stack > .chart-card { min-width: 0; margin: 0; }
#page-products .product-abc-stack .chart-wrap { height: 220px !important; min-height: 0 !important; }
#page-products .product-catalog-evidence { min-width: 160px; max-width: 280px; white-space: normal; font-size: 11px; line-height: 1.6; }
#page-products .product-catalog-evidence summary { cursor: pointer; font-weight: 600; }
#page-products .product-catalog-evidence dl, #page-products .product-catalog-evidence p { overflow-wrap: anywhere; }
#page-products .product-catalog-evidence dl { margin-top: 8px; max-height: 240px; overflow: auto; }
#page-products .product-catalog-evidence dt { font-weight: 600; }
#page-products .product-catalog-evidence dd { margin: 0 0 6px; }
.sales-output-nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; padding: 8px; border: 1px solid #dce4ec; border-radius: 8px; background: white; }
.sales-output-nav button { flex: 1 1 120px; border: 1px solid transparent; background: transparent; padding: 10px 14px; border-radius: 5px; font: inherit; font-size: 12px; font-weight: 600; color: var(--text-secondary); cursor: pointer; }
.sales-output-nav button[aria-selected="true"] { background: #1e3a5f; color: white; }
.sales-output-nav button:focus-visible { outline: 3px solid #f1b84b; outline-offset: 2px; }
#salesOutputScope { margin: 0 0 16px; }
#salesOutputSections [data-sales-output-panel][hidden] { display: none !important; }
.sales-output-heading { font-size: 16px; margin: 0 0 4px; }
.sales-output-description { font-size: 12px; line-height: 1.6; color: var(--text-secondary); margin: 0 0 16px; }
#salesOutputSections [data-sales-output-panel] { min-width: 0; }
#salesMovementCard .descriptive-movement-wrap { height: 280px !important; min-width: 0; }
#page-revenue #revenueDetailChart, #page-revenue #quantityTrendChart { max-width: 100%; }
#descriptiveStlPanel h2 { font-size: 16px; line-height: 1.4; margin-bottom: 8px; }
#descriptiveStlPanel h3 { font-size: 13px; margin: 18px 0 4px; }
#descriptiveStlPanel .stl-trend-wrap { height: 300px !important; }
#descriptiveStlPanel .stl-component-wrap { height: 230px !important; }
#descriptiveStlPanel > p { font-size: 12px; line-height: 1.6; }
@media (max-width: 1100px) {
  #page-overview .overview-decision-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  #page-products .product-analytical-layout { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 600px) {
  #page-overview .overview-decision-kpis { grid-template-columns: minmax(0, 1fr); }
  .analytical-output-summary { padding: 14px; }
  #salesMovementCard .descriptive-movement-wrap { height: 250px !important; }
  #descriptiveStlPanel .stl-trend-wrap { height: 270px !important; }
  #descriptiveStlPanel .stl-component-wrap { height: 220px !important; }
  .chart-card .chart-method { font-size: 11px; }
  #page-revenue [data-sales-heatmap] label, #page-revenue [data-sales-heatmap] select { min-width: 0; max-width: 100% !important; }
}
`
