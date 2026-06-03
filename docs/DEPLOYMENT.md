# Deployment

Deployment steps, environments, and rollback plans.

## SonarQube / Static Analysis

This template includes a sample SonarQube/ SonarCloud setup:

- A sample `sonar-project.properties` file is at the repository root.
- A GitHub Actions workflow `.github/workflows/sonarqube-and-deploy.yml` runs the Sonar scanner on PRs and pushes to `main`.
- The `deploy` job is a placeholder; update the build and deploy steps to match your stack (Node, .NET, Docker, Kubernetes, etc.).

Secrets to configure in the repository settings:
- `SONAR_TOKEN` — authentication token for SonarQube/SonarCloud
- `SONAR_HOST_URL` — (self-hosted SonarQube) the URL of your SonarQube server
- `SONAR_ORGANIZATION` — (SonarCloud) your organization key if using SonarCloud

If you want I can adapt the workflow to a specific build system — tell me which language or framework you use.
