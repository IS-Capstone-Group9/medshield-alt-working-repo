"""Portable fixture-restoration boundary tests; generated data is synthetic only."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from scripts.restore_test_fixtures import inspect_package, restore

class RetainedFixtureRestoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'workspace'
        self.root.mkdir()
        self.manifest = self.base / 'manifest.json'
        self.archive = self.base / 'fixtures.tar.gz'
        self.files = {'outputs/fixture-only/a.json': b'{"unit":"synthetic","zero":0}\r\n', 'outputs/fixture-only/b.sha256': b'fixture digest\n'}
        self.package()

    def package(self, *, members=None, mutate=None):
        buffer = io.BytesIO()
        with tarfile.open(fileobj=buffer, mode='w', format=tarfile.USTAR_FORMAT) as bundle:
            for name, raw, kind in members or [(n, r, tarfile.REGTYPE) for n, r in self.files.items()]:
                info = tarfile.TarInfo(name);info.size=len(raw);info.type=kind
                bundle.addfile(info, io.BytesIO(raw) if kind==tarfile.REGTYPE else None)
        archive = gzip.compress(buffer.getvalue(), mtime=0)
        self.archive.write_bytes(archive)
        manifest = {'schema_version':1,'purpose':'offline_regression_only','archive_sha256':hashlib.sha256(archive).hexdigest(),'uncompressed_bytes':sum(map(len,self.files.values())),
            'files':[{'path':n,'bytes':len(r),'sha256':hashlib.sha256(r).hexdigest()} for n,r in self.files.items()]}
        if mutate:mutate(manifest)
        self.manifest.write_text(json.dumps(manifest), encoding='utf-8')

    def test_restore_exact_bytes_and_idempotent_check(self):
        first=restore(self.root,self.manifest,self.archive)
        self.assertEqual(first['restored'],2)
        for name,raw in self.files.items():self.assertEqual((self.root/name).read_bytes(),raw)
        self.assertEqual(restore(self.root,self.manifest,self.archive)['restored'],0)
        self.assertEqual(restore(self.root,self.manifest,self.archive,check=True)['unchanged'],2)

    def test_missing_check_does_not_hydrate_or_infer_success(self):
        with self.assertRaisesRegex(ValueError,'missing'):restore(self.root,self.manifest,self.archive,check=True)
        self.assertFalse((self.root/'outputs').exists())

    def test_conflict_is_detected_before_any_missing_file_is_created(self):
        target=self.root/'outputs/fixture-only/b.sha256';target.parent.mkdir(parents=True);target.write_bytes(b'concurrent user evidence')
        with self.assertRaisesRegex(ValueError,'conflicts'):restore(self.root,self.manifest,self.archive)
        self.assertEqual(target.read_bytes(),b'concurrent user evidence')
        self.assertFalse((self.root/'outputs/fixture-only/a.json').exists())

    def test_corrupt_archive_fails_before_any_write(self):
        self.archive.write_bytes(self.archive.read_bytes()+b'changed')
        with self.assertRaisesRegex(ValueError,'checksum'):restore(self.root,self.manifest,self.archive)
        self.assertFalse((self.root/'outputs').exists())

    def test_member_hash_and_incomplete_membership_reject(self):
        self.package(mutate=lambda m:m['files'][0].update(sha256='0'*64))
        with self.assertRaisesRegex(ValueError,'checksum'):restore(self.root,self.manifest,self.archive)
        self.package(members=[('outputs/fixture-only/a.json',self.files['outputs/fixture-only/a.json'],tarfile.REGTYPE)])
        with self.assertRaisesRegex(ValueError,'membership'):restore(self.root,self.manifest,self.archive)
        self.assertFalse((self.root/'outputs').exists())

    def test_manifest_paths_and_duplicate_entries_reject(self):
        for path in ['../outside.json','outputs/../outside.json','/outputs/a.json','outputs//a.json','outputs/./a.json','outputs/C:/a.json','outputs\\a.json']:
            self.package(mutate=lambda m:m['files'][0].update(path=path))
            with self.assertRaises(ValueError):restore(self.root,self.manifest,self.archive)
        self.package(mutate=lambda m:m['files'].append(dict(m['files'][0])))
        with self.assertRaisesRegex(ValueError,'duplicate'):restore(self.root,self.manifest,self.archive)
        self.assertFalse((self.root/'outputs').exists())

    def test_tar_traversal_link_duplicate_and_extra_members_reject(self):
        normal=[(n,r,tarfile.REGTYPE) for n,r in self.files.items()]
        for members in [[('../outside.json',b'x',tarfile.REGTYPE)], [('outputs/fixture-only/a.json',b'',tarfile.SYMTYPE)],normal+[normal[0]],normal+[('outputs/unlisted.json',b'x',tarfile.REGTYPE)]]:
            self.package(members=members)
            with self.assertRaises(ValueError):restore(self.root,self.manifest,self.archive)
        self.assertFalse((self.root/'outputs').exists());self.assertFalse((self.base/'outside.json').exists())

    def test_manifest_size_controls_and_schema_reject(self):
        for mutate in [lambda m:m.update(schema_version=True),lambda m:m.update(purpose='runtime_analytics'),lambda m:m.update(uncompressed_bytes=1),lambda m:m['files'][0].update(bytes=True),lambda m:m['files'][0].update(bytes=129*1024*1024)]:
            self.package(mutate=mutate)
            with self.assertRaises(ValueError):restore(self.root,self.manifest,self.archive)
        self.assertFalse((self.root/'outputs').exists())

    def test_existing_directory_is_not_overwritten(self):
        (self.root/'outputs/fixture-only/a.json').mkdir(parents=True)
        with self.assertRaisesRegex(ValueError,'conflicts'):restore(self.root,self.manifest,self.archive)
        self.assertTrue((self.root/'outputs/fixture-only/a.json').is_dir())

    def test_linked_output_directory_cannot_escape(self):
        external=self.base/'outside';external.mkdir()
        try:(self.root/'outputs').symlink_to(external,target_is_directory=True)
        except OSError as error:self.skipTest('OS does not permit test symlink: '+str(error))
        with self.assertRaisesRegex(ValueError,'link|junction'):restore(self.root,self.manifest,self.archive)
        self.assertEqual(list(external.iterdir()),[])

if __name__=='__main__':unittest.main()
