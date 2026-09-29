# Research Ethics Committee Review Implementation Plan

> **Status:** Planning document for the initial CICS Research Ethics Committee review. REC classification, ethical clearance, and business-data approval remain pending until issued by the authorized reviewers and data owners.

## Purpose

This plan prepares the MedShield capstone for an initial Research Ethics Committee review. It converts the CICSREC protocol and informed-consent assessment points into owned tasks, review gates, evidence, and submission controls.

The target outcome is a complete, internally consistent submission that allows the REC to assess:

- the study's social and scientific value;
- whether human participants are involved;
- whether the research design and analysis are justified;
- whether risks are proportionate and mitigated;
- whether personal, company, and public-source data are handled lawfully and securely; and
- whether consent or an exemption from consent is appropriate.

This plan does not determine the review classification. Only the REC may grant exempt, expedited, or full-review status.

## MedShield Study Position

MedShield should be submitted as a historical analytics-driven decision-support capstone for pharmaceutical sales analysis, forecast evaluation, product and territory prioritization, and reviewed planning scenarios.

The protocol must state that MedShield:

- uses historical sales and external context data;
- does not provide live disease surveillance or official weather alerts;
- does not make patient-level predictions or provide medical advice;
- does not automatically execute procurement decisions;
- treats planning outputs as scenarios requiring human review; and
- distinguishes observed, derived, estimated, proxy, forecast, and scenario evidence.

The current technical and analytical boundaries are defined in [PROJECT.md](PROJECT.md), [REQUIREMENTS.md](REQUIREMENTS.md), [CHAPTER_3_METHODOLOGY_GUIDE.md](CHAPTER_3_METHODOLOGY_GUIDE.md), and [SECURITY.md](SECURITY.md).

## Definition of Ready

The REC application is ready for internal review when:

1. The team has decided whether the study includes human participants.
2. The title, objectives, scope, methodology, datasets, and evaluation activities agree across all documents.
3. The team has obtained or identified the required company-data authorization.
4. Every protocol assessment item has a draft answer and a page-and-line reference.
5. The consent assessment is completed or marked not applicable with a defensible reason.
6. All recruitment, consent, survey, interview, or usability instruments are final enough for REC review.
7. The data-management plan identifies collection, access, storage, sharing, retention, and disposal controls.
8. The adviser has reviewed the complete packet.

## Definition of Done

The REC preparation work is complete when:

1. The submission packet passes the internal completeness and consistency review.
2. The adviser signs the required application.
3. The correct payment and upload process is confirmed with the CICSREC Secretariat.
4. The complete packet is submitted and the CICSREC reference code is recorded.
5. Any REC questions or revisions are answered through a point-by-point response with page-and-line references.
6. The team receives and records the REC determination or ethical clearance.
7. Data collection begins only after the determination permits it.
8. Approval conditions, amendment duties, progress reporting, and final reporting are added to the project schedule.

## Accountable Roles

| Role | Accountability | Required output |
|---|---|---|
| REC Lead and Corresponding Author | Owns the submission, Secretariat communication, master checklist, and final consistency | Complete submission packet and correspondence log |
| Protocol and Paper Owner | Owns the research questions, objectives, methodology, analysis plan, and protocol cross-references | Final line-numbered protocol and assessment matrix |
| Data and Privacy Owner | Owns data inventory, permissions, de-identification, access, retention, disposal, and incident controls | Data-management plan and authorization evidence |
| Participant and Consent Owner | Owns recruitment, sample justification, instruments, consent, participant communications, and withdrawal process | Participant package or non-participant justification |
| System and QA Owner | Owns architecture evidence, security controls, risk validation, traceability, and reproducibility | Technical annex and executed QA evidence |
| Thesis Adviser | Reviews scientific and ethical readiness and signs the application where required | Adviser approval and signature |

One named team member must be assigned to each role before execution. One person may hold more than one role, but every deliverable must have one accountable owner.

## Review Path Decision

Complete this decision before drafting the consent package.

### Path A Secondary Data Only

Use this path only if the capstone uses authorized historical datasets and does not recruit individuals for surveys, interviews, focus groups, usability testing, UAT, expert evaluation, or similar research activities.

Required actions:

- Ask the REC to determine the applicable review classification; do not self-declare the study exempt.
- Explain why direct interaction with human participants is unnecessary.
- Describe whether any source data contain names, contact details, patient information, employee information, or identifiable customer records.
- Obtain company authorization for non-public sales data.
- De-identify or aggregate data before analysis wherever possible.
- Explain why informed consent is not applicable or why a waiver is requested.
- Preserve privacy, confidentiality, access, retention, and disposal safeguards even when consent is not required.

### Path B Human Participant Evaluation

Use this path if any employee, manager, subject-matter expert, student, or other person will provide research data through UAT, questionnaires, interviews, observation, or usability testing.

Required actions:

- Define the participant population and inclusion and exclusion criteria.
- Justify the sample size and recruitment method.
- Avoid recruitment practices that could pressure employees or subordinates.
- State that participation, refusal, or withdrawal will not affect employment, grades, benefits, or professional relationships.
- Submit every instrument, recruitment message, participant information sheet, and consent form.
- Separate signed consent records from coded research responses.
- Explain whether sessions are recorded and obtain separate permission where appropriate.
- Define how withdrawal affects already collected data.
- Describe how individual responses will be withheld from managers and reported only in aggregate.

### Decision Gate Acceptance

The path decision passes when the REC Lead, Protocol Owner, Data and Privacy Owner, and adviser sign off on one written statement of the study population and data-collection activities. If the team later adds a human-participant activity, work must stop until the REC confirms whether an amendment or new review is required.

## Workstream 1 Protocol Alignment

**Owner:** Protocol and Paper Owner
**Target:** Working days 1 to 3

### Tasks

1. Freeze the proposed protocol title and use it in every form and instrument.
2. Rewrite the objectives as specific and measurable research objectives.
3. Explain the study's social value for pharmaceutical demand planning without overstating operational or clinical benefits.
4. Align the background and literature review with the research questions.
5. Describe CRISP-DM as the overall lifecycle and SEMMA within the analytics phase.
6. Document the research design, data sources, observation periods, inclusion and exclusion rules, and analysis units.
7. Add the complete statistical and analytical plan, including sample tables for expected results.
8. Distinguish descriptive findings, forecast evaluation, association analysis, and planning scenarios.
9. Describe limitations involving candidate data, mapping approval, incomplete external periods, and missing operational inputs.
10. State how results will be shared with MedShield, participants if any, the institution, and the capstone panel.
11. Add continuous line numbering and stable page numbering to the submission version.

### Deliverables

- Line-numbered research protocol in Word format
- Protocol version and date record
- Analysis plan and dummy tables
- Source and coverage table
- Results dissemination plan

### Acceptance checks

- Every study claim matches the implemented or planned scope in canonical project documents.
- No section claims live surveillance, causal effects, approved procurement, or patient-level prediction.
- Objectives, methods, analysis, and expected outputs trace to one another.
- The protocol distinguishes completed implementation evidence from future evaluation work.

## Workstream 2 Participant and Consent Package

**Owner:** Participant and Consent Owner
**Target:** Working days 2 to 4
**Applicability:** Required for Path B; Path A requires a documented not-applicable or waiver rationale.

### Tasks

1. Define the target participants, expected number, recruitment source, inclusion criteria, and exclusion criteria.
2. Document the sample-size rationale and analysis appropriate to the evaluation design.
3. Prepare a neutral recruitment invitation that avoids coercion or undue influence.
4. Prepare the participant information and informed-consent form using the current institutional template.
5. Describe the purpose, duration, procedures, investigator role, discomforts, risks, benefits, alternatives where applicable, compensation or expenses, contacts, voluntary participation, withdrawal, confidentiality, record access, and results sharing.
6. State whether participants will receive a signed copy of the consent form.
7. Prepare separate permission for audio, video, or screen recording when used.
8. Translate materials into Filipino or another appropriate language when the participant group requires it.
9. Check that the language is understandable to the intended participants and does not contain technical dashboard or modeling jargon without explanation.
10. Prepare the final survey, interview guide, usability script, or UAT instrument exactly as participants will receive it.

### Deliverables

- Recruitment invitation
- Participant information and informed-consent form
- Survey, interview guide, usability script, or UAT instrument
- Recording-consent section when applicable
- Translation and language-review record when applicable
- Consent assessment cross-reference matrix

### Acceptance checks

- Participation is explicitly voluntary and refusal carries no penalty.
- Research contacts, participant-rights contacts, and privacy contacts are identified.
- Risks and benefits are specific and proportionate rather than described only as minimal.
- Compensation is accurate and not presented in a way that creates undue influence.
- Consent records are stored separately from research responses.
- The protocol and consent form use the same duration, procedures, participant count, and withdrawal rules.

## Workstream 3 Data Privacy and Company Authorization

**Owner:** Data and Privacy Owner
**Target:** Working days 1 to 4

### Tasks

1. Create a data inventory for MedShield sales, DOH, PAGASA, NASA POWER, authentication/audit data, and participant data if applicable.
2. For each source, record the owner, purpose, period, fields, identifiability, sensitivity, lawful authority, access group, storage location, transfer method, retention period, and disposal method.
3. Obtain a signed MedShield authorization or data-use letter covering the research purpose and permitted outputs.
4. Confirm whether the sales data contain patient, prescriber, employee, customer-contact, or other personal information.
5. Remove fields that are unnecessary for the declared research purpose.
6. Replace direct identifiers with codes and store any linkage key separately with narrower access.
7. Define aggregation or small-cell suppression rules for customer, territory, employee, or participant reporting.
8. Document the use of Databricks, Supabase, local devices, cloud storage, and collaboration tools in the data flow.
9. Define access revocation, backup, retention, secure disposal, and breach-response procedures.
10. Confirm that raw confidential data, credentials, access tokens, and identifiable screenshots will not be committed to Git or included in the paper.

### Deliverables

- Data inventory and data-flow diagram
- Company authorization or data-use letter
- De-identification and aggregation rules
- Access-control matrix
- Retention and disposal schedule
- Data incident response procedure

### Acceptance checks

- Every dataset has a documented owner and permitted research use.
- Collection and processing are limited to data necessary for the stated objectives.
- The protocol explains the complete data lifecycle from receipt to disposal.
- Public, company-confidential, personal, and sensitive data are not treated as equivalent categories.
- No researcher promises anonymity when the design can provide only confidentiality.

## Workstream 4 Risk and Safeguard Assessment

**Owner:** REC Lead
**Support:** Data and Privacy Owner and System and QA Owner
**Target:** Working days 3 to 5

### Minimum risk register

| Risk | Affected party | Required safeguard | Evidence |
|---|---|---|---|
| Disclosure of confidential sales or buyer information | MedShield and its clients | De-identification, least-privilege access, aggregate reporting, no raw-data screenshots | Data plan and access matrix |
| Employee coercion or perceived pressure | UAT, survey, or interview participants | Neutral recruitment, voluntary participation, no manager access to individual responses | Recruitment and consent text |
| Re-identification through small groups | Customers, employees, or territories | Aggregation and small-cell suppression | Reporting rule |
| Incorrect operational decisions from model output | MedShield decision makers | Visible limitations, human review, no purchase execution | Protocol and system screenshots |
| Exposure of credentials or uploaded files | Company and system users | Server-side secrets, authenticated routes, private storage, access logging | Security annex |
| Psychological, reputational, or professional discomfort | Participants | Optional questions, withdrawal without penalty, private sessions, aggregate reporting | Consent and study procedure |
| Data retained beyond the research need | Data subjects and company | Fixed retention period and verified secure disposal | Retention schedule |
| Misinterpretation of historical association as causation | Company and readers | Careful analytical wording and explicit limitations | Protocol, analysis plan, and paper |

### Acceptance checks

- Every foreseeable risk has a preventive or responsive control.
- Residual risks are stated honestly.
- The consent form and protocol describe participant risks consistently.
- The plan explains what the team will do if a privacy or security incident occurs.

## Workstream 5 Technical and Reproducibility Annex

**Owner:** System and QA Owner
**Target:** Working days 3 to 6

### Tasks

1. Prepare a plain-language architecture and data-flow diagram.
2. Document how the dashboard separates observed, estimated, forecast, proxy, and scenario results.
3. Show that protected routes require authentication and that secrets stay on the server side.
4. Explain the fail-closed behavior when required analytical data are unavailable.
5. Document reproducibility controls for data versions, transformations, model versions, metrics, and run dates.
6. Prepare representative screenshots that contain no confidential or identifiable information.
7. Record completed QA checks separately from planned checks.
8. Identify technical limitations that could affect participant safety, privacy, research validity, or interpretation.

### Deliverables

- Architecture and data-flow diagram
- Security and privacy-control summary
- Reproducibility and provenance summary
- Sanitized system screenshots
- QA evidence index

### Acceptance checks

- The annex describes the current architecture and does not present planned controls as implemented.
- Screenshots do not expose names, email addresses, account identifiers, access tokens, or confidential transaction details.
- Technical evidence supports the protocol's privacy and risk claims.

## Workstream 6 REC Forms and Submission Assembly

**Owner:** REC Lead and Corresponding Author
**Target:** Working days 5 to 7

### Required initial documents

Confirm the current CICSREC checklist with the Secretariat before payment or submission. Based on the supplied review packet, prepare:

- title proposal approval evidence;
- adviser-signed application for ethics review of a new protocol;
- cover letter for ethics review submission;
- line-numbered research proposal or protocol in Word format;
- informed-consent form in Word format when applicable;
- protocol assessment form with page-and-line references;
- consent assessment form with page-and-line references when applicable;
- recruitment and data-collection instruments;
- company authorization or data-use letter;
- payment slip and bank receipt in the required PDF format; and
- any curriculum vitae, training, conflict-of-interest, or facility documents requested by the Secretariat.

### File control

Use one naming pattern:

```text
CICSREC_MedShield_<DocumentName>_v<Major-Minor>_<YYYY-MM-DD>.<ext>
```

Maintain a submission register with:

| Field | Required value |
|---|---|
| Document | Controlled filename |
| Version | Version submitted |
| Date | Finalization date |
| Owner | Accountable author |
| Adviser reviewed | Yes or No |
| Included in upload | Yes or No |
| Notes | Signature, format, or dependency |

### Acceptance checks

- Every file opens successfully and uses the same protocol title.
- Required signatures and dates are present.
- Page-and-line references point to the submitted version, not an earlier draft.
- Word and PDF formats match the upload requirements.
- The payment reference or CICSREC code is recorded exactly and used in correspondence.
- The team retains a read-only copy of the exact submitted packet.

## Workstream 7 Internal Mock Review

**Owner:** Thesis Adviser
**Support:** A team member who did not prepare the assessed section
**Target:** Working days 7 to 8

### Review method

1. Review the protocol against every item in the research protocol assessment form.
2. Review the consent document against every item in the informed-consent assessment form.
3. Mark each criterion `Pass`, `Needs revision`, or `Not applicable with justification`.
4. Verify each page-and-line reference directly in the final submission version.
5. Compare the protocol, consent, recruitment material, instruments, and data plan for contradictions.
6. Return all failed items to the owning role for correction.
7. Repeat the review after revisions; do not carry forward earlier page-and-line references without checking them.

### Mock review checklist

- Social value is specific and proportionate.
- Background and literature support the research questions.
- Objectives are measurable and consistent with the analysis.
- Population, recruitment, and sample size are justified where applicable.
- The analysis plan and dummy tables are present.
- Human-participant involvement is stated consistently.
- Vulnerability, coercion, privacy, confidentiality, and possible harms are addressed.
- Direct and indirect benefits are not exaggerated.
- Consent is understandable and voluntary.
- Researcher qualifications, conflicts, facilities, ethical guidelines, prior review, and result reporting are disclosed.
- All assessment references are accurate.

### Exit gate

Submission may proceed only when all required criteria pass or contain a defensible not-applicable justification approved by the adviser.

## Workstream 8 Submission and Response Management

**Owner:** REC Lead and Corresponding Author
**Target:** Working day 9 onward

### Submission tasks

1. Confirm the current forms, fee, payment method, file formats, and upload location with the CICSREC Secretariat.
2. Submit the exact internally approved packet.
3. Save the submission confirmation, payment evidence, reference code, and submitted files.
4. Record the submission date and expected communication channel.
5. Use the CICSREC reference code in all subsequent correspondence.
6. Do not start participant recruitment or unapproved data collection while the review is pending.

### Revision response tasks

1. Copy every reviewer comment into the resubmission matrix without changing its meaning.
2. Assign one owner and due date to each response.
3. State the action taken or provide a respectful, evidence-based explanation when no change is made.
4. Cite the new page and line number for every revision.
5. Update the protocol version and date.
6. Recheck every dependent consent form, instrument, appendix, and cross-reference.
7. Submit a clean revised protocol and the completed point-by-point response.

### Amendment rule

After approval, seek REC guidance before changing the participant population, recruitment, consent, instruments, data sources, identifiability, storage, sharing, analysis purpose, or risk profile. Do not implement a material change simply because it is technically easy.

## Proposed Ten Working Day Schedule

| Day | Primary work | Exit evidence |
|---|---|---|
| 1 | Assign owners and decide Path A or Path B | Signed path decision and owner list |
| 2 | Align title, objectives, scope, design, and data sources | Protocol outline and data inventory |
| 3 | Draft methodology, analysis plan, risks, and safeguards | Complete protocol draft |
| 4 | Complete consent or non-consent rationale and company authorization package | Participant package or waiver rationale |
| 5 | Complete privacy plan, technical annex, and risk register | Annex set |
| 6 | Add line numbers and complete Forms 4.2 and 4.3 | Cross-referenced assessment forms |
| 7 | Assemble forms, signatures, instruments, and file register | Candidate submission packet |
| 8 | Conduct adviser and mock REC review | Findings and corrected packet |
| 9 | Confirm administrative requirements, payment, and upload | Secretariat confirmation and payment evidence |
| 10 | Submit and archive the exact packet | Submission confirmation and reference code |

The schedule assumes that company authorization, adviser availability, and participant materials are obtainable within the period. Unavailable approvals keep the affected submission gate open.

## Verification Matrix

| Criterion | Evidence | Owner | Status |
|---|---|---|---|
| Review path is justified | Signed Path A or Path B decision | REC Lead | Not started |
| Protocol criteria are addressed | Completed protocol assessment with page and line numbers | Protocol Owner | Not started |
| Consent criteria are addressed or justified as not applicable | Completed consent assessment or waiver rationale | Participant Owner | Not started |
| Data use is authorized | Company authorization and public-source records | Data and Privacy Owner | Not started |
| Privacy lifecycle is complete | Data inventory, flow, access, retention, and disposal records | Data and Privacy Owner | Not started |
| Risks have controls | Approved risk register | REC Lead | Not started |
| Technical claims are evidenced | Technical annex and QA evidence index | System and QA Owner | Not started |
| Packet is consistent | Mock review record | Thesis Adviser | Not started |
| Administrative requirements are current | Secretariat confirmation | REC Lead | Not started |
| Submission is traceable | Confirmation, reference code, and archived packet | REC Lead | Not started |

## Stop Conditions

Stop submission or data collection when any of the following occurs:

- the team cannot determine whether a planned activity involves human participants;
- company authorization for confidential sales data is missing;
- direct or sensitive identifiers are present without an approved necessity and safeguard;
- the protocol, consent, and instruments describe different procedures;
- required signatures, page-and-line references, or instruments are missing;
- the REC requests changes that have not yet been incorporated;
- a material change is proposed after submission or approval without REC guidance; or
- a privacy, security, or participant-safety incident occurs.

The REC Lead records the condition, affected activity, corrective action, owner, and authorization required to resume.

## Immediate Next Actions

1. Name the REC Lead and the owners for protocol, data/privacy, participants/consent, and technical evidence.
2. Decide and document Path A or Path B with the adviser.
3. Request the current CICSREC initial-submission checklist and editable Forms 7.1 and 7.2.
4. Request a MedShield company-data authorization letter.
5. Freeze the protocol title and create the first line-numbered protocol draft.
6. Complete the data inventory before finalizing the risk and consent language.
7. Schedule the mock REC review before making payment or uploading files.

## References

- [PROJECT.md](PROJECT.md)
- [REQUIREMENTS.md](REQUIREMENTS.md)
- [CHAPTER_3_METHODOLOGY_GUIDE.md](CHAPTER_3_METHODOLOGY_GUIDE.md)
- [SECURITY.md](SECURITY.md)
- [RISKS.md](RISKS.md)
- [CAPSTONE_COMPLETION_WORKFLOW.md](CAPSTONE_COMPLETION_WORKFLOW.md)
- CICSREC Research Protocol Assessment Form supplied with the review packet
- CICSREC Informed Consent Assessment Form supplied with the review packet
- CICSREC Informed Consent Form supplied with the review packet
- CICSREC Resubmission Form supplied with the review packet
- CICSREC AY 2026-2027 payment and initial-submission instructions supplied with the review packet
- [National Privacy Commission Implementing Rules and Regulations of the Data Privacy Act of 2012](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [Philippine Health Research Ethics Board 2022 National Ethical Guidelines](https://ethics.healthresearch.ph/index.php/phoca-downloads/category/4-neg)
