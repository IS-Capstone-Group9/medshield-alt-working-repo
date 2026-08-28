"""
Fix MEDSHIELD_SCRIPT: wrap all bare top-level functions so they are
window-scoped and accessible from onclick= HTML attributes.

Strategy: Wrap the entire script content in an IIFE that assigns
every function to window, OR simply prepend 'window.' to the key
functions called from onclick attributes.

Simpler & safer approach: find the MEDSHIELD_SCRIPT string value,
and inject 'if (typeof window !== "undefined") {' guard at the top
while changing bare function declarations that are called from HTML
to window assignments.
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path

ts_file = Path('frontend/lib/medshieldReference.ts')
content = ts_file.read_text(encoding='utf-8')

# Find the script export
script_marker = 'export const MEDSHIELD_SCRIPT = "'
script_start = content.find(script_marker)
if script_start == -1:
    print("ERROR: Could not find MEDSHIELD_SCRIPT")
    sys.exit(1)

# The script content is the string between the opening " and closing "
# (accounting for \" escapes inside)
str_start = script_start + len(script_marker)
# Walk to find the real closing quote
i = str_start
while i < len(content):
    if content[i] == '"' and content[i-1] != '\\':
        break
    i += 1
script_str_end = i  # position of closing "

script_body = content[str_start:script_str_end]

print(f"Script body length: {len(script_body)} chars")
print(f"Current bare functions count: {len(re.findall(r'(?<!window\\.)function ', script_body))}")

# The fix: the script body is already inside a <script> tag injected into the DOM.
# All we need is to ensure the functions are on window.
# 
# Most robust fix: prepend a line that assigns all top-level functions to window
# via a wrapper. We do this by inserting at the START of the script body:
#   'if(typeof window!=="undefined"){var _w=window;'
# and at the END:
#   Functions are already accessible because they're declared in the same scope
#   as the inline script tag — BUT Next.js may run this in a different context.
#
# REAL fix: just assign each bare function explicitly to window at the END.
# Find all bare function names that are called from onclick attributes.

# Get the HTML markup to find which functions are called from onclick
markup_marker = 'export const MEDSHIELD_MARKUP = "'
markup_start = content.find(markup_marker)
markup_str_start = markup_start + len(markup_marker)
j = markup_str_start
while j < len(content):
    if content[j] == '"' and content[j-1] != '\\':
        break
    j += 1
markup_body = content[markup_str_start:j]

# Find all onclick function calls
onclick_funcs = set(re.findall(r'onclick=\\\"(\w+)\(', markup_body))
onclick_funcs |= set(re.findall(r"onclick=\\\'(\w+)\(", markup_body))
# Also check unescaped (in case)
onclick_funcs |= set(re.findall(r'onclick="(\w+)\(', markup_body))
print(f"Functions called from onclick: {sorted(onclick_funcs)}")

# Build window assignment block to append to end of script
# These will run after all function declarations, making them globally accessible
window_assignments = '\n'.join(
    f'if(typeof window!=="undefined")window.{fn}={fn};'
    for fn in sorted(onclick_funcs)
    if fn not in ('selectSeasonRestock',)  # already window-scoped
)
print(f"\nWindow assignment block:\n{window_assignments}")

# Also find event handlers on elements (like nav toggles)
# Add the key interactive functions needed for navigation
extra_funcs = [
    'showPage', 'toggleNavigation', 'closeNavigation', 'toggleTheme',
    'openHelp', 'setYear', 'setYoYYear', 'setComparisonMode',
    'applyTheme', 'buildCharts', 'buildTables', 'setUploadLog',
    'applyPageSelection', 'setNavigationState', 'applyResponsiveNavigation',
    'resizeCharts', 'updateNavigationToggle',
]
for fn in extra_funcs:
    if fn not in onclick_funcs and f'function {fn}' in script_body.replace('\\n', '\n'):
        window_assignments += f'\nif(typeof window!=="undefined")window.{fn}={fn};'

# Escape for injection back into the TS string
assignment_escaped = window_assignments.replace('\n', '\\n').replace('"', '\\"')

# Append window assignments just before the closing quote of MEDSHIELD_SCRIPT
new_script_body = script_body + '\\n' + assignment_escaped

new_content = (
    content[:str_start] +
    new_script_body +
    content[script_str_end:]
)

ts_file.write_text(new_content, encoding='utf-8')
print(f"\n✅ Written. File length: {len(new_content)} chars")
print("✅ Window assignments injected into MEDSHIELD_SCRIPT")
