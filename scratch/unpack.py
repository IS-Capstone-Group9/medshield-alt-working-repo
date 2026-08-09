import pathlib, json, re

ref_path = pathlib.Path('frontend/lib/medshieldReference.ts')
content = ref_path.read_text(encoding='utf-8')

# Extract TS string literals using json parser
def extract_ts_string(name, content):
    pattern = rf'export const {name} = ((".*?")|(\'.*?\')|(`.*?`));'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        # Fallback if no semicolon
        pattern = rf'export const {name} = ((".*?")|(\'.*?\')|(`.*?`))'
        match = re.search(pattern, content, re.DOTALL)
    
    val = match.group(1)
    # Convert to valid JSON string if it is single-quoted
    if val.startswith("'"):
        # Replace unescaped double quotes, escape them, and convert single quotes to double quotes
        # For our json.dumps generated file, it is always double-quoted, so json.loads works directly!
        pass
    return json.loads(val)

style = extract_ts_string('MEDSHIELD_STYLE', content)
markup = extract_ts_string('MEDSHIELD_MARKUP', content)
script = extract_ts_string('MEDSHIELD_SCRIPT', content)

pathlib.Path('scratch/style.css').write_text(style, encoding='utf-8')
pathlib.Path('scratch/markup.html').write_text(markup, encoding='utf-8')
pathlib.Path('scratch/script.js').write_text(script, encoding='utf-8')

print("Unpacked successfully using json.loads!")
print("Style size:", len(style))
print("Markup size:", len(markup))
print("Script size:", len(script))
