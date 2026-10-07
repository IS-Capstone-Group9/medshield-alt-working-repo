# Deployment and CI/CD Guide

Last reviewed: 2026-10-07

## Team workflow

`main` is the current application baseline and shared integration branch. Each feature gets its own branch and pull request (PR); GitHub merges reviewed, passing changes into `main`. For example, `feature/sales-export` and `feature/inventory-alerts` can progress independently, then both reach `main` through separate PRs.

Each teammate uses their own clone/local checkout. Coordinate edits to shared files, keep PRs focused, and bring changes from `main` into your feature branch before merging. Do not share one working directory between active tasks or force-push shared `main`.

## Start and submit a feature

From a clean checkout, run these PowerShell-compatible commands:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/sales-export
```

Implement the feature, run the relevant checks from [TESTING.md](TESTING.md), and review what you are about to commit:

```powershell
git status --short
git diff
git add frontend/path/to/changed-file.ts docs/path/to/updated-guide.md
git diff --cached
git commit -m "feat: add sales export"
git push -u origin HEAD
```

Replace the example file paths with your actual changed files. Stage explicit paths so unrelated work and local secrets stay out of the commit. Use `feature/`, `fix/`, or `chore/` branch prefixes for routine work.

On GitHub, open a PR with **base: main** and your feature branch as **compare**. Describe the change and test results, request a teammate's review, and wait for `CI required` to pass. Resolve review comments and conflicts, then use **Squash and merge** for a focused feature. Delete the finished remote feature branch and repeat from an updated `main` for the next feature.

## Keep a feature current and resolve conflicts

While on your feature branch, with your changes committed:

```powershell
git fetch origin
git merge origin/main
```

If Git reports conflicts, edit each conflicted file to preserve the intended behavior from both changes, remove conflict markers, and stage the resolved paths. Then finish the merge:

```powershell
git add path/to/resolved-file
git commit
```

Run the affected tests and push again with `git push`. If the push is rejected because the same remote feature branch moved, fetch and merge that remote feature branch too (for example, `git merge origin/feature/sales-export`), resolve conflicts, test, and retry the push. Do not use a force push to bypass someone else's work. If your local `main` cannot fast-forward, inspect its local commits and move intended work to a feature branch before reconciling it.

## Work on two features on one computer

A separate worktree gives each feature its own files, branch, dependencies, and build output. Run from your existing repository:

```powershell
git fetch origin
git worktree add ..\medshield-inventory -b feature/inventory-alerts origin/main
cd ..\medshield-inventory
```

Follow [SETUP.md](SETUP.md) in that checkout. Assign separate server ports if you run both copies. Never run a frontend production build in a checkout where `next dev` is using the same `.next` directory.

## Automated CI checks

[`ci.yml`](../.github/workflows/ci.yml) runs on all PR targets, all branch pushes, merge queues, and manual dispatch. CI and the application containers use Node.js 22 (see `.nvmrc`); Python CI uses 3.12 with [offline test dependencies](../.github/requirements-ci.txt).

| Check | What it verifies |
|---|---|
| Backend | Gateway TypeScript build and deterministic tests |
| Frontend | Lint and Next.js production build |
| Python | Service, Databricks transformation, and STL tests |
| Docker | Compose configuration and frontend/gateway image builds |
| `CI required` | All required jobs succeeded; failures or skipped dependencies block this check |

Baseline CI requires no GitHub repository secrets or running Databricks/Supabase services. A green result verifies these automated checks; it does not certify live data, authentication, browser behavior, production readiness, or business approval. Run the relevant live checks in [TESTING.md](TESTING.md) separately.

The optional legacy Python image and full model-generation script are outside baseline CI: they require local data that is not included in a fresh checkout. Offline analytical tests still run. `.gitattributes` preserves the catalog helper's deployed CRLF checksum and the 2025 CSV's original bytes across Windows and Linux.

Optional local reference clones under `external/medshield_frontend/` and `temp-medshield/medshield-dashboard/` are ignored. Their old Git submodule pointers had no `.gitmodules` configuration and caused fresh GitHub checkouts to fail; they are not required by the application.

[`codeql.yml`](../.github/workflows/codeql.yml) provides supplementary security analysis automatically for public repositories. For a private repository, enable GitHub Code Security support first, then set the repository Actions variable `CODEQL_ENABLED` to `true`. The scan currently skips for this private repository: on 2026-10-07, GitHub's code-scanning API returned HTTP 403 because Advanced Security was not enabled. This optional scan does not change mandatory CI.

[`sonarqube.yml`](../.github/workflows/sonarqube.yml) is optional and skips its scan when `SONAR_HOST_URL` or `SONAR_TOKEN` is absent. See the [workflow reference](../.github/workflows/README.md).

## Recommended protection for main

A repository administrator should configure a branch ruleset or branch protection for `main`. These are recommendations, not a record that settings have been applied:

- Require a PR and at least one approving review; dismiss stale approvals when new commits arrive.
- Require review conversations to be resolved.
- After GitHub has observed a completed run, select the exact status check **`CI required`** and require the branch to be up to date before merging.
- Prevent force pushes and branch deletion; apply the rules to everyone expected to follow the team workflow.

Do not require the optional SonarQube scan as part of the baseline. On 2026-10-07, GitHub returned HTTP 403 for protection/ruleset access to this private repository, citing a plan upgrade requirement despite administrator access. CI can still report results, but GitHub cannot enforce this protection on the current plan. Keep review and green CI as a team agreement until an owner enables a plan that supports private-repository protection.

## Deployment later

No production deployment is configured. CI validates changes; CD will deploy them after a hosting target is chosen. The current setup does not publish images or deploy an application.

For local setup and Docker, follow [SETUP.md](SETUP.md). Docker Compose starts the frontend and gateway; live analytics still need the documented Supabase and Databricks environment configuration. Keep `.env` files untracked and server credentials out of `NEXT_PUBLIC_*` variables; see [SECURITY.md](SECURITY.md).

Before adding CD, decide the host, environment ownership, domain/HTTPS, secret store, allowed origins, Databricks warehouse policy, Supabase redirect URLs, monitoring, rollback, and cost owner. Store deployment credentials in the selected GitHub environment or host secret store once that design is agreed.
