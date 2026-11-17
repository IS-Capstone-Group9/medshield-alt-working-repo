"""Isolated regression checks; never read or write the real project vault."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("project_memory_hook.py")
SPEC = importlib.util.spec_from_file_location("project_memory_hook", SCRIPT)
HOOK = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(HOOK)


class ProjectMemoryHookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="medshield-memory-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.repo = self.base / "repo"
        (self.repo / ".codex").mkdir(parents=True)
        (self.repo / "frontend").mkdir()
        self.vault = self.base / "vault"
        self.project = self.vault / "MedShield"
        self.project.mkdir(parents=True)
        self.pointer = self.repo / ".codex" / "obsidian-memory.local.json"
        self.config = {"schemaVersion": 1, "vaultPath": str(self.vault), "memoryFolder": "MedShield"}
        self.write_config(self.config)
        self.now = datetime(2026, 10, 15, 23, 59, tzinfo=HOOK.MANILA)

    def write_config(self, config):
        self.pointer.write_text(json.dumps(config), encoding="utf-8")

    def event(self, kind="UserPromptSubmit", turn="turn-a", **extra):
        return {"hook_event_name": kind, "session_id": "test-session", "turn_id": turn,
                "cwd": str(self.repo / "frontend"), **extra}

    def capture(self, event, now=None):
        return HOOK.capture_event(event, repo_root=self.repo, now=now or self.now)

    def notes(self):
        return sorted((self.project / "turns").glob("*.md"))

    def assert_skipped(self, event=None):
        output = self.capture(event or self.event())
        self.assertIn("skipped", output["systemMessage"])
        self.assertNotIn("decision", output)
        self.assertFalse(self.notes())

    def test_prompt_retry_preserves_note_and_midnight_identity(self):
        result = self.capture(self.event())
        self.assertIn("additionalContext", result["hookSpecificOutput"])
        note = self.notes()[0]
        original = note.read_bytes()
        self.capture(self.event(), now=self.now + timedelta(minutes=2))
        self.assertEqual([note], self.notes())
        self.assertEqual(original, note.read_bytes())
        self.assertIn("status: pending", original.decode("utf-8"))
        self.assertIn(str(note), result["hookSpecificOutput"]["additionalContext"].replace("\\\\", "\\"))

    def test_stop_preserves_user_summary_and_receipt_is_idempotent(self):
        self.capture(self.event())
        note = self.notes()[0]
        summary = "---\nstatus: recorded\n---\nUser-authored summary — no project change.\n"
        note.write_text(summary, encoding="utf-8")
        result = self.capture(self.event("Stop"))
        receipt_path = note.with_suffix(".Stop.json")
        receipt_bytes = receipt_path.read_bytes()
        receipt = json.loads(receipt_bytes)
        self.capture(self.event("Stop", stop_hook_active=True), now=self.now + timedelta(minutes=1))
        self.assertEqual(summary, note.read_text(encoding="utf-8"))
        self.assertEqual(receipt_bytes, receipt_path.read_bytes())
        self.assertEqual("stopped", receipt["lifecycle"])
        self.assertEqual("recorded", receipt["summaryStatus"])
        self.assertIn("summary recorded", result["systemMessage"])
        self.assertNotIn("decision", result)

    def test_nondefault_memory_folder_uses_resolving_relative_workstream_links(self):
        self.project = self.vault / "CustomProjectMemory"
        workstreams = self.project / "workstreams"
        workstreams.mkdir(parents=True)
        for name in ("Graphs", "Pipeline", "Documentation", "Paper"):
            (workstreams / f"{name}.md").write_text(f"# {name}\n", encoding="utf-8")
        self.write_config({**self.config, "memoryFolder": self.project.name})
        result = self.capture(self.event())
        note = self.notes()[0]
        for content in (note.read_text(encoding="utf-8"), result["hookSpecificOutput"]["additionalContext"]):
            links = re.findall(r"\[[^\]]+\]\((\.\./workstreams/[^)]+)\)", content)
            self.assertEqual(4, len(links))
            self.assertNotIn("MedShield/workstreams", content)
            for link in links:
                resolved = (note.parent / link).resolve()
                self.assertTrue(resolved.is_relative_to(self.project))
                self.assertTrue(resolved.is_file())

    def test_stop_without_prompt_keeps_summary_pending(self):
        result = self.capture(self.event("Stop"))
        note = self.notes()[0]
        self.assertIn("status: pending", note.read_text(encoding="utf-8"))
        self.assertEqual("pending", json.loads(note.with_suffix(".Stop.json").read_text())["summaryStatus"])
        self.assertIn("still needs", result["systemMessage"])
        self.assertNotIn("hookSpecificOutput", result)
        self.assertNotIn("decision", result)

    def test_interrupt_without_prompt_records_distinct_lifecycle(self):
        self.capture(self.event("Interrupt"))
        note = self.notes()[0]
        receipt = json.loads(note.with_suffix(".Interrupt.json").read_text())
        self.assertEqual("interrupted", receipt["lifecycle"])
        self.assertEqual("pending", receipt["summaryStatus"])
        self.assertIn("status: pending", note.read_text(encoding="utf-8"))

    def test_unsafe_identifiers_are_hashed_and_private_fields_never_persist(self):
        private = "DUMMY-RAW-SECRET-do-not-capture-93817"
        event = self.event(turn="../../" + private, session_id="/" + private,
                           prompt=private, transcript_path=private, last_assistant_message=private)
        self.capture(event)
        self.capture({**event, "hook_event_name": "Stop"})
        self.capture({**event, "hook_event_name": "Interrupt"})
        files = list(self.project.rglob("*"))
        for file in files:
            self.assertNotIn(private, file.name)
            if file.is_file():
                self.assertNotIn(private, file.read_text(encoding="utf-8"))
        self.assertRegex(self.notes()[0].name, r"^2026-10-15-[a-f0-9]{64}\.md$")

    def test_missing_connection_is_nonblocking(self):
        self.pointer.unlink()
        self.assert_skipped()

    def test_invalid_json_and_schema_are_nonblocking(self):
        self.pointer.write_text("{invalid", encoding="utf-8")
        self.assert_skipped()
        for version in (True, "1", 2, None):
            with self.subTest(version=version):
                self.write_config({**self.config, "schemaVersion": version})
                self.assert_skipped()

    def test_escaping_absolute_and_ambiguous_folders_are_denied(self):
        for folder in ("../outside", ".", "MedShield/../outside", "/absolute", "C:\\outside",
                       "MedShield//turns", "MedShield/.", "MedShield/turns.", " MedShield"):
            with self.subTest(folder=folder):
                self.write_config({**self.config, "memoryFolder": folder})
                self.assert_skipped()

    def test_relative_vault_and_missing_project_are_denied(self):
        self.write_config({**self.config, "vaultPath": "relative"})
        self.assert_skipped()
        self.write_config({**self.config, "memoryFolder": "Missing"})
        self.assert_skipped()

    def test_foreign_cwd_and_invalid_identifiers_are_denied(self):
        self.assert_skipped(self.event(cwd=str(self.vault)))
        self.assert_skipped(self.event(cwd="frontend"))
        self.assert_skipped(self.event(turn_id=None))
        self.assert_skipped(self.event(session_id=[]))

    def test_unsupported_and_malformed_events_do_not_throw(self):
        for payload in ([], {"hook_event_name": []}, self.event("Other")):
            result = self.capture(payload)
            self.assertIn("systemMessage", result)
            self.assertNotIn("decision", result)
        self.assertFalse(self.notes())

    def test_concurrent_independent_turns_preserve_every_note(self):
        events = [self.event(turn=f"turn-{number}") for number in range(20)]
        with ThreadPoolExecutor(max_workers=8) as workers:
            results = list(workers.map(self.capture, events))
        self.assertTrue(all("hookSpecificOutput" in result for result in results))
        self.assertEqual(20, len(self.notes()))
        self.assertEqual(20, len({note.read_text(encoding="utf-8") for note in self.notes()}))

    def test_reparse_attribute_is_rejected_as_junction(self):
        info = SimpleNamespace(st_mode=stat.S_IFDIR | 0o755, st_file_attributes=0x400)
        with patch.object(Path, "lstat", return_value=info):
            with self.assertRaisesRegex(HOOK.MemoryUnavailable, "junction"):
                HOOK._plain_path(self.project, directory=True)

    def test_symlink_directory_cannot_redirect_capture(self):
        target = self.base / "unrelated"
        target.mkdir()
        try:
            os.symlink(target, self.project / "turns", target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("This environment does not permit symbolic link creation")
        self.assert_skipped()
        self.assertEqual([], list(target.iterdir()))

    def test_symlink_note_cannot_be_read_or_overwritten(self):
        turns = self.project / "turns"
        turns.mkdir()
        target = self.base / "personal.md"
        target.write_text("preserve personal content", encoding="utf-8")
        key = HOOK._turn_key(self.event())
        try:
            os.symlink(target, turns / f"2026-10-15-{key}.md")
        except (OSError, NotImplementedError):
            self.skipTest("This environment does not permit symbolic link creation")
        result = self.capture(self.event("Stop"))
        self.assertIn("skipped", result["systemMessage"])
        self.assertEqual("preserve personal content", target.read_text(encoding="utf-8"))
        self.assertEqual([], list(turns.glob("*.json")))

    def test_cli_invalid_input_returns_json_with_success_exit(self):
        completed = subprocess.run([sys.executable, "-X", "utf8", str(SCRIPT)], input=b"{invalid",
                                   capture_output=True, check=False)
        self.assertEqual(0, completed.returncode)
        self.assertIn("skipped", json.loads(completed.stdout)["systemMessage"])
        self.assertEqual(b"", completed.stderr)

    def test_manifest_command_runs_from_repository_subdirectory(self):
        manifest = json.loads((SCRIPT.parents[2] / ".codex" / "hooks.json").read_text(encoding="utf-8"))
        helper = self.repo / ".agents" / "scripts" / SCRIPT.name
        helper.parent.mkdir(parents=True)
        shutil.copyfile(SCRIPT, helper)
        self.pointer.unlink()  # Exercise the exact wrapper without any vault writes.
        subprocess.run(["git", "init", "--quiet", str(self.repo)], capture_output=True, check=True)
        for event, expected_timeout in (("UserPromptSubmit", 5), ("Stop", 5), ("Interrupt", 3)):
            with self.subTest(event=event):
                hook = manifest["hooks"][event][0]["hooks"][0]
                self.assertEqual("command", hook["type"])
                self.assertEqual(expected_timeout, hook["timeout"])
                command = hook["commandWindows" if os.name == "nt" else "command"]
                completed = subprocess.run(command, shell=True, cwd=self.repo / "frontend",
                                           input=json.dumps(self.event(event)).encode("utf-8"),
                                           capture_output=True, check=False, timeout=5)
                self.assertEqual(0, completed.returncode, completed.stderr.decode("utf-8"))
                self.assertIn("skipped", json.loads(completed.stdout)["systemMessage"])
                self.assertEqual(b"", completed.stderr)
        self.assertFalse(self.notes())


if __name__ == "__main__":
    unittest.main()
