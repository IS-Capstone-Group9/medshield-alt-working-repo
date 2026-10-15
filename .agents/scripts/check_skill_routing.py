"""Check every repository worker's required skill links; no application services run."""

import argparse
import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote
from zoneinfo import ZoneInfo


SHARED = {"worker-operating-model.md", "execution-contract.md", "README.md"}
LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


def links(content):
    return [target for target in LINK.findall(content) if not re.match(r"^[a-zA-Z]+://", target)]


def section(content, heading):
    match = re.search(r"^## " + re.escape(heading) + r"\s*$\n(.*?)(?=^## |\Z)", content, re.M | re.S)
    return match.group(1) if match else ""


def resolve(path, target):
    return (path.parent / unquote(target.split("#", 1)[0].strip("<>"))).resolve()


def check(root, roles_only=False):
    errors = []
    records = []
    hashes = {}
    paths = sorted(p for p in (root / ".agents").glob("*.md") if p.name not in SHARED)
    if not paths:
        errors.append("No worker role files found")
    for path in paths:
        content = path.read_text(encoding="utf-8")
        required = section(content, "Required skills")
        primary_lines = [line for line in required.splitlines() if line.startswith("- **Primary:**")]
        primary = links(primary_lines[0]) if len(primary_lines) == 1 else []
        if len(primary) != 1:
            errors.append(f"{path.name}: require exactly one primary skill link in Required skills")
        for target in primary:
            resolved = resolve(path, target)
            if not resolved.is_relative_to(root / ".skills") or not resolved.is_file():
                errors.append(f"{path.name}: invalid/missing primary skill {target}")
        if required and "execution-contract.md#skill-loading-contract" not in required:
            errors.append(f"{path.name}: Required skills must link the shared skill-loading contract")
        conditional = []
        for line in required.splitlines():
            if line.startswith("- **Conditional:**"):
                conditional.extend(links(line))
        records.append({"role": path.name, "primary": primary, "conditional": conditional})
    if not roles_only:
        # Validate owned instructions and their direct targets, without treating
        # historical/canonical docs linked from them as new editable scope.
        paths += [root / "AGENTS.md", root / ".agents/execution-contract.md", root / ".agents/worker-operating-model.md"]
        paths += sorted((root / ".skills").rglob("*.md"))
        for path in paths:
            content = path.read_text(encoding="utf-8")
            hashes[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
            for target in links(content):
                resolved = resolve(path, target)
                if not resolved.exists():
                    errors.append(f"{path.relative_to(root)}: missing linked target {target}")
                    continue
                if "#" in target and resolved.suffix == ".md":
                    anchor = unquote(target.split("#", 1)[1])
                    headings = re.findall(r"^#+\s+(.+)$", resolved.read_text(encoding="utf-8"), re.M)
                    anchors = {re.sub(r"[^\w\- ]", "", h.lower()).replace(" ", "-") for h in headings}
                    if anchor not in anchors:
                        errors.append(f"{path.relative_to(root)}: missing heading {target}")
        contract = (root / ".agents/execution-contract.md").read_text(encoding="utf-8")
        if not section(contract, "Skill-loading contract"):
            errors.append("Shared execution contract lacks Skill-loading contract")
        if ".agents/execution-contract.md#skill-loading-contract" not in (root / "AGENTS.md").read_text(encoding="utf-8"):
            errors.append("AGENTS.md lacks the invocation-to-skills entry point")
    return {"checked_at": datetime.now(ZoneInfo("Asia/Manila")).isoformat(), "root": str(root),
            "scope": "role routing only" if roles_only else "role routing, instruction links and heading targets",
            "role_count": len(records), "roles": records, "instruction_sha256": hashes,
            "status": "fail" if errors else "pass", "errors": errors}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[2])
    parser.add_argument("--roles-only", action="store_true", help="Check role skill declarations without other links")
    parser.add_argument("--output", type=Path, help="Optional JSON receipt; omit for a read-only check")
    args = parser.parse_args()
    result = check(args.root.resolve(), args.roles_only)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: result[k] for k in ("status", "role_count", "roles", "errors")}, ensure_ascii=False))
    raise SystemExit(1 if result["errors"] else 0)


if __name__ == "__main__":
    main()
