"""Restore exact retained regression inputs only. Never supplies application analytics."""
from __future__ import annotations
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile

REPOSITORY = Path(__file__).resolve().parents[1]
PACKAGE = REPOSITORY / 'tests/fixtures/retained'
MAX_BYTES = 128 * 1024 * 1024

def sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def relative_path(value: object) -> str:
    if not isinstance(value, str) or not value or '\\' in value or ':' in value or any(ord(c) < 32 for c in value):
        raise ValueError('Invalid fixture path')
    p = PurePosixPath(value)
    if p.is_absolute() or len(p.parts) < 2 or p.parts[0] != 'outputs' or any(v in ('.', '..', '') for v in value.split('/')) or p.as_posix() != value:
        raise ValueError('Fixture path must stay below outputs/')
    return value

def safe_target(root: Path, relative: str) -> Path:
    target = root / relative_path(relative)
    for current in [root, *[root.joinpath(*PurePosixPath(relative).parts[:i]) for i in range(1, len(PurePosixPath(relative).parts) + 1)]]:
        if current.is_symlink() or (current.exists() and getattr(current.lstat(), 'st_file_attributes', 0) & 0x400):
            raise ValueError('Fixture destination contains a link or junction')
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Fixture destination escapes workspace')
    return target

def inspect_package(manifest_path: Path, archive_path: Path) -> dict[str, bytes]:
    manifest = json.loads(manifest_path.read_bytes())
    if type(manifest.get('schema_version')) is not int or manifest.get('schema_version') != 1 or manifest.get('purpose') != 'offline_regression_only':
        raise ValueError('Unsupported fixture manifest')
    archive = archive_path.read_bytes()
    if len(archive) > 32 * 1024 * 1024 or sha(archive) != manifest.get('archive_sha256'):
        raise ValueError('Fixture archive checksum mismatch')
    entries = manifest.get('files')
    if not isinstance(entries, list) or not entries:
        raise ValueError('Missing fixture entries')
    expected = {}
    total = 0
    for item in entries:
        name = relative_path(item['path'])
        size = item.get('bytes')
        digest = item.get('sha256')
        if name in expected or type(size) is not int or size < 0 or size > MAX_BYTES or not isinstance(digest, str) or len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest):
            raise ValueError('Invalid or duplicate fixture entry')
        expected[name] = item
        total += size
    if total > MAX_BYTES or manifest.get('uncompressed_bytes') != total:
        raise ValueError('Fixture size control differs')
    # Limit decompression before parsing; never use tarfile.extract/extractall.
    with gzip.GzipFile(fileobj=io.BytesIO(archive)) as stream:
        tar_bytes = stream.read(MAX_BYTES + 1024 * 1024 + 1)
        if len(tar_bytes) > MAX_BYTES + 1024 * 1024:
            raise ValueError('Oversized fixture archive')
    result = {}
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode='r:') as bundle:
        for member in bundle:
            name = relative_path(member.name)
            if name not in expected or name in result or not member.isfile() or member.size != expected[name]['bytes']:
                raise ValueError('Unexpected, duplicate or unsafe archive member')
            stream = bundle.extractfile(member)
            if stream is None:
                raise ValueError('Fixture member missing')
            raw = stream.read(member.size + 1)
            if len(raw) != member.size or sha(raw) != expected[name]['sha256']:
                raise ValueError('Fixture member checksum mismatch')
            result[name] = raw
    if set(result) != set(expected):
        raise ValueError('Fixture membership differs')
    return result

def restore(root: Path, manifest_path: Path = PACKAGE / 'manifest.json', archive_path: Path = PACKAGE / 'fixtures.tar.gz', *, check: bool = False) -> dict:
    root = root.absolute()
    if not root.is_dir() or root.is_symlink():
        raise ValueError('Fixture destination must be an existing ordinary workspace')
    files = inspect_package(manifest_path, archive_path)
    missing = []
    # Validate the ENTIRE package and existing destination before writing any file.
    for name, raw in files.items():
        target = safe_target(root, name)
        if target.exists():
            if not target.is_file() or target.read_bytes() != raw:
                raise ValueError('Existing fixture conflicts: ' + name)
        else:
            missing.append(name)
    if check and missing:
        raise ValueError('Required test fixtures missing: ' + ', '.join(missing))
    for name in missing:
        target = safe_target(root, name)
        target.parent.mkdir(parents=True, exist_ok=True)
        target = safe_target(root, name)
        with target.open('xb') as stream:
            stream.write(files[name])
    for name, raw in files.items():
        if safe_target(root, name).read_bytes() != raw:
            raise ValueError('Fixture readback differs: ' + name)
    return {'status': 'PASS_RETAINED_TEST_FIXTURES', 'files': len(files), 'restored': len(missing), 'unchanged': len(files) - len(missing), 'bytes': sum(map(len, files.values())), 'purpose': 'offline_regression_only'}

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=REPOSITORY)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    print(json.dumps(restore(args.root, check=args.check), sort_keys=True))

if __name__ == '__main__':
    main()
