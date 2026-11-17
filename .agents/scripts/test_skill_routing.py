"""Regression checks for conditional skill routing in an isolated repository."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from check_skill_routing import check


class SkillRoutingTests(unittest.TestCase):
    def setUp(self):
        temporary = TemporaryDirectory(prefix="medshield-skill-routing-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        (self.root / ".agents").mkdir()
        (self.root / ".skills").mkdir()
        for path, content in {
            "AGENTS.md": "[Skill loading](.agents/execution-contract.md#skill-loading-contract)\n",
            ".agents/execution-contract.md": "## Skill-loading contract\n\nRead the required skills.\n",
            ".agents/worker-operating-model.md": "# Worker Operating Model\n",
            ".skills/primary.md": "# Primary skill\n",
            ".skills/conditional.md": "# Conditional skill\n",
            "outside.md": "# General documentation\n",
        }.items():
            (self.root / path).write_text(content, encoding="utf-8")

    def write_role(self, conditional_target):
        (self.root / ".agents/worker.md").write_text(
            "## Required skills\n\n"
            "[Skill loading](execution-contract.md#skill-loading-contract)\n\n"
            "- **Primary:** [Primary](../.skills/primary.md).\n"
            f"- **Conditional:** [Conditional]({conditional_target}).\n",
            encoding="utf-8",
        )

    def test_accepts_existing_conditional_skill_in_both_modes(self):
        self.write_role("../.skills/conditional.md")
        for roles_only in (True, False):
            with self.subTest(roles_only=roles_only):
                result = check(self.root, roles_only=roles_only)
                self.assertEqual(result["errors"], [])
                self.assertEqual(result["status"], "pass")

    def test_rejects_missing_or_outside_conditional_skill_in_both_modes(self):
        for target in ("../.skills/missing.md", "../outside.md"):
            self.write_role(target)
            for roles_only in (True, False):
                with self.subTest(target=target, roles_only=roles_only):
                    result = check(self.root, roles_only=roles_only)
                    self.assertIn(f"worker.md: invalid/missing conditional skill {target}", result["errors"])
                    self.assertEqual(result["status"], "fail")
