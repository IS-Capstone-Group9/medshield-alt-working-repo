import pathlib, json, re, subprocess

ref_path = pathlib.Path('frontend/lib/medshieldReference.ts')
content = ref_path.read_text(encoding='utf-8')

# Extract MEDSHIELD_SCRIPT using regex and json.loads
pattern = r'export const MEDSHIELD_SCRIPT = ((".*?")|(\'.*?\')|(`.*?`));'
match = re.search(pattern, content, re.DOTALL)
if not match:
    pattern = r'export const MEDSHIELD_SCRIPT = ((".*?")|(\'.*?\')|(`.*?`))'
    match = re.search(pattern, content, re.DOTALL)

script = json.loads(match.group(1))

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

res = re.sub(r'\n}\);\s*$', f'\n}})();\n{globalHandlerBridge}', patchedScript)

executable = f"""
const window = {{}};
const document = {{
  documentElement: {{
    dataset: {{}}
  }},
  querySelectorAll: () => []
}};
const Chart = {{}};
function dashboardThemeColor(name, fallback) {{ return fallback; }}
{res}
"""

pathlib.Path('scratch/executable.js').write_text(executable, encoding='utf-8')

# Run node on executable.js and capture error
run = subprocess.run(['node', 'scratch/executable.js'], capture_output=True, text=True)
print("Node return code:", run.returncode)
if run.returncode != 0:
    print("Node Error Output:")
    print(run.stderr)
else:
    print("No syntax errors found by Node!")
