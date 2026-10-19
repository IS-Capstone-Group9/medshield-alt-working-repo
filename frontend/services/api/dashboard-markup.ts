export const SALES_DATA_NAV_ITEM = `
  <div class="nav-item" id="salesDataNavItem" data-dashboard-page="sales-data" aria-label="View Sales Data" role="button" tabindex="0">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 5h16v14H4z"/><path d="M4 10h16M9 5v14"/>
    </svg>
    <span class="nav-label">View Sales Data</span>
  </div>
`

export const WEATHER_VALIDATION_NAV_ITEM = `
  <div class="nav-item" id="weatherValidationNavItem" data-dashboard-page="weather-validation" aria-label="Weather API Validation" role="button" tabindex="0">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 14a8 8 0 0 1 16 0"/><path d="M7 14h10"/><path d="M8 18h8"/><path d="M12 6v3"/>
    </svg>
    <span class="nav-label">Weather API Validation</span>
  </div>
`

export const SALES_DATA_PAGE = `
  <div class="page fade-in" id="page-sales-data">
    <section class="uploaded-data-panel" aria-labelledby="salesDataTitle">
      <div class="uploaded-data-header">
        <div>
          <h2 class="uploaded-data-title" id="salesDataTitle">Sales transactions</h2>
          <p class="uploaded-data-copy">Read-only records from Databricks Gold. Search and filter to inspect a smaller set.</p>
        </div>
        <div class="sales-header-actions">
          <span class="mini-badge" id="salesDatasetBadge">Loading dataset…</span>
          <button class="sales-secondary-button" id="salesDataRefresh" type="button">Refresh</button>
        </div>
      </div>
      <div class="uploaded-data-toolbar sales-filter-toolbar">
        <div class="uploaded-data-field uploaded-data-search"><label for="salesDataSearch">Search transactions</label><input id="salesDataSearch" type="search" placeholder="Product, area or DR number" /></div>
        <div class="uploaded-data-field"><label for="salesDataYear">Year</label><select id="salesDataYear"><option value="all">All Years</option></select></div>
        <div class="uploaded-data-field"><label for="salesDataQuality">Quality</label><select id="salesDataQuality"><option value="all">All Rows</option><option value="valid">Valid</option><option value="warning">Warning</option><option value="rejected">Rejected</option></select></div>
        <button class="sales-secondary-button" id="salesDataReset" type="button">Reset filters</button>
      </div>
      <div id="salesDrilldownContext" class="sales-note" hidden>
        <p id="salesDrilldownScope" aria-live="polite"></p>
        <button type="button" class="sales-secondary-button" id="salesDrilldownBack">Return to investigation</button>
        <button type="button" class="sales-secondary-button" id="salesDrilldownClear">Clear investigation filters</button>
      </div>
      <section class="sales-summary-section" aria-labelledby="salesSummaryTitle">
        <div class="sales-section-heading">
          <div><h3 id="salesSummaryTitle">Filtered summary</h3><p>Summary covers all matching rows, across every page.</p></div>
          <div class="uploaded-data-field sales-inline-field"><label for="salesDataComputation">Show</label><select id="salesDataComputation"><option value="overview">Overview KPIs</option><option value="sum">Sums</option><option value="average">Averages</option><option value="count">Counts / SKU</option></select></div>
        </div>
        <div class="sales-status-grid" id="salesComputationGrid"></div>
      </section>
      <div class="sales-section-heading sales-ledger-heading">
        <div><h3>Transactions</h3><p>Amounts in PHP (₱). Quantities in source units.</p></div>
        <div class="uploaded-data-field sales-inline-field"><label for="salesDataDetail">Columns</label><select id="salesDataDetail"><option value="compact">Compact</option><option value="full">Full Ledger</option></select></div>
      </div>
      <div class="uploaded-data-table-wrap" id="salesDataTableWrap" tabindex="0" role="region" aria-label="Sales transactions" aria-busy="true"><table class="uploaded-data-table" id="salesDataTable" aria-label="Filtered sales transactions"><tbody><tr><td class="uploaded-data-empty">Loading transactions…</td></tr></tbody></table></div>
      <div class="uploaded-data-footer">
        <div class="sales-footer-count">
          <div class="uploaded-data-field sales-inline-field"><label for="salesDataPageSize">Rows per page</label><select id="salesDataPageSize"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div>
          <div class="uploaded-data-status" id="salesDataStatus" role="status">Loading…</div>
        </div>
        <div class="uploaded-data-pagination">
          <button class="uploaded-data-page-button" id="salesDataPrevious" type="button" disabled>Previous</button>
          <span class="uploaded-data-status" id="salesDataPage">Page 0 of 0</span>
          <button class="uploaded-data-page-button" id="salesDataNext" type="button" disabled>Next</button>
        </div>
      </div>
      <details class="sales-evidence-details" id="salesDataEvidence">
        <summary><span>Source and validation</span><span id="salesReconciliationStatus" aria-live="polite">Checks pending</span></summary>
        <div class="sales-evidence-body">
          <p id="salesDatasetSource">Loading source identity…</p>
          <p class="sales-note" id="salesPipelineNote">Ingestion and quality checks run in Databricks.</p>
          <p class="sales-note" id="salesFinancialReconciliation" aria-live="polite"></p>
          <p>Net sales are sales after discounts. Gross profit is the workbook margin amount before operating expenses. Gross margin uses gross profit and net sales from the same margin-eligible records. Mixed packs are not equivalent units or total market demand.</p>
        </div>
      </details>
    </section>
  </div>
`

export const DATABRICKS_SOURCE_PAGE = `
  <section class="chart-card" aria-labelledby="sourcePageTitle">
    <h2 class="chart-title" id="sourcePageTitle">Data source and ingestion</h2>
    <p id="sourcePageStatus" role="status">Source verification pending.</p>
    <p>Sales files are loaded through the controlled Databricks pipeline. Direct dashboard uploads are unavailable.</p>
    <ol class="source-ingestion-steps">
      <li>The data operator validates files and preserves the source evidence.</li>
      <li>The pipeline prepares candidate records and runs quality checks.</li>
      <li>Reviewers resolve data issues and record the required release decisions.</li>
    </ol>
    <p>New candidate data is shown only after it is available through the gateway. Pipeline checks do not grant business approval.</p>
    <details><summary>Current source evidence</summary><p id="sourcePageEvidence">Release identity unavailable.</p></details>
  </section>`

export const WEATHER_VALIDATION_PAGE = `
  <style>#weatherEffectTable [hidden]{display:none}#page-weather-validation details{margin-top:12px;font-size:12px}#page-weather-validation summary{cursor:pointer;font-weight:600}</style>
  <div class="page fade-in" id="page-weather-validation">
    <section class="uploaded-data-panel" aria-labelledby="weatherEffectTitle">
      <div class="uploaded-data-header">
        <div>
          <div class="uploaded-data-title" id="weatherEffectTitle">Weather API Validation</div>
          <div class="uploaded-data-copy">Compare PAGASA history with labeled NASA POWER / Open-Meteo proxies. Historical agreement does not establish forecast accuracy.</div>
        </div>
        <div class="sales-header-actions"><button class="sales-primary-button" id="weatherRefresh" type="button" disabled>Refresh selected API</button></div>
      </div>
      <div class="uploaded-data-toolbar weather-filter-toolbar">
        <div class="uploaded-data-field"><label for="weatherProvider">Provider / model</label><select id="weatherProvider"><option value="PAGASA">PAGASA official history</option><option value="nasa_power">NASA POWER proxy</option><option value="open_meteo_era5">Open-Meteo ERA5 proxy</option><option value="open_meteo_era5_seamless">Open-Meteo ERA5-Seamless proxy</option><option value="open_meteo_ifs">Open-Meteo ECMWF IFS proxy</option></select></div>
        <div class="uploaded-data-field"><label for="weatherArea">Territory point</label><select id="weatherArea"><option value="all">All Territories</option><option value="Albay">Albay</option><option value="Batangas">Batangas</option><option value="Camarines Norte">Camarines Norte</option><option value="Camarines Sur">Camarines Sur</option><option value="Catanduanes">Catanduanes</option><option value="Cavite">Cavite</option><option value="Laguna">Laguna</option><option value="Marinduque">Marinduque</option><option value="Masbate">Masbate</option><option value="Metro Manila">Metro Manila</option><option value="Occidental Mindoro">Occidental Mindoro</option><option value="Oriental Mindoro">Oriental Mindoro</option><option value="Palawan">Palawan</option><option value="Quezon">Quezon</option><option value="Rizal">Rizal</option><option value="Romblon">Romblon</option><option value="Sorsogon">Sorsogon</option></select></div>
        <div class="uploaded-data-field"><label for="weatherYear">Year</label><select id="weatherYear"><option value="all">All Years</option><option value="2025">2025</option><option value="2024" selected>2024</option><option value="2023">2023</option><option value="2022">2022</option><option value="2021">2021</option><option value="2020">2020</option><option value="2019">2019</option><option value="2018">2018</option><option value="2017">2017</option></select></div>
        <div class="uploaded-data-field"><span>Observation grain</span><strong>Monthly observations</strong></div>
        <div class="uploaded-data-field"><label for="weatherColumns">Columns</label><select id="weatherColumns"><option value="compact">Compact</option><option value="full">Full evidence</option></select></div>
      </div>
      <div class="sales-note" id="weatherEffectStatus" aria-live="polite">Loading PAGASA observations from Databricks Gold.</div>
      <div class="uploaded-data-table-wrap"><table class="uploaded-data-table" id="weatherEffectTable"><tbody><tr><td class="uploaded-data-empty">Loading Weather Metrics...</td></tr></tbody></table></div>
      <div class="uploaded-data-footer"><div class="uploaded-data-status" id="weatherEffectCount">Loading...</div></div>
      <details><summary>Coverage and interpretation</summary><p id="weatherEffectEvidence"></p><p>Compact shows available weather measurements. Full evidence includes empty measurements, derived indicators and sales matches. Missing values remain unavailable; historical agreement does not establish forecast accuracy.</p></details>
    </section>
  </div>
`
