from fastmcp import FastMCP
from pathlib import Path
from typing import Literal
from uuid import uuid4
from difflib import unified_diff
import json
import shutil
import time

from job_providers import filter_job, get_job_provider_status, list_job_providers, normalize_job

mcp = FastMCP("HuntBoard MCP Server")

# ==================================================
# PROJECT CONFIGURATION
# ==================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent.resolve()
BACKUP_DIR = PROJECT_ROOT / ".huntboard-backups"

IGNORED_NAMES = {
    "node_modules",
    ".next",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".huntboard-backups",
}

PROTECTED_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    "id_rsa",
    "id_ed25519",
}

ALLOWED_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx",
    ".json", ".md", ".css", ".html", ".htm",
    ".yml", ".yaml", ".toml", ".txt",
    ".mjs", ".cjs", ".mts", ".cts",
    ".sql", ".sh", ".ps1", ".xml",
    ".gitignore", ".config",
}


MAX_FILE_SIZE = 200_000
MAX_PROPOSAL_AGE_SECONDS = 900

# Proposals are temporary and disappear when this server restarts.
PENDING_CHANGES: dict[str, dict] = {}


# ==================================================
# SECURITY HELPERS
# ==================================================

def resolve_project_path(relative_path: str) -> Path:
    """Resolve a relative path without allowing project-root escape."""

    if not relative_path or not relative_path.strip():
        raise ValueError("A relative project path is required.")

    requested = Path(relative_path)

    if requested.is_absolute():
        raise ValueError("Use a relative path inside the project.")

    target = (PROJECT_ROOT / requested).resolve()

    if not target.is_relative_to(PROJECT_ROOT):
        raise ValueError("Access denied: path is outside the project.")

    relative_parts = target.relative_to(PROJECT_ROOT).parts

    if any(part in IGNORED_NAMES for part in relative_parts):
        raise ValueError("Access to this directory is denied.")

    if any(part.startswith(".env") for part in relative_parts):
        raise ValueError("Environment files are protected.")

    if any(part in PROTECTED_NAMES for part in relative_parts):
        raise ValueError("This file is protected.")

    return target


def validate_editable_file(target: Path) -> None:
    """Validate a file path for supported text-file operations."""

    if target.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError("This file type is not allowed.")

    if target.name.startswith(".env") or target.name in PROTECTED_NAMES:
        raise ValueError("This file is protected.")

    if target.is_symlink():
        raise ValueError("Symbolic links cannot be edited.")


def read_text_file(target: Path) -> str:
    """Read a supported text file with a size limit."""

    if not target.is_file():
        raise ValueError("File not found.")

    if target.stat().st_size > MAX_FILE_SIZE:
        raise ValueError("File is too large to read.")

    try:
        return target.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("File is not valid UTF-8 text.") from exc


def cleanup_expired_proposals() -> None:
    """Remove expired pending changes."""

    now = time.time()

    expired = [
        proposal_id
        for proposal_id, proposal in PENDING_CHANGES.items()
        if now - proposal["created_at"] > MAX_PROPOSAL_AGE_SECONDS
    ]

    for proposal_id in expired:
        PENDING_CHANGES.pop(proposal_id, None)


# ==================================================
# CALCULATOR TOOLS
# ==================================================

@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers."""
    return a + b


@mcp.tool()
def subtract(a: float, b: float) -> float:
    """Subtract b from a."""
    return a - b


@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b."""
    if b == 0:
        raise ValueError("Cannot divide by zero.")
    return a / b


# ==================================================
# LIVE JOB SEARCH
# ==================================================

@mcp.tool()
def search_jobs(
    keyword: str,
    location: str = "",
    experience: str = "",
    remote_only: bool = False,
    limit: int = 10,
) -> list[dict]:
    """Search configured job providers or return an empty list when live sources are unavailable."""

    keyword = keyword.strip()
    if not keyword:
        raise ValueError("A job keyword is required.")

    providers = list_job_providers()
    results: list[dict] = []

    for provider in providers:
        try:
            provider_results = provider.search(
                keyword=keyword,
                location=location,
                experience=experience,
                remote_only=remote_only,
                limit=limit,
            )
        except Exception:
            continue

        for job in provider_results:
            normalized = normalize_job(job, provider.name)
            if filter_job(
                normalized,
                keyword=keyword,
                location=location,
                experience=experience,
                remote_only=remote_only,
            ):
                results.append(normalized)

    unique: dict[str, dict] = {}
    for job in results:
        source_key = job.get("url") or "|".join(
            [
                str(job.get("title", "")),
                str(job.get("company", "")),
                str(job.get("location", "")),
            ]
        )
        unique.setdefault(source_key, job)

    return list(unique.values())[:max(0, limit)]


@mcp.tool()
def get_job_details(job_id: int) -> dict:
    """Return a clean not-configured message instead of sample data."""

    if job_id is None:
        return {"error": "A valid job ID is required."}

    return {
        "error": "Live job search is not configured yet. Add an Adzuna, Greenhouse or Lever provider to fetch jobs.",
        "job_id": job_id,
        "status": "not_configured",
    }


@mcp.tool()
def get_job_search_status() -> list[dict]:
    """Return the configuration status of available job providers."""

    return get_job_provider_status()


# ==================================================
# MCP RESOURCES
# ==================================================

@mcp.resource("huntboard://career-guide")
def get_career_guide() -> str:
    """Provide a basic career guide."""

    return """
HuntBoard Career Guide

Python Developer: Python, SQL, Git, APIs.
Data Analyst: SQL, Excel, Python, Power BI.
React Developer: JavaScript, React, HTML, CSS.

For freshers:
- Build practical projects.
- Practice interview questions.
- Maintain a good GitHub portfolio.
"""


@mcp.resource("huntboard://jobs")
def get_all_jobs() -> str:
    """Provide a clear not-configured payload instead of mock job listings."""

    return json.dumps(
        {
            "status": "not_configured",
            "message": "Live job search is not configured yet. Add an Adzuna, Greenhouse or Lever provider to enable search results.",
            "jobs": [],
        },
        indent=2,
    )


# ==================================================
# MCP PROMPTS
# ==================================================

@mcp.prompt()
def interview_prep(
    role: str,
    experience: str = "Fresher",
) -> str:
    """Create an interview preparation prompt."""

    return f"""
Help me prepare for a {role} interview.

My experience level: {experience}

Please provide:
1. Technical interview questions.
2. Answers with simple explanations.
3. Common HR interview questions.
4. Practical coding questions, if relevant.
5. A short mock interview.

Keep the preparation suitable for my experience level.
"""


# ==================================================
# READ-ONLY FILESYSTEM TOOLS
# ==================================================

@mcp.tool()
def list_project_files(directory: str = ".") -> list[str]:
    """List files and folders inside the HuntBoard project."""

    target = resolve_project_path(directory)

    if not target.is_dir():
        raise ValueError("The requested path is not a directory.")

    results = []

    for item in sorted(target.iterdir(), key=lambda entry: entry.name.lower()):
        if item.name in IGNORED_NAMES or item.name.startswith(".env"):
            continue

        relative = item.relative_to(PROJECT_ROOT).as_posix()
        suffix = "/" if item.is_dir() else ""
        results.append(f"{relative}{suffix}")

    return results


@mcp.tool()
def read_project_file(file_path: str) -> str:
    """Read an allowed text file from the project."""

    target = resolve_project_path(file_path)
    validate_editable_file(target)

    return read_text_file(target)


# ==================================================
# PROPOSE CREATE / MODIFY / DELETE
# No files are changed by this tool.
# ==================================================

@mcp.tool()
def propose_file_change(
    operation: Literal["create", "modify", "delete"],
    file_path: str,
    content: str = "",
) -> dict:
    """
    Prepare a file-change proposal without applying it.

    The returned proposal ID can be used to inspect or apply the proposal
    through the separate approval workflow.
    """

    cleanup_expired_proposals()

    target = resolve_project_path(file_path)
    validate_editable_file(target)

    if target == PROJECT_ROOT:
        raise ValueError("The project root is not a file.")

    exists = target.exists()

    if operation == "create" and exists:
        raise ValueError("File already exists. Use modify instead.")

    if operation in {"modify", "delete"} and not exists:
        raise ValueError("File does not exist.")

    if exists and not target.is_file():
        raise ValueError("Only regular files can be changed.")

    if operation == "delete" and content:
        raise ValueError("Delete proposals must not include content.")

    if operation in {"create", "modify"} and len(content.encode("utf-8")) > MAX_FILE_SIZE:
        raise ValueError("New content exceeds the file size limit.")

    old_content = read_text_file(target) if exists else ""

    new_content = None if operation == "delete" else content

    if operation == "modify" and old_content == content:
        raise ValueError("The proposed content is identical to the current file.")

    if operation == "create" and not content:
        raise ValueError("New file content cannot be empty.")

    old_lines = old_content.splitlines(keepends=True)
    new_lines = (new_content or "").splitlines(keepends=True)

    preview = "".join(
        unified_diff(
            old_lines,
            new_lines,
            fromfile=f"current/{file_path}",
            tofile=f"proposed/{file_path}",
        )
    )

    proposal_id = uuid4().hex[:12]

    PENDING_CHANGES[proposal_id] = {
        "operation": operation,
        "file_path": file_path,
        "target": str(target),
        "old_content": old_content,
        "new_content": new_content,
        "existed": exists,
        "created_at": time.time(),
    }

    return {
        "status": "pending_approval",
        "proposal_id": proposal_id,
        "operation": operation,
        "file_path": file_path,
        "preview": preview or "(No textual diff available.)",
        "expires_in_seconds": MAX_PROPOSAL_AGE_SECONDS,
        "message": (
            "No files have been changed. Review the preview and explicitly "
            "approve this exact proposal before applying it."
        ),
    }


@mcp.tool()
def list_pending_file_changes() -> list[dict]:
    """List pending proposals without exposing full file contents."""

    cleanup_expired_proposals()

    return [
        {
            "proposal_id": proposal_id,
            "operation": proposal["operation"],
            "file_path": proposal["file_path"],
            "created_at": int(proposal["created_at"]),
        }
        for proposal_id, proposal in PENDING_CHANGES.items()
    ]


# ==================================================
# APPLY / DISCARD PROPOSALS
# ==================================================

@mcp.tool()
def apply_file_change(
    proposal_id: str,
    confirmation: str,
) -> dict:
    """
    Apply a pending proposal only when the caller supplies the exact
    confirmation phrase: APPLY <proposal_id>.

    The application should separately ask the user for explicit approval
    before calling this tool.
    """

    cleanup_expired_proposals()

    proposal = PENDING_CHANGES.get(proposal_id)

    if not proposal:
        raise ValueError("Proposal not found or expired.")

    expected_confirmation = f"APPLY {proposal_id}"

    if confirmation.strip() != expected_confirmation:
        raise ValueError(
            f"Explicit confirmation required. Type exactly: {expected_confirmation}"
        )

    target = Path(proposal["target"]).resolve()

    if not target.is_relative_to(PROJECT_ROOT):
        raise ValueError("Access denied: path is outside the project.")

    # Revalidate at apply time.
    target = resolve_project_path(proposal["file_path"])
    validate_editable_file(target)

    operation = proposal["operation"]
    existed_before = target.exists()

    if operation == "create" and existed_before:
        raise ValueError("File now exists. Proposal is no longer valid.")

    if operation in {"modify", "delete"}:
        if not existed_before or not target.is_file():
            raise ValueError("File changed since proposal creation.")

        current_content = read_text_file(target)

        if current_content != proposal["old_content"]:
            raise ValueError(
                "File changed after proposal creation. Create a new proposal."
            )

    # Back up existing files before modification/deletion.
    backup_path = None

    if existed_before:
        relative = target.relative_to(PROJECT_ROOT)
        backup_path = BACKUP_DIR / relative
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target, backup_path)

    if operation in {"create", "modify"}:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(proposal["new_content"], encoding="utf-8")

    elif operation == "delete":
        target.unlink()

    PENDING_CHANGES.pop(proposal_id, None)

    return {
        "status": "applied",
        "operation": operation,
        "file_path": proposal["file_path"],
        "backup_path": (
            backup_path.relative_to(PROJECT_ROOT).as_posix()
            if backup_path
            else None
        ),
        "message": "The approved file change was applied.",
    }


@mcp.tool()
def discard_file_change(proposal_id: str) -> dict:
    """Discard a pending proposal without changing any file."""

    proposal = PENDING_CHANGES.pop(proposal_id, None)

    if not proposal:
        raise ValueError("Proposal not found or already expired.")

    return {
        "status": "discarded",
        "proposal_id": proposal_id,
        "file_path": proposal["file_path"],
        "message": "Proposal discarded. No file was changed.",
    }


# ==================================================
# START SERVER
# ==================================================

if __name__ == "__main__":
    mcp.run(
        transport="http",
        host="127.0.0.1",
        port=8000,
    )