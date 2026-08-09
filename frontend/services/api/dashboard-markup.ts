export const SALES_DATA_NAV_ITEM = `
  <div class="nav-item" id="salesDataNavItem" data-tooltip="View Sales Data" aria-label="View Sales Data" role="button" tabindex="0">
    <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 5h16v14H4z"/><path d="M4 10h16M9 5v14"/>
    </svg>
    <span class="nav-label">View Sales Data</span>
  </div>
`

export const WEATHER_VALIDATION_NAV_ITEM = `
  <div class="nav-item" id="weatherValidationNavItem" data-tooltip="Weather API Validation" aria-label="Weather API Validation" role="button" tabindex="0">
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
          <div class="uploaded-data-title" id="salesDataTitle">Cleaned Sales Transactions</div>
          <div class="uploaded-data-copy">Accepted sales rows with lineage, quality status, and filtered totals.</div>
        </div>
        <div class="sales-header-actions">
          <span class="mini-badge" id="salesDatasetBadge">Loading Dataset...</span>
          <button class="sales-primary-button" id="salesDataUploadButton" type="button">Upload XLSX/CSV</button>
          <input id="salesDataUploadInput" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden />
        </div>
      </div>
      <div class="sales-note" id="salesPipelineNote">Uploads are header-mapped, standardized, quality checked.</div>
      <div class="uploaded-data-toolbar sales-filter-toolbar">
        <div class="uploaded-data-field"><label for="salesDataYear">Year</label><select id="salesDataYear"><option value="all">All Years</option></select></div>
        <div class="uploaded-data-field"><label for="salesDataQuality">Quality</label><select id="salesDataQuality"><option value="all">All Rows</option><option value="valid">Valid</option><option value="warning">Warning</option><option value="rejected">Rejected</option></select></div>
        <div class="uploaded-data-field"><label for="salesDataPageSize">Rows Per Page</label><select id="salesDataPageSize"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div>
        <div class="uploaded-data-field"><label for="salesDataComputation">Computation</label><select id="salesDataComputation"><option value="overview">Overview KPIs</option><option value="sum">Sums</option><option value="average">Averages</option><option value="count">Counts / SKU</option></select></div>
        <div class="uploaded-data-field"><label for="salesDataDetail">Detail</label><select id="salesDataDetail"><option value="compact">Compact</option><option value="full">Full Ledger</option></select></div>
        <div class="uploaded-data-field uploaded-data-search"><label for="salesDataSearch">Search</label><input id="salesDataSearch" type="search" placeholder="Area, Product, DR Number..." /></div>
      </div>
      <div class="sales-status-grid" id="salesComputationGrid"></div>
      <div class="uploaded-data-table-wrap"><table class="uploaded-data-table" id="salesDataTable"><tbody><tr><td class="uploaded-data-empty">Loading Cleaned Transactions...</td></tr></tbody></table></div>
      <div class="uploaded-data-footer">
        <div class="uploaded-data-status" id="salesDataStatus">Loading...</div>
        <div class="uploaded-data-pagination">
          <button class="uploaded-data-page-button" id="salesDataPrevious" type="button">Previous</button>
          <span class="uploaded-data-status" id="salesDataPage">Page 0 of 0</span>
          <button class="uploaded-data-page-button" id="salesDataNext" type="button">Next</button>
        </div>
      </div>
    </section>
  </div>
`

export const WEATHER_VALIDATION_PAGE = `
  <div class="page fade-in" id="page-weather-validation">
    <section class="uploaded-data-panel" aria-labelledby="weatherEffectTitle">
      <div class="uploaded-data-header">
        <div>
          <div class="uploaded-data-title" id="weatherEffectTitle">Weather API Validation</div>
          <div class="uploaded-data-copy">Provider weather proxy for historical validation. Not an official PAGASA alert.</div>
        </div>
        <button class="sales-primary-button" id="refreshWeatherButton" type="button">Refresh Weather</button>
      </div>
      <div class="uploaded-data-toolbar weather-filter-toolbar">
        <div class="uploaded-data-field"><label for="weatherProvider">Provider</label><select id="weatherProvider"><option value="nasa_power">NASA POWER</option><option value="open_meteo">Open-Meteo Archive</option></select></div>
        <div class="uploaded-data-field"><label for="weatherArea">Territory</label><select id="weatherArea"><option value="all">All Territories</option><option value="Quezon">Quezon</option><option value="Batangas">Batangas</option><option value="Camarines Norte">Camarines Norte</option><option value="Camarines Sur">Camarines Sur</option><option value="Cavite">Cavite</option><option value="Laguna">Laguna</option><option value="Marinduque">Marinduque</option><option value="Metro Manila">Metro Manila</option><option value="Rizal">Rizal</option></select></div>
        <div class="uploaded-data-field"><label for="weatherYear">Year</label><select id="weatherYear"><option value="2025">2025</option><option value="2024">2024</option><option value="2023">2023</option><option value="2022">2022</option><option value="2021">2021</option></select></div>
        <div class="uploaded-data-field"><label for="weatherGrain">Validation Grain</label><select id="weatherGrain"><option value="monthly">Monthly Planning Aggregate</option><option value="daily">Daily API Rows</option></select></div>
      </div>
      <div class="sales-note" id="weatherEffectStatus">Weather synchronization integrity validated with provider API proxy.</div>
      <div class="uploaded-data-table-wrap"><table class="uploaded-data-table" id="weatherEffectTable"><tbody><tr><td class="uploaded-data-empty">Loading Weather Metrics...</td></tr></tbody></table></div>
      <div class="uploaded-data-footer"><div class="uploaded-data-status" id="weatherEffectCount">Loading...</div></div>
    </section>
  </div>
`
