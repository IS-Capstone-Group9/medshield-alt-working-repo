# Databricks notebook source
# Copy the already-uploaded Workspace source files into the Unity Catalog volume.
# Spark on serverless reads the Volume copies in the Bronze notebook.
import shutil
from pathlib import Path

VOLUME_ROOT = Path("/Volumes/workspace/medshield_bronze/raw_files/external_restart")


def find_medshield_workspace_root():
    current = Path.cwd()
    for candidate in (current, *current.parents):
        if (candidate / "DOH_datasources" / "diseases_20182026").is_dir() and (
            candidate / "PAGASA_datasources"
        ).is_dir():
            return candidate
    raise FileNotFoundError(
        "Could not find DOH_datasources and PAGASA_datasources above the notebook directory. "
        f"Current notebook directory: {current}"
    )


workspace_root = find_medshield_workspace_root()
sources = {
    "DOH": workspace_root / "DOH_datasources" / "diseases_20182026",
    "PAGASA_2017_2020": workspace_root / "PAGASA_datasources" / "20172020_batch1",
    "PAGASA_2021_2024": workspace_root / "PAGASA_datasources" / "20212024_batch2",
}
destinations = {
    "DOH": VOLUME_ROOT / "doh",
    "PAGASA_2017_2020": VOLUME_ROOT / "pagasa" / "2017-2020",
    "PAGASA_2021_2024": VOLUME_ROOT / "pagasa" / "2021-2024",
}

expected_daily_counts = {
    "DOH": 19,
    "PAGASA_2017_2020": 64,
    "PAGASA_2021_2024": 61,
}


def selected_files(group, source):
    if group == "DOH":
        return sorted(source.glob("*.csv"))
    files = sorted(source.glob("* Daily Data.csv"))
    readme = source / "A.ReadMe.txt"
    if not readme.is_file():
        raise FileNotFoundError(f"Missing PAGASA station metadata file: {readme}")
    return files + [readme]


copy_audit = []
for group, source in sources.items():
    if not source.is_dir():
        raise FileNotFoundError(f"Missing Workspace source folder: {source}")
    destination = destinations[group]
    destination.mkdir(parents=True, exist_ok=True)
    files = selected_files(group, source)
    data_file_count = sum(path.suffix.lower() == ".csv" for path in files)
    if data_file_count != expected_daily_counts[group]:
        raise ValueError(
            f"Unexpected {group} CSV count: expected {expected_daily_counts[group]}, found {data_file_count}"
        )
    copied_bytes = 0
    for source_file in files:
        destination_file = destination / source_file.name
        shutil.copyfile(source_file, destination_file)
        if destination_file.stat().st_size != source_file.stat().st_size:
            raise IOError(f"Copy size mismatch: {source_file} -> {destination_file}")
        copied_bytes += destination_file.stat().st_size
    copy_audit.append(
        (group, str(source), str(destination), data_file_count, len(files), copied_bytes, "PASS")
    )

audit_frame = spark.createDataFrame(
    copy_audit,
    "source_group string, workspace_source string, volume_destination string, "
    "csv_files long, total_files long, copied_bytes long, status string",
)
display(audit_frame.orderBy("source_group"))
print("EXTERNAL WORKSPACE COPY: PASS")
