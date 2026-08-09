from pathlib import Path

file_path = Path("frontend/lib/medshieldReference.ts")
content = file_path.read_text(encoding="utf-8")

# Text replacements for headers and titles
content = content.replace('2021-2026 baseline', '2017-2026 baseline')
content = content.replace('Descriptive: Sales, ABC, Supervised Segmentation (2021-2026)', 'Descriptive: Sales, ABC, Supervised Segmentation (2017-2026)')
content = content.replace('+273% from 2021 to 2026', '+1,675% from 2017 to 2026')
content = content.replace('2021-2025 sales records', '2017-2025 sales records')
content = content.replace('+243% vs 2021', '+1,675% vs 2017')
content = content.replace('Up from &#8369;5.3M in 2021', 'Up from &#8369;467K in 2017')
content = content.replace('Cumulative 2021-2025', 'Cumulative 2017-2025')
content = content.replace('from 2021 to 2025', 'from 2017 to 2026')

# YoY buttons addition
target_yoy_first = r'<button class=\"yr-btn ${selectedYoYYear === \'2021\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2021\', this)\">2021</button>'
prefix_yoy = r'<button class=\"yr-btn ${selectedYoYYear === \'2018\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2018\', this)\">2018</button>\n      <button class=\"yr-btn ${selectedYoYYear === \'2019\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2019\', this)\">2019</button>\n      <button class=\"yr-btn ${selectedYoYYear === \'2020\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2020\', this)\">2020</button>\n      ' + target_yoy_first

target_yoy_last = r'<button class=\"yr-btn ${selectedYoYYear === \'2025\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2025\', this)\">2025</button>'
suffix_yoy = target_yoy_last + r'\n      <button class=\"yr-btn ${selectedYoYYear === \'2026\' ? \'active\' : \'\'}\" onclick=\"setYoYYear(\'2026\', this)\">2026</button>'

if target_yoy_first in content:
    content = content.replace(target_yoy_first, prefix_yoy, 1)
    print("Added 2018-2020 to YoY buttons!")
if target_yoy_last in content:
    content = content.replace(target_yoy_last, suffix_yoy, 1)
    print("Added 2026 to YoY buttons!")

# Custom Year 1 options addition
target_c1_first = r'<option value=\"2021\" ${customCompare.year1 === \'2021\' ? \'selected\' : \'\'}>2021</option>'
prefix_c1 = r'<option value=\"2017\" ${customCompare.year1 === \'2017\' ? \'selected\' : \'\'}>2017</option>\n        <option value=\"2018\" ${customCompare.year1 === \'2018\' ? \'selected\' : \'\'}>2018</option>\n        <option value=\"2019\" ${customCompare.year1 === \'2019\' ? \'selected\' : \'\'}>2019</option>\n        <option value=\"2020\" ${customCompare.year1 === \'2020\' ? \'selected\' : \'\'}>2020</option>\n        ' + target_c1_first

target_c1_last = r'<option value=\"2025\" ${customCompare.year1 === \'2025\' ? \'selected\' : \'\'}>2025</option>'
suffix_c1 = target_c1_last + r'\n        <option value=\"2026\" ${customCompare.year1 === \'2026\' ? \'selected\' : \'\'}>2026</option>'

if target_c1_first in content:
    content = content.replace(target_c1_first, prefix_c1, 1)
    print("Added 2017-2020 to Custom Year 1!")
if target_c1_last in content:
    content = content.replace(target_c1_last, suffix_c1, 1)
    print("Added 2026 to Custom Year 1!")

# Custom Year 2 options addition
target_c2_first = r'<option value=\"2021\" ${customCompare.year2 === \'2021\' ? \'selected\' : \'\'}>2021</option>'
prefix_c2 = r'<option value=\"2017\" ${customCompare.year2 === \'2017\' ? \'selected\' : \'\'}>2017</option>\n        <option value=\"2018\" ${customCompare.year2 === \'2018\' ? \'selected\' : \'\'}>2018</option>\n        <option value=\"2019\" ${customCompare.year2 === \'2019\' ? \'selected\' : \'\'}>2019</option>\n        <option value=\"2020\" ${customCompare.year2 === \'2020\' ? \'selected\' : \'\'}>2020</option>\n        ' + target_c2_first

target_c2_last = r'<option value=\"2025\" ${customCompare.year2 === \'2025\' ? \'selected\' : \'\'}>2025</option>'
suffix_c2 = target_c2_last + r'\n        <option value=\"2026\" ${customCompare.year2 === \'2026\' ? \'selected\' : \'\'}>2026</option>'

if target_c2_first in content:
    content = content.replace(target_c2_first, prefix_c2, 1)
    print("Added 2017-2020 to Custom Year 2!")
if target_c2_last in content:
    content = content.replace(target_c2_last, suffix_c2, 1)
    print("Added 2026 to Custom Year 2!")

file_path.write_text(content, encoding="utf-8")
print("Done updating medshieldReference.ts!")
