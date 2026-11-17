# Databricks notebook source
"""Read-only classification validation; import this as a NEW maintenance notebook.

Upload the matched 13 classification files individually first. Run on Python Serverless. The pinned
package remains untouched. This launcher forces validate mode, never create_preview.
"""
import hashlib
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

PACKAGE_ID = 'classification_52342363a7ef3211'
PACKAGE_DIRECTORY = '/Workspace/medshield/classification_releases/' + PACKAGE_ID
MANIFEST_SHA256 = 'd0114976fd7542ea26025b512afff494d64b911a0387a1ac6b2e8946fda36e02'


def verify_package(folder):
    """Check the pinned manifest and every byte before importing package code."""
    folder = Path(folder)
    manifest_bytes = (folder / 'manifest.json').read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA256:
        raise ValueError('Wrong or changed manifest. Re-import the original classification ZIP.')
    manifest = json.loads(manifest_bytes)
    if manifest['package_id'] != PACKAGE_ID or len(manifest['files']) != 12:
        raise ValueError('Unexpected classification package identity or file count.')
    for name, metadata in manifest['files'].items():
        if Path(name).name != name or name in {'.', '..'}:
            raise ValueError('Unsafe package filename.')
        payload = (folder / name).read_bytes()
        if len(payload) != metadata['bytes'] or hashlib.sha256(payload).hexdigest() != metadata['sha256']:
            raise ValueError('Package file changed: ' + name)
    return manifest


class ValidationParameters:
    """Supply fixed read-only parameters to the verified staged script."""
    def __init__(self, folder):
        self.values = {'package_directory': str(folder), 'mode': 'validate'}

    def text(self, name, default):
        if name != 'package_directory':
            raise ValueError('Unexpected validation parameter.')

    def dropdown(self, name, default, choices):
        if name != 'mode' or default != 'validate' or 'validate' not in choices:
            raise ValueError('Only validation mode is supported.')

    def get(self, name):
        return self.values[name]


def run_validation(spark_session, folder=PACKAGE_DIRECTORY):
    folder = Path(folder)
    if str(folder) != PACKAGE_DIRECTORY:
        raise ValueError('Use the unchanged package directory configured in this notebook.')
    verify_package(folder)
    print('PASS_PACKAGE_FILES: pinned manifest and all 13 files verified.')
    previous_module = sys.modules.get('release_validation')
    previous_path = list(sys.path)
    helper = ModuleType('release_validation')
    helper.__file__ = str(folder / 'release_validation.py')
    namespace = {
        '__name__': 'classification_read_only_validation',
        'spark': spark_session,
        'dbutils': SimpleNamespace(widgets=ValidationParameters(folder)),
    }
    try:
        exec(compile((folder / 'release_validation.py').read_bytes(), helper.__file__, 'exec'), helper.__dict__)
        sys.modules['release_validation'] = helper
        script = folder / 'validate_classification_preview.py'
        exec(compile(script.read_bytes(), str(script), 'exec'), namespace)
    finally:
        sys.path[:] = previous_path
        if previous_module is None:
            sys.modules.pop('release_validation', None)
        else:
            sys.modules['release_validation'] = previous_module


if 'spark' in globals():
    run_validation(spark)
