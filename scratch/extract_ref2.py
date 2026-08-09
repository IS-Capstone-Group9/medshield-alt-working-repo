from pathlib import Path
text = Path('frontend/lib/medshieldReference.ts').read_text(encoding='utf-8')
for needle in ['function getMonthlyRowsForMode', 'function getRevenueDetailData', "createChart('overviewForecastChart", "createChart('forecastChart", "createChart('product", 'const forecastRows', 'function ensureMockFallbackData', 'function getSortedProductRows']:
    idx = text.find(needle)
    print('\n---', needle, idx, '---')
    if idx >= 0:
        print(text[idx:idx+3500])
