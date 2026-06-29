"""Git sync + deploy helpers for daily/mood bat files."""
from __future__ import annotations

import subprocess
from pathlib import Path


class DeployError(Exception):
    pass


def run_git(args: list[str], root: Path) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise DeployError(f"git {' '.join(args)} failed: {detail}")
    return (result.stdout or "").strip()


def sync_with_github(root: Path) -> None:
    run_git(["fetch", "origin"], root)
    status = subprocess.run(
        ["git", "status", "-sb"],
        cwd=root,
        capture_output=True,
        text=True,
    )
    if status.returncode != 0:
        raise DeployError("git status failed")
    line = (status.stdout or "").splitlines()[0]
    if "main" not in line:
        raise DeployError("Not on main branch")
    if "ahead" in line or "behind" in line or "diverged" in line:
        print("Syncing with GitHub first...")
        run_git(["pull", "--rebase", "origin", "main"], root)


def deploy_files(root: Path, files: list[str], message: str) -> None:
    sync_with_github(root)
    run_git(["add", *files], root)
    diff = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=root)
    if diff.returncode == 0:
        raise DeployError("Nothing to commit — file may already be on GitHub")
    run_git(["commit", "-m", message], root)
    print("Deploying to GitHub...")
    try:
        run_git(["push", "origin", "main"], root)
    except DeployError:
        print("Push blocked — syncing again and retrying...")
        run_git(["pull", "--rebase", "origin", "main"], root)
        run_git(["push", "origin", "main"], root)