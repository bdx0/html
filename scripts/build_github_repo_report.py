#!/usr/bin/env python3
"""Public-only GitHub repository inventory for bdx0 HTML Lab.

Uses only public repository data. Private repository names and metadata are never
written to the output, even when the workflow token can access them.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request

OWNER = "bdx0"
OUT = pathlib.Path(__file__).resolve().parents[1] / "data" / "github-repositories.json"
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_TOKEN", "")
FEATURED = ["html", "warestack-3d", "bdx0.github.io", "nix-config", "cv", "4home"]


def get(path: str, params: dict | None = None, optional: bool = False):
    url = API + path
    if params:
        url += "?" + urllib.parse.urlencode(params)
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "bdx0-html-repo-report",
               "X-GitHub-Api-Version": "2022-11-28"}
    if TOKEN:
        headers["Authorization"] = "Bearer " + TOKEN
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as response:
                return json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
            if optional and isinstance(exc, urllib.error.HTTPError) and exc.code in (403, 404):
                return None
            if attempt == 2:
                if optional:
                    print("Optional endpoint failed:", path, type(exc).__name__)
                    return None
                raise
            time.sleep(attempt + 1)
    return None


def paged_public_repos():
    repos = []
    page = 1
    while True:
        batch = get("/users/" + OWNER + "/repos",
                    {"type": "owner", "per_page": 100, "page": page, "sort": "updated"})
        if not isinstance(batch, list):
            raise RuntimeError("GitHub returned invalid repository list")
        repos += [x for x in batch if x.get("owner", {}).get("login", "").lower() == OWNER
                  and x.get("private") is False and x.get("visibility", "public") == "public"]
        if len(batch) < 100:
            break
        page += 1
        if page > 30:
            raise RuntimeError("Exceeded repository pagination safety limit")
    return repos


def simplify(r):
    return {
        "name": r["name"], "full_name": r["full_name"],
        "html_url": r["html_url"], "description": r.get("description"),
        "homepage": r.get("homepage"), "language": r.get("language"),
        "default_branch": r.get("default_branch"), "archived": bool(r.get("archived")),
        "fork": bool(r.get("fork")), "pushed_at": r.get("pushed_at"),
        "updated_at": r.get("updated_at"), "created_at": r.get("created_at"),
        "has_pages": bool(r.get("has_pages")), "stars": r.get("stargazers_count", 0),
        "forks": r.get("forks_count", 0),
        "open_issues": r.get("open_issues_count", 0),
        "size_kb": r.get("size", 0), "ci": None
    }


def list_open_items(repos):
    """Inspect public repos with nonzero open items, including PRs.

    GitHub's open_issues_count includes pull requests.
    """
    prs, issues = [], []
    for repo in repos:
        if not repo["open_issues"]:
            continue
        page = 1
        while True:
            batch = get("/repos/" + OWNER + "/" + urllib.parse.quote(repo["name"]) + "/issues",
                        {"state": "open", "per_page": 100, "page": page}, optional=True) or []
            if not isinstance(batch, list):
                break
            for issue in batch:
                item = {"repo": repo["full_name"], "number": issue.get("number"),
                        "title": issue.get("title"), "html_url": issue.get("html_url"),
                        "updated_at": issue.get("updated_at")}
                (prs if "pull_request" in issue else issues).append(item)
            if len(batch) < 100:
                break
            page += 1
            if page > 10:
                break
    key = lambda x: x["updated_at"] or ""
    return sorted(prs, key=key, reverse=True), sorted(issues, key=key, reverse=True)


def main():
    raw = paged_public_repos()
    repos = [simplify(r) for r in raw]
    repos.sort(key=lambda r: r["name"].lower())
    by_name = {r["name"]: r for r in repos}
    public_fullnames = {r["full_name"] for r in repos}

    for name in FEATURED:
        if name not in by_name:
            continue
        data = get("/repos/" + OWNER + "/" + urllib.parse.quote(name) + "/actions/runs",
                   {"per_page": 12}, optional=True)
        runs = (data or {}).get("workflow_runs", [])
        if runs:
            deploy_run = next((x for x in runs if "deploy" in (x.get("name") or "").lower()), None)
            if deploy_run:
                by_name[name]["ci_deploy"] = {
                    "name": deploy_run.get("name"), "status": deploy_run.get("status"),
                    "conclusion": deploy_run.get("conclusion"),
                    "html_url": deploy_run.get("html_url"), "created_at": deploy_run.get("created_at")
                }
            run = runs[0]
            by_name[name]["ci"] = {
                "name": run.get("name"), "status": run.get("status"),
                "conclusion": run.get("conclusion"),
                "html_url": run.get("html_url"), "created_at": run.get("created_at")
            }

    now = dt.datetime.now(dt.timezone.utc)
    threshold = now - dt.timedelta(days=30)
    public_prs, public_issues = list_open_items(repos)
    report = {
        "owner": OWNER, "generated_at": now.isoformat(timespec="seconds"),
        "source": "GitHub public REST API via GitHub Actions",
        "coverage": "complete_public",
        "total_public": len(repos),
        "total_archived": sum(r["archived"] for r in repos),
        "total_forks": sum(r["fork"] for r in repos),
        "total_recent_30d": sum(bool(r["pushed_at"] and
            dt.datetime.fromisoformat(r["pushed_at"].replace("Z", "+00:00")) >= threshold)
            for r in repos),
        "featured": [by_name[n] for n in FEATURED if n in by_name],
        "repositories": repos,
        "open_prs": public_prs,
        "open_issues": public_issues
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Public-only report: {len(repos)} repositories -> {OUT}")


if __name__ == "__main__":
    main()
