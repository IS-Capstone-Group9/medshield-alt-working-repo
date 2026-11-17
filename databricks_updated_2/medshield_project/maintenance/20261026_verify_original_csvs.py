# Databricks notebook source
"""Read-only identity check for the original, contract-bearing sales CSVs.

Import this notebook into medshield_project/maintenance and run it with Python.
It reads files only: no table writes, source changes, Spark work or model fitting.
A pass proves exact file identity, not complete-company or publication approval.
If a file fails, compare it with the same-named original under the local
databricks_updated/medshield_project_csv folder. Preserve the current remote copy
before a deliberate replacement; never remove these guards or overwrite blindly.
"""

import hashlib
from pathlib import Path


SOURCE_DIRECTORY = Path('/Workspace/medshield/medshield_project_csv')
EXPECTED_SHA256 = {
    'medshield_data_2017.csv': '15edfe33e5365e047d57556eb8a2dc9581b89b1f59f98449b983f0483f2b9c77',
    'medshield_data_2018.csv': 'd7a1b8ad107e176e642aab540e464eab05b19dc116131b712c33e29fb355b200',
    'medshield_data_2019.csv': '3afc789aa0ad798da14cbe87153049eb7f7d7ca15df944a8e27b25f97d419fc8',
    'medshield_data_2020.csv': '98c83e6a440298e145b8bbfc2463791f393f0946f26a11c6b0472752d30ce733',
    'medshield_data_2021.csv': 'c1cc109b73a0b073a051cd2fbdd7df2e0c2c8ea52a98be8b8c443b0388d12477',
    'medshield_data_2022.csv': '1f28cacdcdc537065828cf809f8d0ae4bb55891a1317fe6c306d2b4b5b2caf74',
    'medshield_data_2023.csv': '83e4509c84e0c2b6c379071593e589b5207842fd469430fe317e5e9a70368cea',
    'medshield_data_2024.csv': 'c38245983b918c0e44eecfccb3b63be00e8de9c848048dd007d1c086c714831f',
    'medshield_data_2025.csv': '2738afaf114d9480928e37b6c2b53dc0cac9ba2f10dc74a98b2549e3345d235c',
    'medshield_data_2026.csv': '2e5f1b6b10f2e9e439e3ed2599bdad4409cf46dd5a6a9d7ae68d640d70e10693',
}


def verify_original_csvs(folder):
    """Return each expected file's identity status without changing any files."""
    folder = Path(folder)
    results = []
    for filename, expected in EXPECTED_SHA256.items():
        path = folder / filename
        actual = None
        try:
            if not path.is_file():
                status = 'MISSING'
            else:
                actual = hashlib.sha256(path.read_bytes()).hexdigest()
                status = 'PASS' if actual == expected else 'MISMATCH'
        except OSError:
            status = 'UNREADABLE'
        results.append({
            'filename': filename,
            'status': status,
            'expected_sha256': expected,
            'actual_sha256': actual,
        })
    return results


def main(folder=SOURCE_DIRECTORY):
    results = verify_original_csvs(folder)
    for row in results:
        print(row['filename'] + ': ' + row['status'])
        if row['status'] != 'PASS':
            print('  expected_sha256=' + row['expected_sha256'])
            print('  actual_sha256=' + str(row['actual_sha256']))
    if any(row['status'] != 'PASS' for row in results):
        raise RuntimeError(
            'Original CSV verification failed. Compare each failing filename with '
            'the same-named local original in databricks_updated/medshield_project_csv. '
            'Preserve the remote copy before deliberate replacement, then rerun this '
            'check. Do not overwrite blindly or remove hash guards.')
    print('PASS_ORIGINAL_CONTRACT_BEARING_CSVS')


if __name__ == '__main__':
    main()
