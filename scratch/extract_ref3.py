from pathlib import Path
text = Path('frontend/lib/medshieldReference.ts').read_text(encoding='utf-8')
for needle in ['function getYearRowsForMode', 'revenueGrowth', 'growth', 'selectedYoYYear', 'PAGE_META', 'filterBarNotes']:
    idx = text.find(needle)
    print('\n---', needle, idx, '---')
    if idx>=0: print(text[idx:idx+3000])
