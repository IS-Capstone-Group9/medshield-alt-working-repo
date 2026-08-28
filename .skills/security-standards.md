# Security Standards

## Description
Defines the security expectations for MedShield across authentication, authorization, secrets, data handling, and secure coding. Security work should always be tied to an actual trust boundary or data sensitivity concern; if there is no meaningful risk, do not invent one. Even in a capstone project, the implementation should show professional handling of sensitive business data and environment secrets.

## Workflow
1. Identify the trust boundaries and sensitive data involved in the change.
2. Review the authentication and authorization path.
3. Check input validation, output handling, logging, and secret storage.
4. Rank the issue by risk and propose a fix that fits the existing project.
5. Verify that the remediation does not introduce new security regressions.
6. Make sure the security story still fits the demo and capstone documentation.

## Rules
- Apply least privilege to every access path.
- Validate all input at the boundary.
- Never store secrets in code, docs, or logs.
- Review data exposure, especially where authenticated access or row-level security is involved.
- Keep security controls visible in the implementation and deployment paths.
- Prefer practical remediations that can be shipped and maintained.
- Make the threat model explicit when a recommendation depends on an assumption.
- Consider both accidental exposure and intentional misuse when reviewing controls.

## Project Conventions
- Use the security guidance in `docs/SECURITY.md` as the local reference point.
- Treat auth, backend endpoints, and database access as linked risks.
- Record security assumptions when the code relies on external platform controls.
