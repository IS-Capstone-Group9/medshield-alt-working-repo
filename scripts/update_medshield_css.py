with open('frontend/app/medshield.css', 'r', encoding='utf-8') as f:
    content = f.read()

target = """.chart-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 14px; margin-bottom: 14px; }
.chart-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 14px; }
.chart-full { margin-bottom: 14px; }
.chart-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 22px; box-shadow: var(--shadow-sm); transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition), background var(--transition); }
.chart-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.chart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.chart-title { font-family: var(--font-display); font-size: 15px; color: var(--text-primary); }
.chart-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.chart-badge { font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 10px; background: var(--accent-light); color: var(--accent); letter-spacing: 0.04em; text-transform: uppercase; }
.chart-wrap { position: relative; width: 100%; min-height: 180px; aspect-ratio: var(--chart-ratio, 16 / 9); max-height: var(--chart-max-height, 320px); border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, #FCFEFF 0%, #F3F8FB 100%); }
.chart-wrap::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(223,236,244,0.4) 0%, rgba(255,255,255,0.86) 50%, rgba(223,236,244,0.4) 100%); background-size: 220% 100%; animation: chartShimmer 1.3s linear infinite; opacity: 0; pointer-events: none; transition: opacity var(--transition); }
.chart-wrap[data-state="loading"]::before, .chart-wrap[data-state="empty"]::before { opacity: 1; }
.chart-wrap[data-state="ready"]::before { animation: none; opacity: 0; }
.chart-wrap::after { content: attr(data-empty-message); position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; font-size: 12px; font-weight: 600; color: var(--text-secondary); opacity: 0; pointer-events: none; }
.chart-wrap[data-state="empty"]::after { opacity: 1; }
.chart-wrap canvas { width: 100% !important; height: 100% !important; transition: opacity 0.18s ease; cursor: crosshair; }
.chart-wrap[data-state="loading"] canvas, .chart-wrap[data-state="empty"] canvas { opacity: 0.18; }
.chart-wrap.h180 { --chart-ratio: 18 / 6; --chart-max-height: 190px; }
.chart-wrap.h200 { --chart-ratio: 18 / 7; --chart-max-height: 210px; }
.chart-wrap.h220 { --chart-ratio: 16 / 9; --chart-max-height: 230px; }
.chart-wrap.h240 { --chart-ratio: 16 / 9; --chart-max-height: 250px; }
.chart-wrap.h260 { --chart-ratio: 16 / 9; --chart-max-height: 270px; }
.chart-wrap.h280 { --chart-ratio: 15 / 9; --chart-max-height: 290px; }
.chart-wrap.h300 { --chart-ratio: 15 / 9; --chart-max-height: 310px; }"""

replacement = """.chart-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
.chart-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
.chart-full { width: 100%; margin-bottom: 20px; }
.chart-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px 22px; margin-bottom: 20px; box-shadow: var(--shadow-sm); transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition), background var(--transition); }
.chart-grid-2 .chart-card, .chart-grid-3 .chart-card { margin-bottom: 0; }
.chart-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); border-color: var(--border-strong); }
.chart-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px 16px; margin-bottom: 16px; flex-wrap: wrap; }
.chart-title { font-family: var(--font-display); font-size: 14.5px; color: var(--text-primary); font-weight: 700; overflow-wrap: break-word; }
.chart-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 3px; line-height: 1.45; overflow-wrap: break-word; }
.chart-badge { font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 10px; background: var(--accent-light); color: var(--accent); letter-spacing: 0.04em; text-transform: uppercase; }
.chart-wrap { position: relative; width: 100%; min-width: 0; min-height: 0; height: 300px; border-radius: 12px; overflow: hidden; background: linear-gradient(180deg, #FCFEFF 0%, #F3F8FB 100%); }
.chart-wrap::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(223,236,244,0.4) 0%, rgba(255,255,255,0.86) 50%, rgba(223,236,244,0.4) 100%); background-size: 220% 100%; animation: chartShimmer 1.3s linear infinite; opacity: 0; pointer-events: none; transition: opacity var(--transition); }
.chart-wrap[data-state="loading"]::before, .chart-wrap[data-state="empty"]::before { opacity: 1; }
.chart-wrap[data-state="ready"]::before { animation: none; opacity: 0; }
.chart-wrap::after { content: attr(data-empty-message); position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 20px; text-align: center; font-size: 12px; font-weight: 600; color: var(--text-secondary); opacity: 0; pointer-events: none; }
.chart-wrap[data-state="empty"]::after { opacity: 1; }
.chart-wrap canvas { display: block; width: 100% !important; height: 100% !important; transition: opacity 0.18s ease; cursor: crosshair; }
.chart-wrap[data-state="loading"] canvas, .chart-wrap[data-state="empty"] canvas { opacity: 0.18; }
.chart-wrap.h260 { height: 260px; }
.chart-wrap.h280 { height: 280px; }
.chart-wrap.h300 { height: 310px; }
.chart-wrap.chart-hero { height: 360px; }"""

norm_content = content.replace('\r\n', '\n')
norm_target = target.replace('\r\n', '\n')

if norm_target in norm_content:
    norm_content = norm_content.replace(norm_target, replacement)
    with open('frontend/app/medshield.css', 'w', encoding='utf-8') as f:
        f.write(norm_content)
    print("SUCCESS: Updated medshield.css")
else:
    print("ERROR: Target content not found in medshield.css")
