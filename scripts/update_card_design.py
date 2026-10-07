import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

# ==========================================
# 1. Update frontend/app/overrides.css
# ==========================================
with open('frontend/app/overrides.css', 'r', encoding='utf-8') as f:
    overrides_text = f.read()

# Replace lines 404-486 in overrides.css with the new plain card design
target_kpi_block = """.kpi-card {
  position: relative !important;
  min-height: 136px;
  padding: 18px 20px 16px 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(16, 47, 69, 0.05), 0 1px 2px rgba(16, 47, 69, 0.03);
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.kpi-card,
.kpi-card:nth-child(1),
.kpi-card:nth-child(2),
.kpi-card:nth-child(3),
.kpi-card:nth-child(4) {
  border-top: 1px solid var(--border) !important;
}
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3.5px;
  background: var(--card-accent, #1b6070);
  border-radius: 3px 0 0 3px;
  transition: width 0.15s ease;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -2px rgba(16, 47, 69, 0.08), 0 2px 6px -1px rgba(16, 47, 69, 0.04);
  border-color: var(--border-strong) !important;
}
.kpi-card:hover::before {
  width: 5px;
}
.kpi-card-revenue { --card-accent: #1b6070; }
.kpi-card-forecast { --card-accent: #0284c7; }
.kpi-card-season { --card-accent: #f59e0b; }
.kpi-card-territory { --card-accent: #0d7045; }

.kpi-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.kpi-label {
  font-family: 'League Spartan', var(--font-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  line-height: 1.3;
  margin-bottom: 0;
}
.kpi-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-elevated);
  color: var(--card-accent, #1b6070);
  border: 1px solid rgba(213, 223, 233, 0.8);
  transition: background 0.15s ease, transform 0.15s ease;
}
.kpi-card:hover .kpi-icon-badge {
  transform: scale(1.05);
}
.kpi-card-revenue .kpi-icon-badge { background: rgba(27, 96, 112, 0.08); color: #1b6070; border-color: rgba(27, 96, 112, 0.2); }
.kpi-card-forecast .kpi-icon-badge { background: rgba(2, 132, 199, 0.08); color: #0284c7; border-color: rgba(2, 132, 199, 0.2); }
.kpi-card-season .kpi-icon-badge { background: rgba(245, 158, 11, 0.1); color: #d97706; border-color: rgba(245, 158, 11, 0.25); }
.kpi-card-territory .kpi-icon-badge { background: rgba(13, 112, 69, 0.08); color: #0d7045; border-color: rgba(13, 112, 69, 0.2); }"""

replacement_kpi_block = """.kpi-card {
  position: relative !important;
  min-height: 136px;
  padding: 20px 22px 18px 22px !important;
  background: #FFFFFF !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.kpi-card,
.kpi-card:nth-child(1),
.kpi-card:nth-child(2),
.kpi-card:nth-child(3),
.kpi-card:nth-child(4) {
  border-top: 1px solid var(--border) !important;
}
.kpi-card::before,
.kpi-card:hover::before,
.kpi-card:nth-child(1)::before,
.kpi-card:nth-child(2)::before,
.kpi-card:nth-child(3)::before,
.kpi-card:nth-child(4)::before {
  display: none !important;
  content: none !important;
}
.kpi-card:hover {
  transform: none !important;
  border-color: var(--border-strong, #B0C4D8) !important;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08) !important;
}
.kpi-card-revenue,
.kpi-card-forecast,
.kpi-card-season,
.kpi-card-territory {
  --card-accent: transparent;
}

.kpi-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.kpi-label {
  font-family: var(--font-body);
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--text-muted, #7A95B0) !important;
  line-height: 1.3 !important;
  margin-bottom: 0 !important;
}
.kpi-icon-badge {
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--text-muted, #7A95B0) !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  opacity: 0.65;
  transition: opacity 0.15s ease, color 0.15s ease;
}
.kpi-card:hover .kpi-icon-badge {
  transform: none !important;
  opacity: 1 !important;
  color: var(--accent, #1E3A5F) !important;
}
.kpi-card-revenue .kpi-icon-badge,
.kpi-card-forecast .kpi-icon-badge,
.kpi-card-season .kpi-icon-badge,
.kpi-card-territory .kpi-icon-badge {
  background: transparent !important;
  border: none !important;
  color: var(--text-muted, #7A95B0) !important;
}"""

# Section 1 chart-card replacement in overrides.css
target_chart_card_block = """.medshield-root .chart-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 20px 22px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(26, 43, 60, 0.05));
  margin-bottom: 20px;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.medshield-root .chart-card:hover {
  box-shadow: var(--shadow-md, 0 4px 12px rgba(26, 43, 60, 0.08));
}"""

replacement_chart_card_block = """.medshield-root .chart-card,
.chart-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  padding: 20px 22px;
  background: #FFFFFF !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
  margin-bottom: 20px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.medshield-root .chart-card:hover,
.chart-card:hover {
  transform: none !important;
  border-color: var(--border-strong, #B0C4D8) !important;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08) !important;
}

/* Remove generic amber title ticks and card model bars */
.chart-title::before,
.medshield-root .chart-title::before,
.chart-card[data-model]::before {
  display: none !important;
  content: none !important;
}

/* Sub-cards and hero panels */
[data-forecast-validation] .forecast-hero-card,
[data-forecast-validation] .decomp-card,
[data-planning] .plan-hero-card,
.dss-insight-card,
.insight-card {
  background: #FFFFFF !important;
  border: 1px solid var(--border) !important;
  border-radius: 10px !important;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

[data-forecast-validation] .forecast-hero-card:hover,
[data-forecast-validation] .decomp-card:hover,
[data-planning] .plan-hero-card:hover,
.dss-insight-card:hover,
.insight-card:hover {
  border-color: var(--border-strong, #B0C4D8) !important;
}"""

def norm(s):
    return s.replace('\r\n', '\n')

overrides_norm = norm(overrides_text)
if norm(target_kpi_block) in overrides_norm:
    overrides_norm = overrides_norm.replace(norm(target_kpi_block), norm(replacement_kpi_block))
    print("SUCCESS: Replaced target_kpi_block in overrides.css")
else:
    print("WARNING: target_kpi_block not found in overrides.css")

if norm(target_chart_card_block) in overrides_norm:
    overrides_norm = overrides_norm.replace(norm(target_chart_card_block), norm(replacement_chart_card_block))
    print("SUCCESS: Replaced target_chart_card_block in overrides.css")
else:
    print("WARNING: target_chart_card_block not found in overrides.css")

crlf = '\r\n' in overrides_text
with open('frontend/app/overrides.css', 'w', encoding='utf-8') as f:
    f.write(overrides_norm.replace('\n', '\r\n') if crlf else overrides_norm)
print("Updated overrides.css")


# ==========================================
# 2. Update frontend/lib/medshieldReference.ts
# ==========================================
with open('frontend/lib/medshieldReference.ts', 'r', encoding='utf-8') as f:
    ref_text = f.read()

ref_norm = norm(ref_text)

# Replace MEDSHIELD_KPI_STYLE definition
target_ref_kpi = """export const MEDSHIELD_KPI_STYLE = `
/* -- CLINICAL DECISION-SUPPORT KPI CARDS -- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.kpi-card {
  position: relative !important;
  background: var(--bg-surface);
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  padding: 18px 20px 16px 20px !important;
  box-shadow: 0 1px 3px rgba(16, 47, 69, 0.05), 0 1px 2px rgba(16, 47, 69, 0.03) !important;
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.18s ease !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 136px;
}
.kpi-card,
.kpi-card:nth-child(1),
.kpi-card:nth-child(2),
.kpi-card:nth-child(3),
.kpi-card:nth-child(4) {
  border-top: 1px solid var(--border) !important;
}
.kpi-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3.5px;
  background: var(--card-accent, #1b6070);
  border-radius: 3px 0 0 3px;
  transition: width 0.15s ease;
}
.kpi-card:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px -2px rgba(16, 47, 69, 0.08), 0 2px 6px -1px rgba(16, 47, 69, 0.04) !important;
  border-color: var(--border-strong) !important;
}
.kpi-card:hover::before {
  width: 5px;
}
.kpi-card-revenue { --card-accent: #1b6070; }
.kpi-card-forecast { --card-accent: #0284c7; }
.kpi-card-season { --card-accent: #f59e0b; }
.kpi-card-territory { --card-accent: #0d7045; }

.kpi-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.kpi-label {
  font-family: 'League Spartan', var(--font-body);
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--text-secondary) !important;
  line-height: 1.3 !important;
  margin-bottom: 0 !important;
}
.kpi-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-elevated);
  color: var(--card-accent, #1b6070);
  border: 1px solid rgba(213, 223, 233, 0.8);
  transition: background 0.15s ease, transform 0.15s ease;
}
.kpi-card:hover .kpi-icon-badge {
  transform: scale(1.05);
}
.kpi-card-revenue .kpi-icon-badge { background: rgba(27, 96, 112, 0.08); color: #1b6070; border-color: rgba(27, 96, 112, 0.2); }
.kpi-card-forecast .kpi-icon-badge { background: rgba(2, 132, 199, 0.08); color: #0284c7; border-color: rgba(2, 132, 199, 0.2); }
.kpi-card-season .kpi-icon-badge { background: rgba(245, 158, 11, 0.1); color: #d97706; border-color: rgba(245, 158, 11, 0.25); }
.kpi-card-territory .kpi-icon-badge { background: rgba(13, 112, 69, 0.08); color: #0d7045; border-color: rgba(13, 112, 69, 0.2); }"""

replacement_ref_kpi = """export const MEDSHIELD_KPI_STYLE = `
/* -- CLINICAL DECISION-SUPPORT KPI CARDS -- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.kpi-card {
  position: relative !important;
  background: #FFFFFF !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  padding: 20px 22px 18px 22px !important;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04) !important;
  transition: border-color 0.18s ease, box-shadow 0.18s ease !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 136px;
}
.kpi-card,
.kpi-card:nth-child(1),
.kpi-card:nth-child(2),
.kpi-card:nth-child(3),
.kpi-card:nth-child(4) {
  border-top: 1px solid var(--border) !important;
}
.kpi-card::before,
.kpi-card:hover::before,
.kpi-card:nth-child(1)::before,
.kpi-card:nth-child(2)::before,
.kpi-card:nth-child(3)::before,
.kpi-card:nth-child(4)::before {
  display: none !important;
  content: none !important;
}
.kpi-card:hover {
  transform: none !important;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08) !important;
  border-color: var(--border-strong, #B0C4D8) !important;
}
.kpi-card-revenue,
.kpi-card-forecast,
.kpi-card-season,
.kpi-card-territory {
  --card-accent: transparent;
}

.kpi-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.kpi-label {
  font-family: var(--font-body);
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.06em !important;
  text-transform: uppercase !important;
  color: var(--text-muted, #7A95B0) !important;
  line-height: 1.3 !important;
  margin-bottom: 0 !important;
}
.kpi-icon-badge {
  width: auto !important;
  height: auto !important;
  border-radius: 0 !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  color: var(--text-muted, #7A95B0) !important;
  padding: 0 !important;
  display: inline-flex !important;
  align-items: center !important;
  opacity: 0.65;
  transition: opacity 0.15s ease, color 0.15s ease;
}
.kpi-card:hover .kpi-icon-badge {
  transform: none !important;
  opacity: 1 !important;
  color: var(--accent, #1E3A5F) !important;
}
.kpi-card-revenue .kpi-icon-badge,
.kpi-card-forecast .kpi-icon-badge,
.kpi-card-season .kpi-icon-badge,
.kpi-card-territory .kpi-icon-badge {
  background: transparent !important;
  border: none !important;
  color: var(--text-muted, #7A95B0) !important;
}"""

if norm(target_ref_kpi) in ref_norm:
    ref_norm = ref_norm.replace(norm(target_ref_kpi), norm(replacement_ref_kpi))
    print("SUCCESS: Replaced target_ref_kpi in medshieldReference.ts")
else:
    print("WARNING: target_ref_kpi not found in medshieldReference.ts")

# Remove amber title tick in MEDSHIELD_BASE_STYLE
target_title_tick = """.chart-title::before {\\n  content: '';\\n  width: 3.5px;\\n  height: 16px;\\n  border-radius: 2px;\\n  background: linear-gradient(180deg, #F59E0B, #D97706);\\n  flex-shrink: 0;\\n  display: inline-block;\\n}"""
replacement_title_tick = """.chart-title::before {\\n  display: none !important;\\n  content: none !important;\\n}"""

if target_title_tick in ref_norm:
    ref_norm = ref_norm.replace(target_title_tick, replacement_title_tick)
    print("SUCCESS: Removed amber chart-title::before in medshieldReference.ts")
else:
    print("WARNING: target_title_tick not found in medshieldReference.ts")

# Remove chart-card hover translateY in MEDSHIELD_BASE_STYLE
target_cc_hover = """.chart-card:hover {\\n  box-shadow: 0 6px 20px rgba(13,27,42,0.07);\\n  transform: translateY(-2px);\\n}"""
replacement_cc_hover = """.chart-card:hover {\\n  box-shadow: 0 1px 3px rgba(16,24,40,0.08);\\n  transform: none;\\n}"""
if target_cc_hover in ref_norm:
    ref_norm = ref_norm.replace(target_cc_hover, replacement_cc_hover)
    print("SUCCESS: Replaced chart-card hover in medshieldReference.ts")
else:
    print("WARNING: target_cc_hover not found in medshieldReference.ts")

crlf_ref = '\r\n' in ref_text
with open('frontend/lib/medshieldReference.ts', 'w', encoding='utf-8') as f:
    f.write(ref_norm.replace('\n', '\r\n') if crlf_ref else ref_norm)
print("Updated medshieldReference.ts")


# ==========================================
# 3. Update frontend/services/api/forecast-validation-runtime.ts
# ==========================================
with open('frontend/services/api/forecast-validation-runtime.ts', 'r', encoding='utf-8') as f:
    fc_text = f.read()

fc_norm = norm(fc_text)
old_fc = "[data-forecast-validation] .forecast-hero-card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elevated,#f8fafc); }"
new_fc = "[data-forecast-validation] .forecast-hero-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }"

old_decomp = "[data-forecast-validation] .decomp-card { background: var(--bg-elevated,#f8fafc); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; }"
new_decomp = "[data-forecast-validation] .decomp-card { background: #FFFFFF; border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }"

if old_fc in fc_norm:
    fc_norm = fc_norm.replace(old_fc, new_fc)
    print("SUCCESS: Replaced old_fc in forecast-validation-runtime.ts")
if old_decomp in fc_norm:
    fc_norm = fc_norm.replace(old_decomp, new_decomp)
    print("SUCCESS: Replaced old_decomp in forecast-validation-runtime.ts")

crlf_fc = '\r\n' in fc_text
with open('frontend/services/api/forecast-validation-runtime.ts', 'w', encoding='utf-8') as f:
    f.write(fc_norm.replace('\n', '\r\n') if crlf_fc else fc_norm)
print("Updated forecast-validation-runtime.ts")


# ==========================================
# 4. Update frontend/services/api/prescriptive-planning-runtime.ts
# ==========================================
with open('frontend/services/api/prescriptive-planning-runtime.ts', 'r', encoding='utf-8') as f:
    plan_text = f.read()

plan_norm = norm(plan_text)
old_plan = "[data-planning] .plan-hero-card { padding: 12px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elevated,#f8fafc); }"
new_plan = "[data-planning] .plan-hero-card { padding: 14px 16px; border: 1px solid var(--border); border-radius: 8px; background: #FFFFFF; box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04); }"

if old_plan in plan_norm:
    plan_norm = plan_norm.replace(old_plan, new_plan)
    print("SUCCESS: Replaced old_plan in prescriptive-planning-runtime.ts")

crlf_plan = '\r\n' in plan_text
with open('frontend/services/api/prescriptive-planning-runtime.ts', 'w', encoding='utf-8') as f:
    f.write(plan_norm.replace('\n', '\r\n') if crlf_plan else plan_norm)
print("Updated prescriptive-planning-runtime.ts")
