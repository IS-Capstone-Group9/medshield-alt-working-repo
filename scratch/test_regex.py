import pathlib, re

# Let's import the values or parse them from page.tsx and medshieldReference.ts
ref_path = pathlib.Path('frontend/lib/medshieldReference.ts')
content = ref_path.read_text(encoding='utf-8')
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

# Let's inspect the end of script
print("End of script:")
print(repr(script[-50:]))

# Run the exact replace regex
patchedScript = script.replace("window.addEventListener('DOMContentLoaded', async () => {", '(async () => {')
# Check regex match
has_match = re.search(r'\n}\);\s*$', patchedScript)
print("Regex matches ending:", bool(has_match))

if has_match:
    replaced = re.sub(r'\n}\);\s*$', f'\n}})();\n{globalHandlerBridge}', patchedScript)
    print("Replaced script successfully.")
    print("Last 100 characters of replaced script:")
    print(replaced[-150:])
else:
    print("REGEX MATCH FAILED! The script ending was not matched.")
