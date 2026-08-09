import pathlib

p = pathlib.Path('frontend/lib/medshieldReference.ts')
content = p.read_text(encoding='utf-8')
lines = content.splitlines()

script_raw = lines[4].split(' = ', 1)[1]
if script_raw.startswith('"') or script_raw.startswith("'"):
    script_raw = script_raw[1:]
if script_raw.endswith('"') or script_raw.endswith("'"):
    script_raw = script_raw[:-1]
script = script_raw.replace('\\n', '\n').replace("\\'", "'").replace('\\"', '"')

DASHBOARD_GLOBAL_HANDLERS = [
  'showPage',
  'toggleTheme',
  'openHelp',
  'closeNavigation',
  'toggleNavigation',
  'setComparisonMode',
  'setYear',
  'setYoYYear',
  'refreshComparison',
  'applyDatasetPatch',
  'buildCharts',
]

globalHandlerBridge = "\n".join([f"if (typeof {name} === 'function') window.{name} = {name};" for name in DASHBOARD_GLOBAL_HANDLERS])

patchedScript = script.replace("window.addEventListener('DOMContentLoaded', async () => {", '(async () => {')
patchedScript = patchedScript.replace("'#335F78'", "dashboardThemeColor('--chart-label', '#335F78')")
patchedScript = patchedScript.replace("'#67879A'", "dashboardThemeColor('--chart-muted', '#67879A')")
patchedScript = patchedScript.replace("'rgba(201,219,229,0.65)'", "dashboardThemeColor('--chart-grid', 'rgba(201,219,229,0.65)')")

# Try to find exactly what replaces
import re
print("Has simple match for \\n}); :", "\n});" in patchedScript)
print("Ending block of patchedScript:")
print(repr(patchedScript[-100:]))

res = re.sub(r'\n}\);\s*$', f'\n}})();\n{globalHandlerBridge}', patchedScript)
print("Patched script ending (re.sub):")
print(repr(res[-200:]))
