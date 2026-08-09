from pathlib import Path
text = Path('frontend/lib/medshieldReference.ts').read_text(encoding='utf-8')
idx=text.find('const forecastLabels')
print(idx)
print(text[idx-1000:idx+2000])
