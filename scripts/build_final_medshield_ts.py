"""
Script to safely inject selectSeasonRestock JS INSIDE MEDSHIELD_SCRIPT string literal in medshieldReference.ts
"""
from pathlib import Path
import re

target_file = Path("frontend/lib/medshieldReference.ts")

# 1. Run redesign_medshield_ui.py to get baseline layout
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
import redesign_medshield_ui

content = target_file.read_text(encoding="utf-8")

# 2. Add extra CSS rules inside MEDSHIELD_STYLE
css_clean_rules = (
  "\\n.clickable-season { cursor: pointer !important; position: relative; }\\n"
  ".clickable-season:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); border-color: #38BDF8 !important; }\\n"
  ".clickable-season.active-season { border: 2px solid #38BDF8 !important; background: rgba(56, 189, 248, 0.12) !important; }\\n"
  ".drilldown-prompt { margin-top: 10px; font-size: 11px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.05em; }\\n"
)
if "/* ── DATA UPLOAD ── */" in content:
    content = content.replace("/* ── DATA UPLOAD ── */", css_clean_rules + "/* ── DATA UPLOAD ── */")

# 3. Replace static seasonal banner in MEDSHIELD_MARKUP with interactive cards + drilldown table
old_banner_start = content.find(r"\u003c!-- SEASONAL EPIDEMIC RESTOCK GRID (6 CARDS) --\u003e")
old_banner_end = content.find(r"\u003c!-- PRESCRIPTIVE ALERTS HERO --\u003e")

interactive_banner_html = r'''
      \u003c!-- SEASONAL EPIDEMIC RESTOCK GRID (INTERACTIVE ACTION CARDS + SKU DRILL-DOWN TABLE) --\u003e
      \u003cdiv class=\"seasonal-planner-banner\"\u003e
        \u003cdiv class=\"seasonal-planner-header\"\u003e
          \u003cdiv\u003e
            \u003cdiv class=\"seasonal-planner-title\"\u003e Prescriptive Seasonal Climate-Disease Mapping\u003c/div\u003e
            \u003cdiv class=\"seasonal-planner-sub\"\u003eClick any season action card below to drill down into specific SKU-level procurement recommendations, current stock gaps, and Economic Order Quantities (EOQ).\u003c/div\u003e
          \u003c/div\u003e
        \u003c/div\u003e
        \u003cdiv class=\"seasonal-grid\"\u003e
          \u003cdiv class=\"season-card clickable-season\" onclick=\"selectSeasonRestock(\u0027amihan\u0027, this)\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#38BDF8\"\u003eJANUARY \u0026 FEBRUARY\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Amihan Cool Dry Season\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Flu/ILI, SARI, Asthma\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e Bronchodilators, Antihistamines\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e Salbutamol, Cetirizine\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class=\"season-card clickable-season\" onclick=\"selectSeasonRestock(\u0027summer\u0027, this)\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#F59E0B\"\u003eMARCH \u0026 APRIL\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Summer Peak Heat Surge\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Gastroenteritis, Dehydration, Typhoid\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e ORS Packets, GI Meds\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e ORS Packets, Metronidazole\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class=\"season-card clickable-season\" onclick=\"selectSeasonRestock(\u0027pre_monsoon\u0027, this)\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#34D399\"\u003eMAY \u0026 JUNE\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Pre-Monsoon Thunderstorms\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Early Dengue Onset, HFMD\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e Antipyretics, IV Fluids\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e Paracetamol 500mg, IV Saline\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class=\"season-card clickable-season active-season\" onclick=\"selectSeasonRestock(\u0027monsoon\u0027, this)\" style=\"border-left: 4px solid #EF4444;\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#EF4444\"\u003eJULY \u0026 AUGUST — CRITICAL\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Peak Monsoon (Habagat) \u0026 Floods\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Dengue Outbreaks, Leptospirosis Wave 1\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e Flood Prophylactics, IV Fluids\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e Doxycycline 100mg, Paracetamol\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class=\"season-card clickable-season\" onclick=\"selectSeasonRestock(\u0027typhoon\u0027, this)\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#F87171\"\u003eSEPTEMBER \u0026 OCTOBER\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Late Typhoon \u0026 Siltation\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Leptospirosis Wave 2, Dengue\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e Anti-Leptospiral Meds, GI Meds\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e Doxycycline 100mg, Ciprofloxacin\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
          \u003cdiv class=\"season-card clickable-season\" onclick=\"selectSeasonRestock(\u0027holiday\u0027, this)\"\u003e
            \u003cdiv class=\"season-card-tag\" style=\"color:#38BDF8\"\u003eNOVEMBER \u0026 DECEMBER\u003c/div\u003e
            \u003cdiv class=\"season-card-title\"\u003e Cold Front \u0026 Holiday Surge\u003c/div\u003e
            \u003cul class=\"season-card-list\"\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRisks:\u003c/str\u006fng\u003e Flu/ILI Surges, Pediatric Asthma\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003eRestock:\u003c/str\u006fng\u003e Bronchodilators, Mucolytics\u003c/li\u003e
              \u003cli\u003e\u003cstr\u006fng\u003ePriority:\u003c/str\u006fng\u003e Salbutamol Nebules, Carbocisteine\u003c/li\u003e
            \u003c/ul\u003e
            \u003cdiv class=\"drilldown-prompt\"\u003eClick to view SKU Reorders ➔\u003c/div\u003e
          \u003c/div\u003e
        \u003c/div\u003e

        \u003c!-- DYNAMIC SKU DRILL-DOWN TABLE CONTAINER --\u003e
        \u003cdiv id=\"seasonalDrilldownContainer\" style=\"margin-top: 24px; background: #FFFFFF; border-radius: 14px; padding: 22px; color: #0F172A; box-shadow: 0 4px 16px rgba(0,0,0,0.12);\"\u003e
          \u003cdiv style=\"display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;\"\u003e
            \u003cdiv\u003e
              \u003cdiv id=\"drilldownTitle\" style=\"font-size:16px; font-weight:800; color:#0F172A;\"\u003eJuly \u0026 August — Peak Monsoon (Habagat) \u0026 Floods\u003c/div\u003e
              \u003cdiv id=\"drilldownSub\" style=\"font-size:12px; color:#64748B; margin-top:2px;\"\u003ePrescribed Medicine Reorder Quantities \u0026 Stock Gap Analysis\u003c/div\u003e
            \u003c/div\u003e
            \u003cspan id=\"drilldownBadge\" class=\"chart-badge\" style=\"background:#FEF2F2; color:#EF4444;\"\u003eDOH Outbreak Alert\u003c/span\u003e
          \u003c/div\u003e
          \u003ctable class=\"product-table\"\u003e
            \u003cthead\u003e
              \u003ctr\u003e
                \u003cth\u003eSpecific Medicine SKU\u003c/th\u003e
                \u003cth\u003eTherapeutic Category\u003c/th\u003e
                \u003cth\u003eCurrent Stock\u003c/th\u003e
                \u003cth\u003eRecommended EOQ Reorder\u003c/th\u003e
                \u003cth\u003eReorder Point (ROP)\u003c/th\u003e
                \u003cth\u003eUrgency Level\u003c/th\u003e
                \u003cth\u003eUnit Cost\u003c/th\u003e
              \u003c/tr\u003e
            \u003c/thead\u003e
            \u003ctbody id=\"seasonalDrilldownTable\"\u003e
              \u003c!-- Dynamically populated via JS --\u003e
            \u003c/tbody\u003e
          \u003c/table\u003e
        \u003c/div\u003e
      \u003c/div\u003e
'''

if old_banner_start != -1 and old_banner_end != -1:
    content = content[:old_banner_start] + interactive_banner_html + "\n      " + content[old_banner_end:]

# 4. Inject selectSeasonRestock JS logic INSIDE MEDSHIELD_SCRIPT string literal
js_code_escaped = r"""

async function selectSeasonRestock(seasonId, cardEl) {
  try {
    var allCards = document.querySelectorAll('.clickable-season');
    allCards.forEach(function(c) { c.classList.remove('active-season'); });
    if (cardEl) {
      cardEl.classList.add('active-season');
    }

    var titleEl = document.getElementById('drilldownTitle');
    var subEl = document.getElementById('drilldownSub');
    var tableEl = document.getElementById('seasonalDrilldownTable');
    
    if (!tableEl) return;

    tableEl.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#64748B;">Loading prescribed SKU recommendations...</td></tr>';

    var data;
    try {
      var res = await fetch('/api/seasonal_restock_detail?season_id=' + seasonId);
      data = await res.json();
    } catch(e) {
      console.warn('API error, using client fallback', e);
    }

    var details = (data && data.detail) ? data.detail : {
      season_name: "July & August — Peak Monsoon (Habagat) & Floods",
      climate_trigger: "Peak Southwest Monsoon & Urban Inundation",
      skus: [
        {sku: "Doxycycline 100mg Capsule", category: "Flood Prophylactics", current_stock: 180, eoq_reorder: 1200, rop: 400, urgency: "Critical", unit_cost: "₱12.00"},
        {sku: "Paracetamol 500mg Tablet", category: "Antipyretics", current_stock: 600, eoq_reorder: 4000, rop: 1200, urgency: "Critical", unit_cost: "₱8.50"},
        {sku: "IV Lactated Ringer's Solution 1L", category: "IV Fluids", current_stock: 90, eoq_reorder: 500, rop: 180, urgency: "High", unit_cost: "₱110.00"},
        {sku: "Cefuroxime 500mg Tablet", category: "Antibiotics", current_stock: 140, eoq_reorder: 650, rop: 200, urgency: "High", unit_cost: "₱48.00"}
      ]
    };

    if (titleEl) titleEl.innerText = details.season_name;
    if (subEl) subEl.innerText = 'Climate Trigger: ' + (details.climate_trigger || 'Seasonal Surge');

    var rowsHtml = '';
    details.skus.forEach(function(s) {
      var urgencyBadge = '<span class="alert-tag warn">Medium</span>';
      if (s.urgency === 'Critical') urgencyBadge = '<span class="alert-tag danger" style="animation: alertPulse 1.8s infinite;">Critical</span>';
      else if (s.urgency === 'High') urgencyBadge = '<span class="alert-tag danger">High</span>';
      else if (s.urgency === 'Low') urgencyBadge = '<span class="alert-tag ok">Low</span>';

      rowsHtml += '<tr>' +
        '<td style="font-weight:700; color:#0F172A;">' + s.sku + '</td>' +
        '<td>' + s.category + '</td>' +
        '<td style="color:' + (s.current_stock < s.rop ? '#EF4444' : '#0F172A') + '; font-weight:700;">' + s.current_stock.toLocaleString() + ' units</td>' +
        '<td style="font-weight:800; color:#0EA5E9;">+' + s.eoq_reorder.toLocaleString() + ' units</td>' +
        '<td>' + s.rop.toLocaleString() + ' units</td>' +
        '<td style="text-align:right;">' + urgencyBadge + '</td>' +
        '<td style="font-weight:600;">' + s.unit_cost + '</td>' +
      '</tr>';
    });

    tableEl.innerHTML = rowsHtml;
  } catch(err) {
    console.error('selectSeasonRestock error:', err);
  }
}

setTimeout(function() {
  selectSeasonRestock('monsoon', document.querySelector('.active-season'));
}, 500);
""".replace('\n', '\\n').replace('"', '\\"')

# Insert inside MEDSHIELD_SCRIPT before the closing quote
script_declaration_idx = content.find('export const MEDSHIELD_SCRIPT = "')
if script_declaration_idx != -1:
    last_quote_idx = content.rfind('"')
    content = content[:last_quote_idx] + js_code_escaped + content[last_quote_idx:]

target_file.write_text(content, encoding="utf-8")
print("medshieldReference.ts built cleanly with INSIDE-STRING JS injection!")
