import pathlib, json

style = pathlib.Path('scratch/style.css').read_text(encoding='utf-8')
markup = pathlib.Path('scratch/markup.html').read_text(encoding='utf-8')
script = pathlib.Path('scratch/script.js').read_text(encoding='utf-8')

# Clean trailing whitespace/newlines from script to match regex requirements
script = script.rstrip()

# Use json.dumps to generate perfectly escaped JS string literals
json_style = json.dumps(style)
json_markup = json.dumps(markup)
json_script = json.dumps(script)

ref_path = pathlib.Path('frontend/lib/medshieldReference.ts')
content = [
    f'export const MEDSHIELD_STYLE = {json_style};',
    "",
    f'export const MEDSHIELD_MARKUP = {json_markup};',
    "",
    f'export const MEDSHIELD_SCRIPT = {json_script};',
    ""
]

ref_path.write_text("\n".join(content), encoding='utf-8')
print("Successfully packed CSS, HTML, and JS using json.dumps into medshieldReference.ts in alt repo!")
print("File size:", len(ref_path.read_text(encoding='utf-8')))
