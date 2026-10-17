"""Create private, local MedShield memory checkpoints for reviewed Codex hooks.

Only event identifiers and lifecycle metadata are captured. An agent writes the
sanitized project summary; prompt bodies and transcripts are never copied.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import stat
import sys
from datetime import datetime, timedelta, timezone


MANILA = timezone(timedelta(hours=8), name="Asia/Manila")
EVENT_STATES = {"Stop": "stopped", "Interrupt": "interrupted"}
MAX_INPUT_BYTES = 1_048_576
MAX_NOTE_BYTES = 262_144
WORKSTREAM_LINKS = ", ".join(
    f"[{name}](../workstreams/{name}.md)"
    for name in ("Graphs", "Pipeline", "Documentation", "Paper")
)


class MemoryUnavailable(Exception):
    """A safe, user-readable reason that local capture could not proceed."""


def _plain_path(path: Path, *, directory: bool) -> None:
    """Reject existing symbolic links, junctions and other reparse points."""
    try:
        info = path.lstat()
    except FileNotFoundError as error:
        raise MemoryUnavailable("a required local memory path is missing") from error
    reparse = getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)
    if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & reparse:
        raise MemoryUnavailable("a memory path is a symbolic link or junction")
    expected = stat.S_ISDIR if directory else stat.S_ISREG
    if not expected(info.st_mode):
        raise MemoryUnavailable("a memory path has the wrong file type")


def _project_folder(repo: Path, payload: dict) -> Path:
    cwd = payload.get("cwd")
    if not isinstance(cwd, str) or not Path(cwd).is_absolute():
        raise MemoryUnavailable("the event has no absolute project directory")
    try:
        event_cwd = Path(cwd).resolve(strict=True)
        event_cwd.relative_to(repo)
    except (OSError, ValueError) as error:
        raise MemoryUnavailable("the event directory is outside this repository") from error
    if not event_cwd.is_dir():
        raise MemoryUnavailable("the event directory is not a directory")

    pointer = repo / ".codex" / "obsidian-memory.local.json"
    _plain_path(pointer.parent, directory=True)
    _plain_path(pointer, directory=False)
    if pointer.stat().st_size > 16_384:
        raise MemoryUnavailable("the local memory connection is too large")
    try:
        config = json.loads(pointer.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as error:
        raise MemoryUnavailable("the local memory connection is invalid JSON") from error
    if not isinstance(config, dict) or type(config.get("schemaVersion")) is not int or config["schemaVersion"] != 1:
        raise MemoryUnavailable("the local memory connection has an unsupported schema")

    vault_value = config.get("vaultPath")
    folder_value = config.get("memoryFolder")
    if not isinstance(vault_value, str) or not Path(vault_value).is_absolute():
        raise MemoryUnavailable("the vault path must be absolute")
    if not isinstance(folder_value, str):
        raise MemoryUnavailable("the project memory folder is invalid")
    parts = folder_value.replace("\\", "/").split("/")
    if any(
        not part or part in {".", ".."} or part != part.strip() or part.endswith(".")
        or re.search(r'[<>:"|?*\x00-\x1f]', part)
        for part in parts
    ):
        raise MemoryUnavailable("the project memory folder must stay inside the vault")

    try:
        vault = Path(vault_value).resolve(strict=True)
    except (OSError, ValueError) as error:
        raise MemoryUnavailable("the configured vault is unavailable") from error
    if not vault.is_dir():
        raise MemoryUnavailable("the configured vault is not a directory")
    project = vault
    for part in parts:
        project = project / part
        _plain_path(project, directory=True)
    try:
        project.resolve(strict=True).relative_to(vault)
    except (OSError, ValueError) as error:
        raise MemoryUnavailable("the project memory folder escapes the vault") from error
    return project


def _turn_key(payload: dict) -> str:
    identifiers = [payload.get("session_id"), payload.get("turn_id")]
    if any(not isinstance(value, str) or not value or len(value) > 4096 for value in identifiers):
        raise MemoryUnavailable("the event is missing a valid session or turn identifier")
    return hashlib.sha256(json.dumps(identifiers, ensure_ascii=True).encode("utf-8")).hexdigest()


def _write_exclusive(path: Path, contents: str) -> None:
    """Retries never replace user notes or earlier event receipts."""
    try:
        with path.open("x", encoding="utf-8", newline="\n") as stream:
            stream.write(contents)
    except FileExistsError:
        _plain_path(path, directory=False)


def _turn_note(project: Path, key: str, now: datetime) -> Path:
    turns = project / "turns"
    try:
        turns.mkdir()
    except FileExistsError:
        pass
    _plain_path(turns, directory=True)
    # Keep the original date when a turn stops after midnight or an event retries.
    matches = sorted(turns.glob(f"????-??-??-{key}.md"))
    if len(matches) > 1:
        raise MemoryUnavailable("multiple memory notes exist for this turn")
    if matches:
        note = matches[0]
        _plain_path(note, directory=False)
        return note
    note = turns / f"{now.date().isoformat()}-{key}.md"
    captured = now.isoformat(timespec="seconds")
    content = f"""---
status: pending
captured_at: {captured}
turn_key: {key}
---

# MedShield prompt checkpoint — {now.date().isoformat()}

Capture records a checkpoint, not completed work. Replace the placeholders with
a concise, sanitized summary and change `status: pending` to `status: recorded`.
Link affected workstreams: {WORKSTREAM_LINKS}.
Use “no project change” when applicable.

## Request

Pending agent summary; raw prompt text is not captured.

## Outcome

Pending. Do not infer completion from a stopped or interrupted event.

## Changes and evidence

Pending. Include affected source paths, actual checks/results, and limitations.

## Next action

Pending agent handoff.
"""
    _write_exclusive(note, content)
    return note


def _summary_status(note: Path) -> str:
    _plain_path(note, directory=False)
    if note.stat().st_size > MAX_NOTE_BYTES:
        raise MemoryUnavailable("the turn note exceeds the checkpoint size limit")
    lines = note.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] != "---":
        return "pending"
    for line in lines[1:]:
        if line == "---":
            break
        if line.strip() == "status: recorded":
            return "recorded"
    return "pending"


def capture_event(payload: dict, repo_root: Path | None = None, now: datetime | None = None) -> dict:
    """Handle a hook event without blocking the user's requested task."""
    try:
        if not isinstance(payload, dict):
            raise MemoryUnavailable("the hook event must be a JSON object")
        event = payload.get("hook_event_name")
        if not isinstance(event, str) or event not in {"UserPromptSubmit", *EVENT_STATES}:
            return {"systemMessage": "MedShield memory: unsupported event ignored."}
        repo = (repo_root or Path(__file__).resolve().parents[2]).resolve(strict=True)
        project = _project_folder(repo, payload)
        key = _turn_key(payload)
        timestamp = (now or datetime.now(MANILA)).astimezone(MANILA)
        note = _turn_note(project, key, timestamp)
        if event == "UserPromptSubmit":
            context = (
                "MedShield local memory checkpoint: " + json.dumps(str(note), ensure_ascii=False)
                + ". Before your final response, re-read this note and record a concise sanitized "
                "request/outcome, changes and actual verification, limitations and next action; "
                "set its frontmatter status to recorded only after writing the summary. Classify "
                "affected workstreams using these links relative to the supplied note: "
                + WORKSTREAM_LINKS + "; use 'no project change' when applicable. "
                "Preserve user edits. Never copy full prompts, transcripts, secrets or raw records. "
                "Capture is not evidence that work or tests completed. Follow AGENTS.md and "
                "docs/PROJECT_MEMORY.md for shared overview updates."
            )
            return {"hookSpecificOutput": {"hookEventName": event, "additionalContext": context}}

        summary = _summary_status(note)
        receipt = {
            "schemaVersion": 1,
            "turnKey": key,
            "event": event,
            "lifecycle": EVENT_STATES[event],
            "capturedAt": timestamp.isoformat(timespec="seconds"),
            "summaryStatus": summary,
            "note": note.name,
        }
        _write_exclusive(note.with_suffix(f".{event}.json"), json.dumps(receipt, indent=2) + "\n")
        message = f"MedShield memory: {EVENT_STATES[event]} lifecycle captured; summary {summary}."
        if summary == "pending":
            message += " The checkpoint still needs a sanitized agent summary; no completion was inferred."
        return {"systemMessage": message}
    except MemoryUnavailable as error:
        return {"systemMessage": f"MedShield memory capture skipped: {error}. Continue from repository guidance."}
    except (OSError, UnicodeError, ValueError):
        return {"systemMessage": "MedShield memory capture unavailable: local file access or event validation failed. Continue from repository guidance."}


def main() -> None:
    try:
        raw = sys.stdin.buffer.read(MAX_INPUT_BYTES + 1)
        if len(raw) > MAX_INPUT_BYTES:
            result = {"systemMessage": "MedShield memory capture skipped: hook input exceeds the local size limit."}
        else:
            result = capture_event(json.loads(raw.decode("utf-8")))
    except (ValueError, UnicodeError):
        result = {"systemMessage": "MedShield memory capture skipped: hook input is not valid UTF-8 JSON."}
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
