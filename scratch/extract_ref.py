from pathlib import Path
text = Path('frontend/lib/medshieldReference.ts').read_text(encoding='utf-8')
# unescape rough enough for searches? file is TS string literal on one line. Print snippets around function names.
for needle in ['function buildCharts', 'function buildTables', 'function updateFilterBar', 'const DATA', 'productTabFullList', 'productChart', 'forecastChart', 'overviewForecastChart']:
    idx = text.find(needle)
    print('\n---', needle, idx, '---')
    if idx >= 0:
        print(text[idx:idx+5000])
