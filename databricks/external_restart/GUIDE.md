# Databricks-native external source restart

This is the workflow for the September 14, 2026 DOH and PAGASA sources.
Databricks reads the unchanged raw files and performs the Bronze, Silver, and
Gold processing. Remove the earlier `01_publish_external_clean` workspace
notebook; it expected files that had already been cleaned locally.

## Raw volume layout

Upload the original source folders under this Unity Catalog volume layout:

```text
/Volumes/workspace/medshield_bronze/raw_files/external_restart/
  doh/
    *.csv                    # exactly 19 disease-specific DOH files
    Case Definitions.xlsx   # allowed as reference; ignored by ingestion
  pagasa/
    2017-2020/
      * Daily Data.csv      # first supplied station batch
      A.ReadMe.txt
    2021-2024/
      * Daily Data.csv      # second supplied station batch
      A.ReadMe.txt
```

The PAGASA subfolder names do not matter. The Bronze notebook classifies each
file using its exact header, so the 2017-2020 files containing `TMEAN` are not
misaligned with the 2021-2024 files that omit `TMEAN`.

## Notebook order

Import and run these Databricks source notebooks in order:

1. Run `00_external_setup.py` to create the schemas, volume, and upload folders.
2. Upload the unchanged DOH folder to the printed `/doh` path and the unchanged
   PAGASA folder to the printed `/pagasa` path.
3. Run `01_external_bronze.py`.
4. Run `02_external_silver.py`.
5. Run `03_external_gold.py`.

Bronze records a SHA-256 source manifest and retains the raw string values.
Silver validates dates and measures, classifies DOH records, converts PAGASA
sentinels to null, handles trace rainfall, converts wind from m/s to km/h, and
quarantines rejected rows. Gold creates the monthly DOH and PAGASA candidates
without filling absent 2025 weather or treating partial 2026 DOH data as a
closed year.

## Expected results

- Bronze: 4,484,337 DOH rows, 161,744 PAGASA rows, and 64 station metadata rows.
- Silver: 138,673 DOH monthly rows totaling 4,608,155 reported cases and
  161,742 valid PAGASA station-days.
- Gold: 1,787 DOH territory/month/disease candidates totaling 233,531 reported
  case signals, 5,314 PAGASA station-months, and 7 mapping-review rows.
- Final status: `EXTERNAL GOLD: PASS_CANDIDATE_ONLY`.

All geography joins remain disabled until the mappings are reviewed. The
product master must also approve medical-demand products before an external
signal can enter forecasting.
