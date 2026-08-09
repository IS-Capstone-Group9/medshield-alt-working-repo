from pathlib import Path

repo_dir = Path(__file__).resolve().parent.parent

files_to_update = [
    repo_dir / "docs" / "ANALYTICS.md",
    repo_dir / "docs" / "CAPSTONE_COMPLETION_WORKFLOW.md",
    repo_dir / "docs" / "DASHBOARD_MODEL_PUBLICATION_GUIDE.md",
    repo_dir / "docs" / "REQUIREMENTS.md",
    repo_dir / "docs" / "NORTH_STAR_EXECUTION_BLUEPRINT.md",
    repo_dir / "docs" / "NORTH_STAR_HOW_TO_EXECUTE.md",
    repo_dir / "docs" / "PAPER_REVISION_GUIDE.md",
    repo_dir / "references" / "NStar.md",
    repo_dir / "MODEL_COMPUTATION_START_CHECKLIST.md",
]

for path in files_to_update:
    if not path.exists():
        print(f"Skipping non-existent file: {path.name}")
        continue
    content = path.read_text(encoding="utf-8")
    original = content
    content = content.replace("2021-2025 sales", "2017 onwards sales")
    content = content.replace("2021-2025 Sales Report", "2017 onwards Sales Report")
    content = content.replace("2021-2025 records", "2017 onwards records")
    content = content.replace("2021 through 2025", "2017 through 2025")
    content = content.replace("2021-2025 datasets", "2017 onwards datasets")
    content = content.replace("2021-2025 Data", "2017 onwards Data")
    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"Updated {path.name}")
    else:
        print(f"No changes needed for {path.name}")

print("Doc updates complete.")
