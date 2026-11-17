"""Dated evidence for role-to-skill integration; exercises no live services."""

import importlib.util
import json
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
SCRIPT = ROOT / ".agents/scripts/check_skill_routing.py"
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("routing", SCRIPT)
routing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(routing)

results = []


def record(name, passed, detail):
    results.append({"check": name, "status": "pass" if passed else "fail", "detail": detail})


current = routing.check(ROOT)
record("all current role skill routes and instruction links", current["status"] == "pass" and current["role_count"] == 16, current)
(OUT / "routing.json").write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
baseline = routing.check(OUT / "before", roles_only=True)
record("baseline explicit Required skills coverage", baseline["role_count"] == 16 and all(not r["primary"] for r in baseline["roles"]),
       {"role_count": baseline["role_count"], "explicit_primary_declarations": sum(bool(r["primary"]) for r in baseline["roles"]),
        "meaning": "Structural comparison under the new contract; not a behavioral performance comparison"})

with tempfile.TemporaryDirectory(prefix="medshield-skill-routing-") as directory:
    fixture = Path(directory).resolve()
    (fixture / ".agents").mkdir()
    (fixture / ".skills").mkdir()
    role = fixture / ".agents/data-analyst.md"
    role.write_bytes((ROOT / ".agents/data-analyst.md").read_bytes())
    primary = fixture / ".skills/analytics-frameworks.md"
    primary.write_bytes((ROOT / ".skills/analytics-frameworks.md").read_bytes())
    good = routing.check(fixture, roles_only=True)
    record("isolated valid direct role", good["status"] == "pass", good)
    assert primary.is_relative_to(fixture)
    primary.unlink()
    missing = routing.check(fixture, roles_only=True)
    record("missing required skill rejected", missing["status"] == "fail" and any("invalid/missing primary skill" in e for e in missing["errors"]), missing)
    primary.write_bytes((ROOT / ".skills/analytics-frameworks.md").read_bytes())
    added = fixture / ".agents/new-worker.md"
    added.write_text("# New worker\n\nNo required skill has been assigned.\n", encoding="utf-8")
    added_result = routing.check(fixture, roles_only=True)
    record("new role without skills rejected", added_result["status"] == "fail" and any("new-worker.md" in e for e in added_result["errors"]), added_result)

validator = subprocess.run([sys.executable, "-X", "utf8", "C:/Users/Adrian/.codex/skills/.system/skill-creator/scripts/quick_validate.py",
                            str(ROOT / ".skills/analytics-lesson-coaching")], capture_output=True, text=True)
record("coaching skill schema", validator.returncode == 0, {"exit_code": validator.returncode, "output": validator.stdout.strip() or validator.stderr.strip()})
diff = subprocess.run(["git", "diff", "--check", "--", "AGENTS.md", ".agents", ".skills"], cwd=ROOT, capture_output=True, text=True)
record("diff whitespace and conflict checks", diff.returncode == 0, {"exit_code": diff.returncode, "output": diff.stdout.strip() or diff.stderr.strip()})

before = json.loads((OUT / "before-manifest.json").read_text(encoding="utf-8"))
changed = [entry["path"] for entry in before if (ROOT / entry["path"]).read_bytes() != (OUT / "before" / entry["path"]).read_bytes()]
receipt = {"checked_at": datetime.now(ZoneInfo("Asia/Manila")).isoformat(),
           "command": "python -X utf8 outputs/lesson_review_20261008/agent-skill-integration/verify_integration.py",
           "git_head": subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip(),
           "working_tree": "Dirty at task intake; pre-edit bytes/hashes retained in before-manifest.json and before/. Only task-assigned instructions/helper changed.",
           "changed_existing_instruction_files": changed, "new_helper": str(SCRIPT.relative_to(ROOT)),
           "results": results, "status": "pass" if all(r["status"] == "pass" for r in results) else "fail",
           "review_mode": "Root self-review plus read-only supporting routing audit; fresh role trials recorded separately.",
           "limits": ["Structural routing checks and isolated failure probes do not guarantee every future worker will comply.",
                      "No model fine-tuning, application build, remote write, or repeated performance benchmark.",
                      "Earlier lesson review receipts remain historical; these hashes identify the updated agent/skill guidance."]}
(OUT / "verification.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"status": receipt["status"], "checks": [{"check": r["check"], "status": r["status"]} for r in results],
                  "changed_existing_files": len(changed), "role_count": current["role_count"]}, ensure_ascii=False))
raise SystemExit(0 if receipt["status"] == "pass" else 1)
