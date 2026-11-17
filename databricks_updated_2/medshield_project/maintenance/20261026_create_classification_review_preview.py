# Databricks notebook source
"""Create an isolated classification review preview; import as a NEW maintenance notebook.

Upload the matched 13 classification files individually first. Run on Python Serverless. The pinned
package remains untouched. Creates only the pinned review table; serving and approvals stay unchanged.
"""
import hashlib
import json
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace

PACKAGE_ID = 'classification_52342363a7ef3211'
PACKAGE_DIRECTORY = '/Workspace/medshield/classification_releases/' + PACKAGE_ID
MANIFEST_SHA256 = 'd0114976fd7542ea26025b512afff494d64b911a0387a1ac6b2e8946fda36e02'
PREVIEW_WRITER_V1 = "preview.write.format('delta').mode('errorifexists').saveAsTable(target)"
PREVIEW_WRITER_V2 = "preview.writeTo(target).using('delta').create()"


def preview_execution_source(script_bytes):
    """Adapt only the verified package's create statement for Spark Connect.

    Package files stay immutable. V2 create fails if the target already exists;
    all source, identical-retry and readback checks remain in the staged script.
    Call only after verify_package has checked these exact source bytes.
    """
    source = script_bytes.decode('utf-8')
    if source.count(PREVIEW_WRITER_V1) != 1:
        raise ValueError('Unexpected preview writer; refusing compatibility adaptation.')
    return source.replace(PREVIEW_WRITER_V1, PREVIEW_WRITER_V2, 1)


def verify_package(folder):
    """Check the pinned manifest and every byte before importing package code."""
    folder = Path(folder)
    manifest_bytes = (folder / 'manifest.json').read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != MANIFEST_SHA256:
        raise ValueError('Wrong or changed manifest. Re-upload the original matched classification files.')
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


class PreviewParameters:
    """Supply fixed isolated-preview parameters to the verified staged script."""
    def __init__(self, folder):
        self.values = {'package_directory': str(folder), 'mode': 'create_preview'}

    def text(self, name, default):
        if name != 'package_directory':
            raise ValueError('Unexpected validation parameter.')

    def dropdown(self, name, default, choices):
        if name != 'mode' or default != 'validate' or 'create_preview' not in choices:
            raise ValueError('Expected the verified script preview-mode choices.')

    def get(self, name):
        return self.values[name]


def run_preview(spark_session, folder=PACKAGE_DIRECTORY):
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
        '__name__': 'classification_isolated_review_preview',
        'spark': spark_session,
        'dbutils': SimpleNamespace(widgets=PreviewParameters(folder)),
    }
    try:
        exec(compile((folder / 'release_validation.py').read_bytes(), helper.__file__, 'exec'), helper.__dict__)
        sys.modules['release_validation'] = helper
        script = folder / 'validate_classification_preview.py'
        source = preview_execution_source(script.read_bytes())
        exec(compile(source, str(script), 'exec'), namespace)
    finally:
        sys.path[:] = previous_path
        if previous_module is None:
            sys.modules.pop('release_validation', None)
        else:
            sys.modules['release_validation'] = previous_module


if 'spark' in globals():
    run_preview(spark)
