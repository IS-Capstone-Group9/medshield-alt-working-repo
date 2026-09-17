export const PRODUCT_PRIORITIZATION_SCRIPT = String.raw`
let productCohortPercent = 'all';
let productScenario = 'normal';
let productCluster = 'all';
let productCategory = 'all';
let productMCDAWeights = { volume: 60, clinical: 30, surge: 10 };

const PRODUCT_VEN_CATALOG = {
  'PARACETAMOL 500MG': { generic: 'Paracetamol', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 1.85, weatherCoeff: 1.20, cost: 2.50, lead: 3, indication: 'First-line antipyretic for Dengue and febrile illnesses' },
  'PARACETAMOL MYREX 125MG/5ML': { generic: 'Paracetamol', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 1.75, weatherCoeff: 1.15, cost: 24.00, lead: 4, indication: 'Pediatric antipyretic syrup' },
  'PARACETAMOL MYREX 250MG/5ML': { generic: 'Paracetamol', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 1.80, weatherCoeff: 1.20, cost: 30.00, lead: 4, indication: 'Pediatric high-fever syrup' },
  'PARACETAMOL MYREX 100MG/ML': { generic: 'Paracetamol', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 1.70, weatherCoeff: 1.10, cost: 24.00, lead: 4, indication: 'Infant antipyretic oral drops' },
  'DOXYCYCLINE 100MG': { generic: 'Doxycycline Hyclate', ven: 'V', cluster: 'Waterborne (Flood/Lepto)', dengueCoeff: 2.50, weatherCoeff: 2.80, cost: 8.50, lead: 5, indication: 'Mandatory Leptospirosis flood prophylaxis' },
  'ORAL REHYDRATION SALTS': { generic: 'Oral Rehydration Salts (ORS)', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 2.20, weatherCoeff: 1.90, cost: 12.00, lead: 2, indication: 'Dengue and acute gastroenteritis rehydration' },
  '0.9% SODIUM CHLORIDE 500ML': { generic: '0.9% Sodium Chloride (Normal Saline)', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 2.40, weatherCoeff: 1.50, cost: 45.00, lead: 6, indication: 'Emergency fluid resuscitation in Dengue fever' },
  'LACTATED RINGERS 500ML': { generic: 'Lactated Ringer Solution', ven: 'V', cluster: 'Vector-Borne (Dengue)', dengueCoeff: 2.30, weatherCoeff: 1.40, cost: 48.00, lead: 6, indication: 'Dengue shock syndrome and trauma resuscitation' },
  'SALBUTAMOL 2.5MG/2.5ML NEBULE': { generic: 'Salbutamol', ven: 'V', cluster: 'Monsoon (ARI)', dengueCoeff: 1.30, weatherCoeff: 2.20, cost: 18.00, lead: 3, indication: 'Emergency bronchodilator for acute asthma during rains' },
  'SALBUTAMOL 2MG/5ML SYRUP': { generic: 'Salbutamol', ven: 'E', cluster: 'Monsoon (ARI)', dengueCoeff: 1.20, weatherCoeff: 1.80, cost: 35.00, lead: 4, indication: 'Pediatric bronchodilator for bronchitis' },
  'AMOXICILLIN 500MG': { generic: 'Amoxicillin', ven: 'E', cluster: 'Monsoon (ARI)', dengueCoeff: 1.25, weatherCoeff: 1.75, cost: 4.50, lead: 5, indication: 'Antibiotic for bacterial pneumonia and respiratory infection' },
  'CO-AMOXICLAV 625MG': { generic: 'Amoxicillin + Clavulanic Acid', ven: 'E', cluster: 'Monsoon (ARI)', dengueCoeff: 1.20, weatherCoeff: 1.60, cost: 22.00, lead: 7, indication: 'Severe respiratory tract infection antibiotic' },
  'AZITHROMYCIN 500MG': { generic: 'Azithromycin', ven: 'E', cluster: 'Monsoon (ARI)', dengueCoeff: 1.15, weatherCoeff: 1.50, cost: 38.00, lead: 7, indication: 'Macrolide antibiotic for atypical pneumonia' },
  'CIPROFLOXACIN 500MG': { generic: 'Ciprofloxacin', ven: 'E', cluster: 'Waterborne (Flood/Lepto)', dengueCoeff: 1.40, weatherCoeff: 1.80, cost: 6.50, lead: 5, indication: 'Enteric fever and waterborne infection antimicrobial' },
  'HYCLENS WOUND SPRAY 60ML': { generic: 'Chlorhexidine Digluconate 2%', ven: 'E', cluster: 'Waterborne (Flood/Lepto)', dengueCoeff: 1.10, weatherCoeff: 2.10, cost: 85.00, lead: 5, indication: 'Antiseptic flood wound cleansing spray' },
  'DOLO JAGA 500MG/50MG/100MG/100MCG': { generic: 'Paracetamol + Vitamin B Complex', ven: 'E', cluster: 'Routine Chronic', dengueCoeff: 1.10, weatherCoeff: 1.05, cost: 9.50, lead: 4, indication: 'Analgesic and neurotropic pain reliever' },
  'AMLODIPINE 5MG': { generic: 'Amlodipine Besylate', ven: 'E', cluster: 'Routine Chronic', dengueCoeff: 1.00, weatherCoeff: 1.00, cost: 1.80, lead: 4, indication: 'Essential antihypertensive maintenance therapy' },
  'LOSARTAN 50MG': { generic: 'Losartan Potassium', ven: 'E', cluster: 'Routine Chronic', dengueCoeff: 1.00, weatherCoeff: 1.00, cost: 2.50, lead: 4, indication: 'Angiotensin II blocker for hypertension control' },
  'METFORMIN 500MG': { generic: 'Metformin HCl', ven: 'E', cluster: 'Routine Chronic', dengueCoeff: 1.00, weatherCoeff: 1.00, cost: 1.50, lead: 4, indication: 'Essential glycemic control in type 2 diabetes' },
  'CETIRIZINE 10MG': { generic: 'Cetirizine HCl', ven: 'E', cluster: 'Routine Chronic', dengueCoeff: 1.10, weatherCoeff: 1.30, cost: 3.00, lead: 3, indication: 'Antihistamine for allergic rhinitis and skin rashes' },
  'MULTIVITAMINS + ZINC': { generic: 'Multivitamins + Zinc', ven: 'N', cluster: 'Routine Chronic', dengueCoeff: 1.15, weatherCoeff: 1.10, cost: 5.00, lead: 3, indication: 'Elective immune nutrition and dietary supplement' },
  'SANOMAX-FA': { generic: 'Nutritional Supplement FA', ven: 'N', cluster: 'Routine Chronic', dengueCoeff: 1.00, weatherCoeff: 1.00, cost: 12.00, lead: 5, indication: 'Discretionary health and vitamin tonic' },
  'VITAMIN C 500MG': { generic: 'Ascorbic Acid', ven: 'N', cluster: 'Routine Chronic', dengueCoeff: 1.20, weatherCoeff: 1.25, cost: 2.50, lead: 3, indication: 'OTC vitamin supplement' }
};

function matchProductMeta(productName) {
  const norm = String(productName || '').trim().toUpperCase();
  if (PRODUCT_VEN_CATALOG[norm]) return PRODUCT_VEN_CATALOG[norm];
  for (const [key, meta] of Object.entries(PRODUCT_VEN_CATALOG)) {
    if (norm.includes(key) || key.includes(norm)) return meta;
  }
  if (norm.includes('PARACETAMOL')) return PRODUCT_VEN_CATALOG['PARACETAMOL 500MG'];
  if (norm.includes('DOXYCYCLINE')) return PRODUCT_VEN_CATALOG['DOXYCYCLINE 100MG'];
  if (norm.includes('SALTS') || norm.includes('ORS') || norm.includes('HYDRITE')) return PRODUCT_VEN_CATALOG['ORAL REHYDRATION SALTS'];
  if (norm.includes('CHLORIDE') || norm.includes('NACL') || norm.includes('SALINE') || norm.includes('FLUID')) return PRODUCT_VEN_CATALOG['0.9% SODIUM CHLORIDE 500ML'];
  if (norm.includes('SALBUTAMOL')) return PRODUCT_VEN_CATALOG['SALBUTAMOL 2MG/5ML SYRUP'];
  if (norm.includes('AMOXICILLIN') || norm.includes('CO-AMOXICLAV')) return PRODUCT_VEN_CATALOG['AMOXICILLIN 500MG'];
  if (norm.includes('VITAMIN') || norm.includes('ZINC') || norm.includes('SANOMAX')) return PRODUCT_VEN_CATALOG['MULTIVITAMINS + ZINC'];
  return {
    generic: productName,
    ven: 'E',
    cluster: 'Routine Chronic',
    dengueCoeff: 1.0,
    weatherCoeff: 1.0,
    cost: 10.0,
    lead: 4,
    indication: 'Commercial pharmaceutical supply'
  };
}

function classifyABCVEN(abc, ven) {
  const code = (abc + ven).toUpperCase();
  if (['AV', 'BV', 'CV', 'AE'].includes(code)) {
    return { category: 'Category I', label: 'Critical Priority (Zero-Stockout Buffer)', cssClass: 'cat-critical' };
  } else if (['BE', 'CE', 'AN'].includes(code)) {
    return { category: 'Category II', label: 'Intermediate Priority (Periodic EOQ)', cssClass: 'cat-intermediate' };
  } else {
    return { category: 'Category III', label: 'Routine Priority (Batch Reorder)', cssClass: 'cat-routine' };
  }
}

function getDefaultMCDAWeights(scenario) {
  if (scenario === 'outbreak') return { volume: 20, clinical: 45, surge: 35 };
  if (scenario === 'weather') return { volume: 15, clinical: 45, surge: 40 };
  return { volume: 60, clinical: 30, surge: 10 };
}

function configureProductYearControls(pageName) {
  const filterBar = document.getElementById('filterBar');
  if (filterBar && pageName === 'products') filterBar.style.display = 'flex';
  const yearWrap = document.getElementById('singleYearWrap');
  if (yearWrap) yearWrap.style.display = 'none';
  const rangeWrap = document.getElementById('customDateRangeWrap');
  if (rangeWrap) rangeWrap.style.display = descriptivePeriod === 'custom' ? 'flex' : 'none';
  const compareWrap = document.getElementById('descriptiveComparisonWrap');
  const supportsComparison = pageName === 'overview' || pageName === 'revenue';
  if (compareWrap) compareWrap.style.display = supportsComparison ? 'inline-flex' : 'none';
  if (!supportsComparison && comparisonMode !== 'single') {
    comparisonMode = 'single';
    const compareSelect = document.getElementById('descriptiveComparisonSelect');
    if (compareSelect) compareSelect.value = 'single';
  }
}

function renderProductPrioritizationTimeline() {
  const page = document.getElementById('page-products');
  if (!page || !page.classList.contains('active') || !salesSectorsData) return;

  const daily = descriptiveUsesDailyGrain();
  const yearly = descriptiveUsesYearlyGrain();
  const allRows = getDescriptiveDetailedRows();
  const actualRows = allRows.filter(row => row.evidence !== 'estimate');
  const rows = actualRows.length ? actualRows : allRows;

  const totals = new Map();
  rows.forEach(r => {
    const product = String(r.product || '').trim();
    if (!product) return;
    const v = totals.get(product) || { revenue: 0, quantity: 0 };
    v.revenue += Number(r.revenue) || 0;
    v.quantity += Number(r.quantity) || 0;
    totals.set(product, v);
  });

  const positive = [...totals.entries()]
    .filter(([, val]) => val.revenue > 0)
    .sort((a, b) => b[1].revenue - a[1].revenue);

  const grandRevenue = positive.reduce((sum, [, val]) => sum + val.revenue, 0);
  const grandUnits = positive.reduce((sum, [, val]) => sum + val.quantity, 0);

  let cumulativeRev = 0;
  const portfolio = positive.map(([name, val], index) => {
    cumulativeRev += val.revenue;
    const revShare = grandRevenue ? (100 * val.revenue / grandRevenue) : 0;
    const cumShare = grandRevenue ? (100 * cumulativeRev / grandRevenue) : 0;
    let abc = 'C';
    if (cumShare <= 70.0 || index === 0) abc = 'A';
    else if (cumShare <= 90.0) abc = 'B';

    const meta = matchProductMeta(name);
    const ven = meta.ven;
    const cluster = meta.cluster;
    let surge = 1.0;
    if (productScenario === 'outbreak') surge = meta.dengueCoeff;
    else if (productScenario === 'weather') surge = meta.weatherCoeff;

    const catInfo = classifyABCVEN(abc, ven);

    return {
      name,
      generic: meta.generic,
      revenue: val.revenue,
      quantity: val.quantity,
      revenueShare: revShare,
      cumulativeShare: cumShare,
      abc,
      ven,
      matrixCode: abc + ven,
      category: catInfo.category,
      categoryLabel: catInfo.label,
      categoryClass: catInfo.cssClass,
      cluster,
      surgeMultiplier: surge,
      cost: meta.cost,
      lead: meta.lead,
      indication: meta.indication
    };
  });

  const maxVol = Math.max(...portfolio.map(p => p.quantity), 1);
  const maxRev = Math.max(...portfolio.map(p => p.revenue), 1);
  const maxSurge = Math.max(...portfolio.map(p => p.surgeMultiplier), 1);

  const venValues = { V: 100.0, E: 60.0, N: 20.0 };
  const wVol = (productMCDAWeights.volume || 60) / 100.0;
  const wClin = (productMCDAWeights.clinical || 30) / 100.0;
  const wSurge = (productMCDAWeights.surge || 10) / 100.0;

  portfolio.forEach(p => {
    const normVol = (0.5 * (p.quantity / maxVol) + 0.5 * (p.revenue / maxRev)) * 100.0;
    const normClin = venValues[p.ven] || 50.0;
    const normSurge = maxSurge > 0 ? (p.surgeMultiplier / maxSurge * 100.0) : 50.0;
    const score = (wVol * normVol) + (wClin * normClin) + (wSurge * normSurge);
    p.mcdaScore = Math.min(100.0, Math.max(0.0, score));
  });

  portfolio.sort((a, b) => b.mcdaScore - a.mcdaScore);
  portfolio.forEach((p, i) => { p.rank = i + 1; });

  const cat1Items = portfolio.filter(p => p.category === 'Category I');
  const cat2Items = portfolio.filter(p => p.category === 'Category II');
  const cat3Items = portfolio.filter(p => p.category === 'Category III');

  const cat1Rev = cat1Items.reduce((s, p) => s + p.revenue, 0);
  const cat2Rev = cat2Items.reduce((s, p) => s + p.revenue, 0);
  const cat3Rev = cat3Items.reduce((s, p) => s + p.revenue, 0);

  let filteredPortfolio = portfolio;
  if (productCluster !== 'all') {
    filteredPortfolio = filteredPortfolio.filter(p => {
      if (productCluster === 'dengue') return p.cluster.includes('Dengue');
      if (productCluster === 'water') return p.cluster.includes('Flood') || p.cluster.includes('Lepto');
      if (productCluster === 'monsoon') return p.cluster.includes('ARI') || p.cluster.includes('Monsoon');
      if (productCluster === 'routine') return p.cluster.includes('Routine');
      return true;
    });
  }
  if (productCategory !== 'all') {
    if (productCategory === 'cat1') filteredPortfolio = filteredPortfolio.filter(p => p.category === 'Category I');
    if (productCategory === 'cat2') filteredPortfolio = filteredPortfolio.filter(p => p.category === 'Category II');
    if (productCategory === 'cat3') filteredPortfolio = filteredPortfolio.filter(p => p.category === 'Category III');
  }

  const cohortRate = [5, 10, 20].includes(Number(productCohortPercent)) ? Number(productCohortPercent) : (productCohortPercent === 'all' ? 100 : 10);
  const focusCohortCount = cohortRate === 100 ? filteredPortfolio.length : Math.max(1, Math.ceil(filteredPortfolio.length * cohortRate / 100));
  const focusCohort = filteredPortfolio.slice(0, focusCohortCount);

  const chartLimit = 10;
  const ranked = focusCohort.slice(0, chartLimit);
  const topNames = new Set(ranked.map(p => p.name));

  let scope = document.getElementById('productPriorityScope');
  if (!scope) {
    scope = document.createElement('div');
    scope.id = 'productPriorityScope';
    scope.className = 'product-priority-scope';
    scope.setAttribute('role', 'note');
    const firstGrid = page.querySelector('.chart-grid-2');
    page.insertBefore(scope, firstGrid);
  }

  const escape = value => String(value).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  scope.innerHTML = '<div style="background:var(--card-bg,#fff);border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">'
    + '<div>'
    + '<div style="font-size:16px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">'
    + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>'
    + 'Scenario-Driven Product Decision Support & WHO VEN Prioritization'
    + '</div>'
    + '<div style="font-size:12px;color:var(--text-muted);margin-top:2px;">'
    + 'Dynamic multi-criteria evaluation combining commercial revenue, clinical criticality (Vital, Essential, Non-Essential), and outbreak/storm surge elasticity.'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;align-items:center;">'
    + '<button type="button" class="btn btn-secondary" onclick="exportProductPriorityCSV()" style="font-size:11px;padding:5px 12px;display:flex;align-items:center;gap:6px;">'
    + '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
    + 'Export Priority CSV'
    + '</button>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">'
    + '<div>'
    + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;display:block;" for="productScenarioSelect">Operating Scenario</label>'
    + '<select id="productScenarioSelect" class="topbar-select" style="width:100%;font-weight:600;background:var(--bg-elevated);" onchange="setProductScenario(this.value)">'
    + '<option value="normal"' + (productScenario === 'normal' ? ' selected' : '') + '>Normal Transactions (Commercial Baseline)</option>'
    + '<option value="outbreak"' + (productScenario === 'outbreak' ? ' selected' : '') + '>Disease Outbreak Surge (Dengue / Lepto)</option>'
    + '<option value="weather"' + (productScenario === 'weather' ? ' selected' : '') + '>Inclement Weather (Typhoon / Flood)</option>'
    + '</select>'
    + '</div>'
    + '<div>'
    + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;display:block;" for="productClusterSelect">Therapeutic Cluster</label>'
    + '<select id="productClusterSelect" class="topbar-select" style="width:100%;" onchange="setProductCluster(this.value)">'
    + '<option value="all"' + (productCluster === 'all' ? ' selected' : '') + '>All Therapeutic Clusters</option>'
    + '<option value="dengue"' + (productCluster === 'dengue' ? ' selected' : '') + '>Vector-Borne (Dengue Response)</option>'
    + '<option value="water"' + (productCluster === 'water' ? ' selected' : '') + '>Waterborne (Flood & Leptospirosis)</option>'
    + '<option value="monsoon"' + (productCluster === 'monsoon' ? ' selected' : '') + '>Monsoon (Acute Respiratory ARI)</option>'
    + '<option value="routine"' + (productCluster === 'routine' ? ' selected' : '') + '>Routine Primary & Chronic Care</option>'
    + '</select>'
    + '</div>'
    + '<div>'
    + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;display:block;" for="productCategorySelect">ABC-VEN Category</label>'
    + '<select id="productCategorySelect" class="topbar-select" style="width:100%;" onchange="setProductCategory(this.value)">'
    + '<option value="all"' + (productCategory === 'all' ? ' selected' : '') + '>All Priority Categories (I, II, III)</option>'
    + '<option value="cat1"' + (productCategory === 'cat1' ? ' selected' : '') + '>Category I (Critical / Emergency Buffer)</option>'
    + '<option value="cat2"' + (productCategory === 'cat2' ? ' selected' : '') + '>Category II (Intermediate / EOQ)</option>'
    + '<option value="cat3"' + (productCategory === 'cat3' ? ' selected' : '') + '>Category III (Routine Batch Reorder)</option>'
    + '</select>'
    + '</div>'
    + '<div>'
    + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px;display:block;" for="productCohortSelect">Portfolio Depth</label>'
    + '<select id="productCohortSelect" class="topbar-select" style="width:100%;" onchange="setProductCohort(this.value)">'
    + '<option value="5"' + (cohortRate === 5 ? ' selected' : '') + '>Top 5% Leaders</option>'
    + '<option value="10"' + (cohortRate === 10 ? ' selected' : '') + '>Top 10% Leaders</option>'
    + '<option value="20"' + (cohortRate === 20 ? ' selected' : '') + '>Top 20% Focus</option>'
    + '<option value="all"' + (cohortRate === 100 ? ' selected' : '') + '>Complete Catalog (100%)</option>'
    + '</select>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px;" id="productCategorySummaryGrid">'
    + '<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px 14px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:11px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.04em;">Category I · Critical Priority</span>'
    + '<span style="font-size:9px;font-weight:700;background:#dc2626;color:#fff;padding:2px 6px;border-radius:4px;">ZERO STOCKOUT</span>'
    + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:#7f1d1d;margin:6px 0 2px 0;">' + cat1Items.length + ' SKUs <span style="font-size:13px;font-weight:600;color:#991b1b;">(₱' + (cat1Rev/1e6).toFixed(1) + 'M)</span></div>'
    + '<div style="font-size:11px;color:#b91c1c;">' + (grandRevenue ? (cat1Rev/grandRevenue*100).toFixed(1) : 0) + '% of net revenue · AV, BV, CV, AE items (Guaranteed buffer protection)</div>'
    + '</div>'
    + '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 14px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:0.04em;">Category II · Intermediate</span>'
    + '<span style="font-size:9px;font-weight:700;background:#2563eb;color:#fff;padding:2px 6px;border-radius:4px;">PERIODIC EOQ</span>'
    + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:#1e3a8a;margin:6px 0 2px 0;">' + cat2Items.length + ' SKUs <span style="font-size:13px;font-weight:600;color:#1e40af;">(₱' + (cat2Rev/1e6).toFixed(1) + 'M)</span></div>'
    + '<div style="font-size:11px;color:#2563eb;">' + (grandRevenue ? (cat2Rev/grandRevenue*100).toFixed(1) : 0) + '% of net revenue · BE, CE, AN items (Standard safety stocks)</div>'
    + '</div>'
    + '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;">'
    + '<span style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.04em;">Category III · Routine</span>'
    + '<span style="font-size:9px;font-weight:700;background:#64748b;color:#fff;padding:2px 6px;border-radius:4px;">BATCH REORDER</span>'
    + '</div>'
    + '<div style="font-size:20px;font-weight:800;color:#1e293b;margin:6px 0 2px 0;">' + cat3Items.length + ' SKUs <span style="font-size:13px;font-weight:600;color:#475569;">(₱' + (cat3Rev/1e6).toFixed(1) + 'M)</span></div>'
    + '<div style="font-size:11px;color:#64748b;">' + (grandRevenue ? (cat3Rev/grandRevenue*100).toFixed(1) : 0) + '% of net revenue · BN, CN items (Secondary capital reorder)</div>'
    + '</div>'
    + '</div>'
    + '<details style="background:var(--bg-elevated,#f8fafc);border:1px solid var(--border);border-radius:8px;padding:10px 14px;">'
    + '<summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;">'
    + '<span>MCDA Decision Weight Sensitivity Tuning (' + productScenario.toUpperCase() + ' Preset Active)</span>'
    + '<span style="font-size:11px;color:var(--accent);font-weight:600;">Adjust Weights ▼</span>'
    + '</summary>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">'
    + '<div>'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px;">'
    + '<span>Volume & Revenue Weight:</span>'
    + '<span id="weightVolLabel" style="color:var(--accent);">' + productMCDAWeights.volume + '%</span>'
    + '</div>'
    + '<input type="range" id="mcdaWeightVolume" min="0" max="100" value="' + productMCDAWeights.volume + '" style="width:100%;accent-color:var(--accent);" oninput="updateProductMCDAWeights()" />'
    + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Historical fulfilled transactional scale</div>'
    + '</div>'
    + '<div>'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px;">'
    + '<span>Clinical VEN Criticality:</span>'
    + '<span id="weightClinLabel" style="color:#dc2626;">' + productMCDAWeights.clinical + '%</span>'
    + '</div>'
    + '<input type="range" id="mcdaWeightClinical" min="0" max="100" value="' + productMCDAWeights.clinical + '" style="width:100%;accent-color:#dc2626;" oninput="updateProductMCDAWeights()" />'
    + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">WHO VEN therapeutic score (Vital=100, Essential=60, Non-Essential=20)</div>'
    + '</div>'
    + '<div>'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px;">'
    + '<span>Epidemic / Storm Surge Factor:</span>'
    + '<span id="weightSurgeLabel" style="color:#d97706;">' + productMCDAWeights.surge + '%</span>'
    + '</div>'
    + '<input type="range" id="mcdaWeightSurge" min="0" max="100" value="' + productMCDAWeights.surge + '" style="width:100%;accent-color:#d97706;" oninput="updateProductMCDAWeights()" />'
    + '<div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Disease transmission & weather elasticity multiplier</div>'
    + '</div>'
    + '</div>'
    + '<div style="display:flex;justify-content:flex-end;margin-top:10px;">'
    + '<button type="button" class="btn btn-secondary" style="font-size:10px;padding:3px 8px;" onclick="resetProductMCDAWeights()">Reset Scenario Defaults</button>'
    + '</div>'
    + '</details>'
    + '</div>';

  const replaceChart = (id, config) => {
    const canvas = document.getElementById(id);
    const old = canvas && Chart.getChart(canvas);
    if (old) old.destroy();
    if (canvas) new Chart(canvas, config);
  };

  replaceChart('productBarChart', {
    type: 'bar',
    data: {
      labels: ranked.map(p => p.name),
      datasets: [
        {
          label: 'MCDA Priority Score (0-100)',
          data: ranked.map(p => p.mcdaScore),
          backgroundColor: ranked.map(p => p.category === 'Category I' ? '#dc2626' : p.category === 'Category II' ? '#2563eb' : '#64748b'),
          yAxisID: 'score'
        },
        {
          type: 'line',
          label: 'Cumulative portfolio revenue (%)',
          data: ranked.map(p => p.cumulativeShare),
          borderColor: '#D49A23',
          backgroundColor: '#D49A23',
          pointRadius: 4,
          yAxisID: 'pct'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: context => context.dataset.yAxisID === 'pct'
              ? context.dataset.label + ': ' + Number(context.parsed.y).toFixed(1) + '%'
              : context.dataset.label + ': ' + Number(context.parsed.y).toFixed(1) + ' pts'
          }
        }
      },
      scales: {
        x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 30 } },
        score: { beginAtZero: true, max: 100, title: { display: true, text: 'Priority Score (0-100)' } },
        pct: { position: 'right', min: 0, max: 100, ticks: { callback: v => v + '%' }, title: { display: true, text: 'Cumulative Revenue (%)' }, grid: { drawOnChartArea: false } }
      }
    }
  });

  replaceChart('abcChart', {
    type: 'doughnut',
    data: {
      labels: [
        'Category I (Critical) · ₱' + (cat1Rev / 1e6).toFixed(1) + 'M',
        'Category II (Intermediate) · ₱' + (cat2Rev / 1e6).toFixed(1) + 'M',
        'Category III (Routine) · ₱' + (cat3Rev / 1e6).toFixed(1) + 'M'
      ],
      datasets: [{
        data: [cat1Rev, cat2Rev, cat3Rev],
        backgroundColor: ['#dc2626', '#2563eb', '#94a3b8'],
        borderColor: ['#b91c1c', '#1d4ed8', '#64748b'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: context => context.label + ' (' + (grandRevenue ? (Number(context.raw) / grandRevenue * 100).toFixed(1) : 0) + '%)'
          }
        }
      }
    }
  });

  const largestUnits = Math.max(...ranked.map(p => p.quantity), 1);
  replaceChart('productBubbleChart', {
    type: 'bubble',
    data: {
      datasets: ranked.map(p => ({
        label: p.name,
        data: [{ x: p.revenue, y: p.mcdaScore, r: Math.max(6, Math.min(22, 6 + 16 * (p.quantity / largestUnits))) }],
        backgroundColor: p.category === 'Category I' ? 'rgba(220,38,38,0.7)' : p.category === 'Category II' ? 'rgba(37,99,235,0.7)' : 'rgba(100,116,139,0.7)',
        borderColor: p.category === 'Category I' ? '#b91c1c' : p.category === 'Category II' ? '#1d4ed8' : '#475569'
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, title: { display: true, text: 'Net Sales Revenue (₱)' } },
        y: { beginAtZero: true, max: 100, title: { display: true, text: 'MCDA Priority Score (0-100)' } }
      }
    }
  });

  const keys = descriptiveAxisPeriods();
  const labels = keys.map(descriptivePointLabel);
  const keyFn = r => yearly ? String(r.period || r.date || '').slice(0, 4) : (daily ? r.date : r.period);
  const series = new Map();
  rows.filter(r => topNames.has(r.product)).forEach(r => {
    const k = r.product + '|' + keyFn(r);
    series.set(k, (series.get(k) || 0) + (Number(r.revenue) || 0));
  });

  const palette = ['#dc2626', '#D49A23', '#2563eb', '#7A5C99', '#3B8C6E', '#0284c7', '#ea580c', '#475569'];
  replaceChart('paretoCurveChart', {
    type: 'line',
    data: {
      labels,
      datasets: ranked.map((p, i) => ({
        label: p.name,
        data: keys.map(k => series.has(p.name + '|' + k) ? series.get(p.name + '|' + k) : null),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length],
        pointRadius: daily ? 1 : 3,
        tension: yearly ? 0 : 0.2,
        spanGaps: false
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { title: { display: true, text: yearly ? 'Year' : (daily ? 'Day' : 'Month') } },
        y: { beginAtZero: true, title: { display: true, text: 'Net Sales Revenue (₱)' } }
      }
    }
  });

  const table = document.getElementById('productTable');
  if (table) {
    const tableRows = focusCohort.map(p => {
      const catBadge = p.category === 'Category I'
        ? '<span style="background:#fef2f2;color:#991b1b;border:1px solid #f87171;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">Category I</span>'
        : (p.category === 'Category II'
          ? '<span style="background:#eff6ff;color:#1e40af;border:1px solid #93c5fd;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">Category II</span>'
          : '<span style="background:#f3f4f6;color:#374151;border:1px solid #d1d5db;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600;">Category III</span>');

      const venBadge = p.ven === 'V'
        ? '<span style="background:#fee2e2;color:#b91c1c;font-weight:800;padding:2px 6px;border-radius:4px;font-size:10px;">Vital (V)</span>'
        : (p.ven === 'E'
          ? '<span style="background:#fef3c7;color:#b45309;font-weight:700;padding:2px 6px;border-radius:4px;font-size:10px;">Essential (E)</span>'
          : '<span style="background:#f1f5f9;color:#475569;font-weight:600;padding:2px 6px;border-radius:4px;font-size:10px;">Non-Essential (N)</span>');

      const clusterBadge = '<span style="background:#f8fafc;border:1px solid var(--border);color:var(--text-secondary);padding:2px 6px;border-radius:4px;font-size:10px;">' + escape(p.cluster) + '</span>';

      const scoreMeter = '<div style="display:flex;align-items:center;gap:8px;">'
        + '<strong style="font-size:12px;color:var(--text-primary);min-width:32px;">' + p.mcdaScore.toFixed(1) + '</strong>'
        + '<div style="flex:1;background:var(--border);height:6px;border-radius:3px;overflow:hidden;min-width:60px;">'
        + '<div style="background:' + (p.category==='Category I'?'#dc2626':p.category==='Category II'?'#2563eb':'#64748b') + ';height:100%;width:' + p.mcdaScore + '%;"></div>'
        + '</div>'
        + '</div>';

      return '<tr>'
        + '<td style="font-weight:700;text-align:center;">#' + p.rank + '</td>'
        + '<td>'
        + '<div style="font-weight:700;color:var(--text-primary);">' + escape(p.name) + '</div>'
        + '<div style="font-size:10px;color:var(--text-muted);">' + escape(p.generic) + ' · ' + escape(p.indication) + '</div>'
        + '</td>'
        + '<td>' + catBadge + ' <span style="font-size:10px;font-weight:700;color:var(--text-muted);margin-left:2px;">[' + p.matrixCode + ']</span></td>'
        + '<td>' + venBadge + '</td>'
        + '<td>' + clusterBadge + '</td>'
        + '<td style="text-align:right;font-weight:600;">₱' + p.revenue.toLocaleString('en-PH', { maximumFractionDigits: 2 }) + '</td>'
        + '<td style="text-align:right;">' + p.quantity.toLocaleString('en-PH', { maximumFractionDigits: 0 }) + '</td>'
        + '<td style="text-align:center;font-weight:700;color:' + (p.surgeMultiplier>1?'#b45309':'var(--text-muted)') + ';">' + p.surgeMultiplier.toFixed(2) + 'x</td>'
        + '<td>' + scoreMeter + '</td>'
        + '</tr>';
    }).join('');

    const subtotalRev = focusCohort.reduce((s, p) => s + p.revenue, 0);
    const subtotalUnits = focusCohort.reduce((s, p) => s + p.quantity, 0);
    const avgScore = focusCohort.length ? (focusCohort.reduce((s, p) => s + p.mcdaScore, 0) / focusCohort.length) : 0;

    table.innerHTML = '<thead><tr><th style="width:50px;text-align:center;">Rank</th><th>Pharmaceutical Product / SKU</th><th>ABC-VEN Category</th><th>WHO VEN</th><th>Therapeutic Cluster</th><th style="text-align:right;">Net Sales (₱)</th><th style="text-align:right;">Delivered Units</th><th style="text-align:center;">Surge Multiplier</th><th style="width:140px;">MCDA Priority Score</th></tr></thead><tbody>'
      + (tableRows || '<tr><td colspan="9">No products available for this filter scope.</td></tr>')
      + '</tbody><tfoot><tr style="background:var(--bg-elevated);font-weight:700;"><td colspan="5" style="text-align:right;">Summary Rollup (' + focusCohort.length + ' SKUs):</td><td style="text-align:right;">₱' + subtotalRev.toLocaleString('en-PH', { maximumFractionDigits: 2 }) + '</td><td style="text-align:right;">' + subtotalUnits.toLocaleString('en-PH', { maximumFractionDigits: 0 }) + '</td><td style="text-align:center;">—</td><td>' + avgScore.toFixed(1) + ' avg pts</td></tr></tfoot>';
  }

  const updateCard = (canvasId, titleText, subtitleText) => {
    const canvas = document.getElementById(canvasId);
    const card = canvas && canvas.closest('.chart-card');
    if (!card) return;
    const title = card.querySelector('.chart-title');
    const subtitle = card.querySelector('.chart-subtitle');
    if (title) title.textContent = titleText;
    if (subtitle) subtitle.textContent = subtitleText;
  };

  updateCard('productBarChart', 'Product MCDA Priority Score (' + productScenario.toUpperCase() + ' Mode)', 'Descending priority score incorporating clinical VEN urgency and epidemic/storm surge elasticity.');
  updateCard('abcChart', 'ABC-VEN Category Capital Allocation', 'Distribution of portfolio revenue across Category I (Critical Buffer), Category II (EOQ), and Category III (Routine).');
  updateCard('productBubbleChart', 'MCDA Priority Score vs Net Sales Revenue', 'Bubble size represents delivered unit volume; colored by ABC-VEN priority category.');
  updateCard('paretoCurveChart', 'Priority Product Sales Timeline', (yearly ? 'Annual' : (daily ? 'Daily' : 'Monthly')) + ' net sales revenue for top focus products during ' + descriptivePeriodLabel() + '.');

  const insight = page.querySelector('.dss-insight-card');
  if (insight) {
    const badge = insight.querySelector('.insight-badge');
    const title = insight.querySelector('.insight-title');
    const body = title && title.nextElementSibling;
    if (badge) badge.textContent = 'Operations Research & Clinical VEN Principle';
    if (title) title.textContent = 'Scenario-Driven SKU Allocation: ' + (productScenario === 'outbreak' ? 'Dengue Epidemic Surge Protection' : (productScenario === 'weather' ? 'Typhoon & Flood Disaster Contingency' : 'Normal Baseline Portfolio Management'));
    if (body) {
      body.innerHTML = 'Under the active <strong>' + productScenario.toUpperCase() + '</strong> scenario, <strong>' + cat1Items.length + ' SKUs</strong> are classified as <strong>Category I (Critical Priority)</strong>, accounting for <strong>₱' + (cat1Rev / 1e6).toFixed(1) + 'M (' + (grandRevenue ? (cat1Rev / grandRevenue * 100).toFixed(1) : 0) + '%)</strong> of portfolio value. Low-cost vital therapeutics (such as Paracetamol, ORS, IV Fluids, and Doxycycline) are guaranteed emergency safety buffer protection regardless of unit price.';
    }
  }

  const topbarSub = document.getElementById('topbar-sub');
  if (topbarSub) topbarSub.textContent = 'Scenario-Driven Product Decision Support (' + productScenario.toUpperCase() + ') · WHO ABC-VEN Framework';
}

function setProductScenario(scenario) {
  productScenario = scenario;
  productMCDAWeights = getDefaultMCDAWeights(scenario);
  const sel = document.getElementById('productScenarioSelect');
  if (sel) sel.value = scenario;
  renderProductPrioritizationTimeline();
}

function setProductCluster(cluster) {
  productCluster = cluster;
  const sel = document.getElementById('productClusterSelect');
  if (sel) sel.value = cluster;
  renderProductPrioritizationTimeline();
}

function setProductCategory(cat) {
  productCategory = cat;
  const sel = document.getElementById('productCategorySelect');
  if (sel) sel.value = cat;
  renderProductPrioritizationTimeline();
}

function setProductCohort(cohort) {
  productCohortPercent = cohort === 'all' ? 'all' : Number(cohort);
  const sel = document.getElementById('productCohortSelect');
  if (sel) sel.value = cohort;
  renderProductPrioritizationTimeline();
}

function updateProductMCDAWeights() {
  const v = document.getElementById('mcdaWeightVolume');
  const c = document.getElementById('mcdaWeightClinical');
  const s = document.getElementById('mcdaWeightSurge');
  if (v && c && s) {
    productMCDAWeights = {
      volume: Number(v.value) || 0,
      clinical: Number(c.value) || 0,
      surge: Number(s.value) || 0
    };
    const vl = document.getElementById('weightVolLabel');
    const cl = document.getElementById('weightClinLabel');
    const sl = document.getElementById('weightSurgeLabel');
    if (vl) vl.textContent = productMCDAWeights.volume + '%';
    if (cl) cl.textContent = productMCDAWeights.clinical + '%';
    if (sl) sl.textContent = productMCDAWeights.surge + '%';
    renderProductPrioritizationTimeline();
  }
}

function resetProductMCDAWeights() {
  productMCDAWeights = getDefaultMCDAWeights(productScenario);
  const v = document.getElementById('mcdaWeightVolume');
  const c = document.getElementById('mcdaWeightClinical');
  const s = document.getElementById('mcdaWeightSurge');
  if (v) v.value = productMCDAWeights.volume;
  if (c) c.value = productMCDAWeights.clinical;
  if (s) s.value = productMCDAWeights.surge;
  const vl = document.getElementById('weightVolLabel');
  const cl = document.getElementById('weightClinLabel');
  const sl = document.getElementById('weightSurgeLabel');
  if (vl) vl.textContent = productMCDAWeights.volume + '%';
  if (cl) cl.textContent = productMCDAWeights.clinical + '%';
  if (sl) sl.textContent = productMCDAWeights.surge + '%';
  renderProductPrioritizationTimeline();
}

function exportProductPriorityCSV() {
  const table = document.getElementById('productTable');
  if (!table) return;
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  if (!rows.length) return;

  const csvRows = [
    ['Rank', 'Product Name', 'ABC-VEN Category', 'WHO VEN', 'Therapeutic Cluster', 'Net Sales (PHP)', 'Delivered Units', 'Surge Multiplier', 'MCDA Priority Score']
  ];

  rows.forEach(r => {
    const cols = Array.from(r.querySelectorAll('td')).map(td => td.innerText.replace(/\n/g, ' ').replace(/"/g, '""').trim());
    if (cols.length >= 9) {
      csvRows.push([cols[0], cols[1], cols[2], cols[3], cols[4], cols[5], cols[6], cols[7], cols[8]]);
    }
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.map(cell => '"' + cell + '"').join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'MedShield_Product_Prioritization_' + productScenario + '_' + new Date().toISOString().slice(0, 10) + '.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function watchProductPriorityTable() {
  const table = document.getElementById('productTable');
  if (!table || table.dataset.priorityWatcher === 'true') return;
  table.dataset.priorityWatcher = 'true';
  new MutationObserver(function() {
    const page = document.getElementById('page-products');
    const firstHeader = table.querySelector('th');
    if (page && page.classList.contains('active') && (!firstHeader || !firstHeader.textContent.includes('Rank'))) {
      setTimeout(renderProductPrioritizationTimeline, 0);
    }
  }).observe(table, { childList: true, subtree: true });
}

setTimeout(watchProductPriorityTable, 0);
document.addEventListener('change', function(event) {
  const id = event.target && event.target.id;
  if (id === 'productScenarioSelect') setProductScenario(event.target.value);
  if (id === 'productClusterSelect') setProductCluster(event.target.value);
  if (id === 'productCategorySelect') setProductCategory(event.target.value);
  if (id === 'productCohortSelect') setProductCohort(event.target.value);
  if (id === 'descriptivePeriodSelect' || id === 'customDateStart' || id === 'customDateEnd') {
    setTimeout(renderProductPrioritizationTimeline, 0);
  }
});
`;
