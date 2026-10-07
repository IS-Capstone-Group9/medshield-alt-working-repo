import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/lib/medshieldReference.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the base styles in MEDSHIELD_BASE_STYLE
target_style = """.chart-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 460px), 1fr)); gap: 16px; margin-bottom: 16px; }\\n.chart-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 22px; box-shadow: var(--shadow-xs); transition: box-shadow 0.15s var(--ease-smooth); }\\n.chart-card:hover { box-shadow: var(--shadow-md); }\\n.chart-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 12px; }\\n.chart-title { font-size: 14px; color: var(--text-primary); font-weight: 700; letter-spacing: -0.02em; }\\n.chart-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 3px; font-weight: 400; }\\n.chart-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: rgba(30,58,95,0.07); color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; border: 1px solid rgba(30,58,95,0.1); }\\n.chart-wrap { position: relative; width: 100%; border-radius: 8px; background: #FAFBFD; border: 1px solid rgba(213,223,233,0.5); }\\n.chart-wrap.h260 { height: 260px; }\\n.chart-wrap.h300 { height: 300px; }"""

replacement_style = """.chart-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }\\n.chart-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }\\n.chart-full { width: 100%; margin-bottom: 20px; }\\n.chart-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px 22px; margin-bottom: 20px; box-shadow: var(--shadow-xs); transition: box-shadow 0.15s var(--ease-smooth); }\\n.chart-grid-2 .chart-card, .chart-grid-3 .chart-card { margin-bottom: 0; }\\n.chart-card:hover { box-shadow: var(--shadow-md); }\\n.chart-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; gap: 10px 16px; flex-wrap: wrap; }\\n.chart-title { font-size: 14.5px; color: var(--text-primary); font-weight: 700; letter-spacing: -0.015em; overflow-wrap: break-word; }\\n.chart-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 3px; font-weight: 400; line-height: 1.45; overflow-wrap: break-word; }\\n.chart-badge { font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 20px; background: rgba(30,58,95,0.07); color: var(--accent); text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; border: 1px solid rgba(30,58,95,0.1); }\\n.chart-wrap { position: relative; width: 100%; min-width: 0; min-height: 0; border-radius: 8px; background: #FAFBFD; border: 1px solid rgba(213,223,233,0.5); }\\n.chart-wrap canvas { display: block; width: 100% !important; height: 100% !important; }\\n.chart-wrap.h260 { height: 260px; }\\n.chart-wrap.h280 { height: 280px; }\\n.chart-wrap.h300 { height: 310px; }\\n.chart-wrap.chart-hero { height: 360px; }"""

if target_style in content:
    content = content.replace(target_style, replacement_style)
    print("SUCCESS: Replaced target_style in medshieldReference.ts")
else:
    print("WARNING: target_style not directly found in medshieldReference.ts")

# 2. Update media query in MEDSHIELD_BASE_STYLE
mq_target = """@media (max-width: 1100px) {\\n  .chart-grid-2 { grid-template-columns: 1fr; }\\n}"""
mq_replacement = """@media (max-width: 820px) {\\n  .chart-grid-2, .chart-grid-3 { grid-template-columns: 1fr; gap: 16px; margin-bottom: 16px; }\\n  .chart-card { padding: 16px 18px; margin-bottom: 16px; }\\n  .chart-wrap.h300 { height: 270px; }\\n  .chart-wrap.h260 { height: 235px; }\\n  .chart-wrap.chart-hero { height: 290px; }\\n}"""

if mq_target in content:
    content = content.replace(mq_target, mq_replacement)
    print("SUCCESS: Replaced media query in medshieldReference.ts")
else:
    print("WARNING: mq_target not directly found in medshieldReference.ts")

# 3. Update overviewBaselineChart wrapper to chart-hero
ob_target = '<div class=\\"chart-wrap h300\\"><canvas id=\\"overviewBaselineChart\\"></canvas></div>'
ob_replacement = '<div class=\\"chart-wrap chart-hero h300\\"><canvas id=\\"overviewBaselineChart\\"></canvas></div>'
if ob_target in content:
    content = content.replace(ob_target, ob_replacement)
    print("SUCCESS: Updated overviewBaselineChart wrapper")
else:
    print("WARNING: ob_target not found")

# 4. Update revenueDetailChart wrapper to chart-hero
rd_target = '<div class=\\"chart-wrap h300\\"><canvas id=\\"revenueDetailChart\\"></canvas></div>'
rd_replacement = '<div class=\\"chart-wrap chart-hero h300\\"><canvas id=\\"revenueDetailChart\\"></canvas></div>'
if rd_target in content:
    content = content.replace(rd_target, rd_replacement)
    print("SUCCESS: Updated revenueDetailChart wrapper")
else:
    print("WARNING: rd_target not found")

# 5. Make sure the cards enclosing overviewBaselineChart and revenueDetailChart have chart-full class
# Overview:
card_ob_target = '<div class=\\"chart-card\\" style=\\"margin-bottom: 20px;\\">\\n        <div class=\\"chart-header\\">\\n          <div>\\n            <div class=\\"chart-title\\">\\n              Net Sales Revenue &amp; Gross Profit'
card_ob_replacement = '<div class=\\"chart-card chart-full\\" style=\\"margin-bottom: 20px;\\">\\n        <div class=\\"chart-header\\">\\n          <div>\\n            <div class=\\"chart-title\\">\\n              Net Sales Revenue &amp; Gross Profit'
if card_ob_target in content:
    content = content.replace(card_ob_target, card_ob_replacement)
    print("SUCCESS: Updated overview card with chart-full")

# Revenue:
card_rd_target = '<div class=\\"chart-card\\">\\n        <div class=\\"chart-header\\">\\n          <div>\\n            <div class=\\"chart-title\\">Monthly Net Sales Revenue and Gross Profit</div>'
card_rd_replacement = '<div class=\\"chart-card chart-full\\" style=\\"margin-bottom: 20px;\\">\\n        <div class=\\"chart-header\\">\\n          <div>\\n            <div class=\\"chart-title\\">Monthly Net Sales Revenue and Gross Profit</div>'
if card_rd_target in content:
    content = content.replace(card_rd_target, card_rd_replacement)
    print("SUCCESS: Updated revenue card with chart-full and margin-bottom")

with open('frontend/lib/medshieldReference.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished writing medshieldReference.ts")
