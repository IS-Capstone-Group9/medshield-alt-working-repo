import zipfile
import re
from pathlib import Path

def extract_docx_text(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read('word/document.xml').decode('utf-8')
        text = re.sub(r'<[^>]+>', '\n', xml_content)
        # Collapse multiple newlines
        text = re.sub(r'\n+', '\n', text)
        return text

def main():
    docx_path = Path(r"c:\Users\Ethan\medshield-alt-working-repo\PRIVATE_SUMMER_CAPSTONE_2 - GROUP9_ISB (1).docx")
    text = extract_docx_text(docx_path)
    
    sections = [
        "3.4.2 Predictive Analytics",
        "Facebook Prophet with External Regressors",
        "Disease Intensity Indicator",
        "Rainfall Severity Index",
        "XGBoost Urgency Score",
        "Economic Order Quantity",
        "Linear Programming"
    ]
    
    out_path = Path(r"c:\Users\Ethan\medshield-alt-working-repo\scratch\manuscript_extract.txt")
    with out_path.open("w", encoding="utf-8") as f:
        # Also write out occurrences of these sections
        for sec in sections:
            f.write("="*60 + "\n")
            f.write(f"SEARCHING FOR: {sec}\n")
            f.write("="*60 + "\n")
            matches = [m.start() for m in re.finditer(re.escape(sec), text, re.IGNORECASE)]
            for idx in matches:
                # Find occurrences that are NOT in the table of contents (table of contents usually doesn't have much text after)
                start = max(0, idx - 100)
                end = min(len(text), idx + 4000)
                f.write(text[start:end] + "\n")
                f.write("-" * 40 + "\n")
                
    print("Done! Saved to scratch/manuscript_extract.txt")

if __name__ == '__main__':
    main()
