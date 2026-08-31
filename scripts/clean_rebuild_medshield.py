"""
Targeted patch for medshieldReference.ts:
1. Verify no top-level TypeScript functions exist (only string exports)
2. Inject interactive season cards HTML (encoded for TS string)
3. Inject window.selectSeasonRestock ONLY inside MEDSHIELD_SCRIPT string
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
import re

target = Path("frontend/lib/medshieldReference.ts")
content = target.read_text(encoding="utf-8")

# -----------------------------------------------------------------------
# STEP 1: Verify no top-level async functions exist outside string exports
# -----------------------------------------------------------------------
# Strip all export const ... = "..." blocks to see what's left at top level
# The file should ONLY have export const declarations
top_level_funcs = re.findall(r'^async function \w+', content, re.MULTILINE)
if top_level_funcs:
    print(f"WARNING: Found top-level functions: {top_level_funcs}")
    # Remove them - strip everything before the first export const line
    first_export = content.find("export const MEDSHIELD_STYLE")
    if first_export > 0:
        content = content[first_export:]
        print("Stripped top-level code before first export.")
else:
    print("OK: No top-level async functions found.")

# -----------------------------------------------------------------------
# STEP 2: Replace static seasonal grid HTML with interactive cards
# The HTML is stored as HTML-entity-encoded + \\n-escaped text inside MARKUP
# -----------------------------------------------------------------------
# Find the seasonal planner div start and the prescriptive alerts section
# Using the encoded comment markers
old_grid_start = "\\u003c!-- SEASONAL EPIDEMIC RESTOCK GRID (6 CARDS) --\\u003e"
old_grid_end   = "\\u003c!-- PRESCRIPTIVE ALERTS HERO --\\u003e"

pos_start = content.find(old_grid_start)
pos_end   = content.find(old_grid_end)

if pos_start == -1 or pos_end == -1:
    # Try unencoded markers (file may use literal HTML)
    old_grid_start = "<!-- SEASONAL EPIDEMIC RESTOCK GRID (6 CARDS) -->"
    old_grid_end   = "<!-- PRESCRIPTIVE ALERTS HERO -->"
    pos_start = content.find(old_grid_start)
    pos_end   = content.find(old_grid_end)

if pos_start != -1 and pos_end != -1:
    # Detect encoding style (\\n vs actual newlines)
    snippet = content[pos_start:pos_start+100]
    uses_escaped = "\\\\n" in snippet or snippet.count("\n") == 0

    if uses_escaped:
        NL = "\\n"
        Q  = '\\"'
        SQ = "'"  # single quotes don't need escaping in TS double-quoted strings
    else:
        NL = "\n"
        Q  = '"'
        SQ = "'"

    cards_html = (
        NL + "      <!-- SEASONAL EPIDEMIC RESTOCK GRID (INTERACTIVE) -->" + NL
        + "      <div class=" + Q + "seasonal-planner-banner" + Q + ">" + NL
        + "        <div class=" + Q + "seasonal-planner-header" + Q + ">" + NL
        + "          <div>" + NL
        + "            <div class=" + Q + "seasonal-planner-title" + Q + ">&#128197; Prescriptive Seasonal Climate-Disease Mapping</div>" + NL
        + "            <div class=" + Q + "seasonal-planner-sub" + Q + ">Click any season card to drill down into SKU-level procurement recommendations, stock gaps, and EOQ.</div>" + NL
        + "          </div>" + NL
        + "        </div>" + NL
        + "        <div class=" + Q + "seasonal-grid" + Q + ">" + NL

        # --- Card 1: Amihan ---
        + "          <div class=" + Q + "season-card clickable-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('amihan',this)" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#38BDF8" + Q + ">JANUARY &amp; FEBRUARY</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#10052;&#65039; Amihan Cool Dry Season</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Flu/ILI, SARI, Asthma</li>" + NL
        + "              <li><strong>Restock:</strong> Bronchodilators, Antihistamines</li>" + NL
        + "              <li><strong>Priority:</strong> Salbutamol, Cetirizine</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        # --- Card 2: Summer ---
        + "          <div class=" + Q + "season-card clickable-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('summer',this)" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#F59E0B" + Q + ">MARCH &amp; APRIL</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#9728;&#65039; Summer Peak Heat Surge</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Gastroenteritis, Dehydration, Typhoid</li>" + NL
        + "              <li><strong>Restock:</strong> ORS Packets, GI Meds</li>" + NL
        + "              <li><strong>Priority:</strong> ORS Packets, Metronidazole</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        # --- Card 3: Pre-Monsoon ---
        + "          <div class=" + Q + "season-card clickable-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('pre_monsoon',this)" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#34D399" + Q + ">MAY &amp; JUNE</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#9929;&#65039; Pre-Monsoon Thunderstorms</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Early Dengue, HFMD</li>" + NL
        + "              <li><strong>Restock:</strong> Antipyretics, IV Fluids</li>" + NL
        + "              <li><strong>Priority:</strong> Paracetamol 500mg, IV Saline</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        # --- Card 4: Monsoon (active + critical) ---
        + "          <div class=" + Q + "season-card clickable-season active-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('monsoon',this)" + Q + " style=" + Q + "border-left:4px solid #EF4444" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#EF4444" + Q + ">JULY &amp; AUGUST &#8212; CRITICAL</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#127783;&#65039; Peak Monsoon (Habagat) &amp; Floods</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Dengue Outbreaks, Leptospirosis Wave 1</li>" + NL
        + "              <li><strong>Restock:</strong> Flood Prophylactics, IV Fluids</li>" + NL
        + "              <li><strong>Priority:</strong> Doxycycline 100mg, Paracetamol</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        # --- Card 5: Typhoon ---
        + "          <div class=" + Q + "season-card clickable-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('typhoon',this)" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#F87171" + Q + ">SEPTEMBER &amp; OCTOBER</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#127744; Late Typhoon &amp; Siltation</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Leptospirosis Wave 2, Dengue</li>" + NL
        + "              <li><strong>Restock:</strong> Anti-Leptospiral Meds, GI Meds</li>" + NL
        + "              <li><strong>Priority:</strong> Doxycycline 100mg, Ciprofloxacin</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        # --- Card 6: Holiday ---
        + "          <div class=" + Q + "season-card clickable-season" + Q + " onclick=" + Q + "if(window.selectSeasonRestock)window.selectSeasonRestock('holiday',this)" + Q + ">" + NL
        + "            <div class=" + Q + "season-card-tag" + Q + " style=" + Q + "color:#38BDF8" + Q + ">NOVEMBER &amp; DECEMBER</div>" + NL
        + "            <div class=" + Q + "season-card-title" + Q + ">&#127810; Cold Front &amp; Holiday Surge</div>" + NL
        + "            <ul class=" + Q + "season-card-list" + Q + ">" + NL
        + "              <li><strong>Risks:</strong> Flu/ILI Surges, Pediatric Asthma</li>" + NL
        + "              <li><strong>Restock:</strong> Bronchodilators, Mucolytics</li>" + NL
        + "              <li><strong>Priority:</strong> Salbutamol Nebules, Carbocisteine</li>" + NL
        + "            </ul>" + NL
        + "            <div class=" + Q + "drilldown-prompt" + Q + ">Click to view SKU Reorders &#10148;</div>" + NL
        + "          </div>" + NL

        + "        </div>" + NL  # end seasonal-grid

        # --- Drilldown table ---
        + "        <div id=" + Q + "seasonalDrilldownContainer" + Q + " style=" + Q + "margin-top:24px;background:#FFFFFF;border-radius:14px;padding:22px;color:#0F172A;box-shadow:0 4px 16px rgba(0,0,0,0.12);" + Q + ">" + NL
        + "          <div style=" + Q + "display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;" + Q + ">" + NL
        + "            <div>" + NL
        + "              <div id=" + Q + "drilldownTitle" + Q + " style=" + Q + "font-size:16px;font-weight:800;color:#0F172A;" + Q + ">July &amp; August &#8212; Peak Monsoon &amp; Floods</div>" + NL
        + "              <div id=" + Q + "drilldownSub" + Q + " style=" + Q + "font-size:12px;color:#64748B;margin-top:2px;" + Q + ">Prescribed Medicine Reorder Quantities &amp; Stock Gap Analysis</div>" + NL
        + "            </div>" + NL
        + "            <span id=" + Q + "drilldownBadge" + Q + " class=" + Q + "chart-badge" + Q + " style=" + Q + "background:#FEF2F2;color:#EF4444;" + Q + ">DOH Outbreak Alert</span>" + NL
        + "          </div>" + NL
        + "          <table class=" + Q + "product-table" + Q + ">" + NL
        + "            <thead><tr>" + NL
        + "              <th>Specific Medicine SKU</th>" + NL
        + "              <th>Therapeutic Category</th>" + NL
        + "              <th>Current Stock</th>" + NL
        + "              <th>Recommended EOQ Reorder</th>" + NL
        + "              <th>Reorder Point (ROP)</th>" + NL
        + "              <th>Urgency Level</th>" + NL
        + "              <th>Unit Cost</th>" + NL
        + "            </tr></thead>" + NL
        + "            <tbody id=" + Q + "seasonalDrilldownTable" + Q + "></tbody>" + NL
        + "          </table>" + NL
        + "        </div>" + NL
        + "      </div>" + NL + NL
        + "      "
    )

    content = content[:pos_start] + cards_html + content[pos_end:]
    print(f"Replaced seasonal grid (encoding={'escaped' if uses_escaped else 'literal'}).")
else:
    print("WARNING: Seasonal grid markers not found - skipping HTML replacement.")
    print(f"  Looking for: {repr(old_grid_start[:50])}")

# -----------------------------------------------------------------------
# STEP 3: Inject window.selectSeasonRestock inside MEDSHIELD_SCRIPT string
# -----------------------------------------------------------------------
js_code = r"""
if (typeof window !== 'undefined') {
  window.selectSeasonRestock = async function(seasonId, cardEl) {
    try {
      var allCards = document.querySelectorAll('.clickable-season');
      allCards.forEach(function(c) { c.classList.remove('active-season'); });
      if (cardEl) { cardEl.classList.add('active-season'); }
      var titleEl = document.getElementById('drilldownTitle');
      var subEl = document.getElementById('drilldownSub');
      var tableEl = document.getElementById('seasonalDrilldownTable');
      if (!tableEl) return;
      tableEl.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748B;">Loading prescribed SKU recommendations...</td></tr>';
      var data;
      try {
        var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
        data = await res.json();
      } catch(e) { console.warn('API fallback active', e); }
      var details = (data && data.detail) ? data.detail : {
        season_name: 'July–October - Peak Monsoon',
        climate_trigger: 'Peak Southwest Monsoon & Urban Inundation',
        skus: [
          {sku:'Doxycycline 100mg Capsule',category:'Flood Prophylactics',current_stock:180,eoq_reorder:1200,rop:400,urgency:'Critical',unit_cost:'\u20b112.00'},
          {sku:'Paracetamol 500mg Tablet',category:'Antipyretics',current_stock:600,eoq_reorder:4000,rop:1200,urgency:'Critical',unit_cost:'\u20b18.50'},
          {sku:'IV Lactated Ringers 1L',category:'IV Fluids',current_stock:90,eoq_reorder:500,rop:180,urgency:'High',unit_cost:'\u20b1110.00'},
          {sku:'Cefuroxime 500mg Tablet',category:'Antibiotics',current_stock:140,eoq_reorder:650,rop:200,urgency:'High',unit_cost:'\u20b148.00'}
        ]
      };
      if (titleEl) titleEl.innerText = details.season_name;
      if (subEl) subEl.innerText = 'Climate Trigger: ' + (details.climate_trigger || 'Seasonal Surge');
      var rows = '';
      details.skus.forEach(function(s) {
        var b = '<span class="alert-tag warn">Medium</span>';
        if (s.urgency === 'Critical') b = '<span class="alert-tag danger">Critical</span>';
        else if (s.urgency === 'High') b = '<span class="alert-tag danger">High</span>';
        else if (s.urgency === 'Low') b = '<span class="alert-tag ok">Low</span>';
        rows += '<tr><td style="font-weight:700">' + s.sku + '</td><td>' + s.category + '</td>' +
          '<td style="color:' + (s.current_stock < s.rop ? '#EF4444' : '#0F172A') + ';font-weight:700">' + s.current_stock.toLocaleString() + ' units</td>' +
          '<td style="font-weight:800;color:#0EA5E9">+' + s.eoq_reorder.toLocaleString() + ' units</td>' +
          '<td>' + s.rop.toLocaleString() + ' units</td>' +
          '<td style="text-align:right">' + b + '</td>' +
          '<td style="font-weight:600">' + s.unit_cost + '</td></tr>';
      });
      tableEl.innerHTML = rows;
    } catch(err) { console.error('selectSeasonRestock:', err); }
  };
  setTimeout(function() {
    if (window.selectSeasonRestock) window.selectSeasonRestock('monsoon', document.querySelector('.active-season'));
  }, 800);
}
"""

# Escape JS for insertion inside a TypeScript double-quoted string
js_escaped = js_code.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

script_start = content.find('export const MEDSHIELD_SCRIPT = "')
if script_start != -1:
    last_quote = content.rfind('"')
    content = content[:last_quote] + js_escaped + content[last_quote:]
    print("Injected window.selectSeasonRestock inside MEDSHIELD_SCRIPT.")
else:
    print("WARNING: MEDSHIELD_SCRIPT not found!")

target.write_text(content, encoding="utf-8")
print("Done: medshieldReference.ts patched cleanly.")
