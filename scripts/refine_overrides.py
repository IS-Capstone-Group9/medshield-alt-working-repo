with open('frontend/app/overrides.css', 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize CRLF
crlf = '\r\n' in text
linesep = '\r\n' if crlf else '\n'

# 1. Update wrappers and canvas selector
t1 = """.medshield-root .chart-wrap,
.medshield-root .area-chart-wrap,
.medshield-root .reg-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated, #F8FAFC);
  border: 1px solid var(--border, rgba(213, 223, 233, 0.6));
  box-sizing: border-box;
}

.medshield-root .chart-wrap canvas,
.medshield-root .area-chart-wrap canvas,
.medshield-root .reg-wrap canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box;
}"""

r1 = """.medshield-root .chart-wrap,
.medshield-root .area-chart-wrap,
.medshield-root .reg-wrap,
.medshield-root .forecast-chart-wrap,
.medshield-root .plan-chart-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-elevated, #F8FAFC);
  border: 1px solid var(--border, rgba(213, 223, 233, 0.6));
  box-sizing: border-box;
}

.medshield-root .chart-wrap canvas,
.medshield-root .area-chart-wrap canvas,
.medshield-root .reg-wrap canvas,
.medshield-root .forecast-chart-wrap canvas,
.medshield-root .plan-chart-wrap canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box;
}"""

# 2. Update compact charts
t2 = """/* Compact Charts */
.medshield-root .chart-wrap.h260,
.medshield-root .chart-wrap.plan-chart-wrap,
.medshield-root [data-external-regression] .reg-wrap {
  height: 260px;
}"""

r2 = """/* Compact Charts */
.medshield-root .chart-wrap.h260,
.medshield-root .chart-wrap.plan-chart-wrap,
.medshield-root [data-external-regression] .reg-wrap {
  height: 260px;
}

.medshield-root .chart-wrap.h280,
.medshield-root .chart-wrap.plan-chart-wrap.h280 {
  height: 280px;
}"""

# 3. Update 820px media query
t3 = """  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 235px;
  }"""

r3 = """  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 235px;
  }

  .medshield-root .chart-wrap.h280,
  .medshield-root .chart-wrap.plan-chart-wrap.h280 {
    height: 250px;
  }"""

# 4. Update 480px media query
t4 = """  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 215px;
  }"""

r4 = """  .medshield-root .chart-wrap.h260,
  .medshield-root .chart-wrap.plan-chart-wrap,
  .medshield-root [data-external-regression] .reg-wrap {
    height: 215px;
  }

  .medshield-root .chart-wrap.h280,
  .medshield-root .chart-wrap.plan-chart-wrap.h280 {
    height: 230px;
  }"""

def norm(s):
    return s.replace('\r\n', '\n')

text_norm = norm(text)
for idx, (t, r) in enumerate([(t1, r1), (t2, r2), (t3, r3), (t4, r4)], 1):
    if norm(t) in text_norm:
        text_norm = text_norm.replace(norm(t), norm(r))
        print(f"SUCCESS: Block {idx} replaced")
    else:
        print(f"WARNING: Block {idx} not found")

if crlf:
    final_text = text_norm.replace('\n', '\r\n')
else:
    final_text = text_norm

with open('frontend/app/overrides.css', 'w', encoding='utf-8') as f:
    f.write(final_text)

print("Done updating overrides.css")
