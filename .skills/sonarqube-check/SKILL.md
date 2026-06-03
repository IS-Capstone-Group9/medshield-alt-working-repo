# SonarQube Check Skill

Purpose: provide guidance and an example CI workflow that runs SonarQube (or SonarCloud) analysis and connects it to deployment steps.

What this skill does:
- Explains how to add a `sonar-project.properties` file to the repo.
- Provides a GitHub Actions workflow sample that runs Sonar analysis on PRs and pushes, and runs a deploy job on `main` when analysis succeeds.

Prerequisites:
- A SonarQube server or SonarCloud account.
- Repository secrets configured: `SONAR_TOKEN` and (for SonarCloud) `SONAR_ORGANIZATION` or `SONAR_HOST_URL` for self-hosted SonarQube.

Usage:
1. Add `sonar-project.properties` at the repository root (example provided in this template).
2. Add the GitHub Actions workflow file `.github/workflows/sonarqube-and-deploy.yml` (provided).
3. Set required secrets in your repository settings.
4. Adapt the `deploy` job in the workflow to match your actual deployment commands (the workflow uses a placeholder build step).

Notes:
- The workflow is intentionally a template: replace the `build` and `deploy` commands to suit your stack (Node, Python, Java, Docker, etc.).
- For a self-hosted SonarQube instance, set `SONAR_HOST_URL` to your server URL and ensure `sonar-project.properties` references it.

If you want, I can adapt the workflow to your specific stack (Node, Python, .NET, Docker, etc.) — tell me which one to configure.
